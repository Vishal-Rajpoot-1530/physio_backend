#!/usr/bin/env bash
set -Eeuo pipefail

# Stable execution environment for non-interactive SSH deployments
export HOME=/home/reactftp
export PM2_HOME=/home/reactftp/.pm2
cd /home/reactftp

APP="${1:?app required}"
SHA="${2:?sha required}"
case "$APP" in gymapi) PORT=3001;; physioapi) PORT=3002;; *) echo 'Invalid app' >&2; exit 2;; esac
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid SHA' >&2; exit 2; }
BASE="/var/www/mobile-app-services/$APP"
ARCHIVE="$BASE/.incoming/$SHA.tar.gz"
RELEASE="$BASE/releases/$SHA"
CURRENT="$BASE/current"
PREVIOUS=""
if [[ -L "$CURRENT" ]]; then PREVIOUS="$(readlink -f "$CURRENT")"; fi
[[ -f "$BASE/.env" ]] || { echo 'Production .env missing' >&2; exit 1; }
[[ -f "$ARCHIVE" ]] || { echo 'Artifact missing' >&2; exit 1; }
if [[ -e "$RELEASE" ]]; then
  if [[ -L "$CURRENT" && "$(readlink -f "$CURRENT")" == "$RELEASE" ]]; then
    if curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/v1/health" >/dev/null; then
      echo "Release already deployed and healthy"
      exit 0
    fi
    echo "Current release is unhealthy; refusing automatic replacement" >&2
    exit 1
  fi

  echo "Removing incomplete or inactive release for safe retry"
  rm -rf -- "$RELEASE"
fi
mkdir -p "$BASE/releases"
mkdir "$RELEASE"
tar -xzf "$ARCHIVE" -C "$RELEASE" --no-same-owner --no-same-permissions
[[ -f "$RELEASE/dist/main.js" && -x "$RELEASE/node_modules/.bin/prisma" && -d "$RELEASE/prisma/migrations" ]] || {
  echo 'Artifact missing build, Prisma CLI or migrations' >&2; exit 1;
}
ln -s ../../.env "$RELEASE/.env"
chmod 750 "$RELEASE"

# Database migrations are forward-only: migration failure stops before touching the live app.
(cd "$RELEASE" && ./node_modules/.bin/prisma migrate deploy)

rollback() {
  echo 'Application health check failed; attempting application-only rollback' >&2
  pm2 delete "$APP" >/dev/null 2>&1 || true
  if [[ -n "$PREVIOUS" && -f "$PREVIOUS/dist/main.js" ]]; then
    ln -sfn "$PREVIOUS" "$CURRENT.next"
    mv -Tf "$CURRENT.next" "$CURRENT"
    pm2 start "$PREVIOUS/dist/main.js" --name "$APP" --cwd "$PREVIOUS" --time
    pm2 save
  else
    rm -f "$CURRENT"
  fi
  echo 'Database migrations are NOT automatically reversed' >&2
}

# Switch only after migrations succeed; on failure restore prior binary.
ln -s "$RELEASE" "$CURRENT.next"
mv -Tf "$CURRENT.next" "$CURRENT"
pm2 delete "$APP" >/dev/null 2>&1 || true
if ! pm2 start "$RELEASE/dist/main.js" --name "$APP" --cwd "$RELEASE" --time; then
  rollback
  exit 1
fi

OK=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/api/v1/health" >/dev/null; then OK=1; break; fi
  sleep 2
done
if [[ "$OK" != 1 ]]; then rollback; exit 1; fi
pm2 save
rm -f "$ARCHIVE"
echo "SUCCESS: $APP at $SHA, health passed on localhost:$PORT"
