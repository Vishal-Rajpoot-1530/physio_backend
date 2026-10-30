# Physio Backend

NestJS + Prisma + MySQL backend for the Physio clinic service.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`,
   `PANEL_ADMIN_EMAIL`, `PANEL_ADMIN_PASSWORD`, and a strong
   `SUPER_ADMIN_KEY` for server-side provisioning.
2. Install dependencies with `npm install`.
3. Generate Prisma Client with `npx prisma generate`.
4. Apply local migrations with `npx prisma migrate dev`.
5. To enable the gym app's development-only demo sign-in, run
   `npm run demo:seed`. This creates or refreshes the demo account in the
   configured local database.
6. Start the API with `npm run start:dev`.

Demo credentials: `demo@gymtest.com` / `GymDemo123!`. Do not seed this account
into a production database. The seed command refuses to run when
`NODE_ENV=production`.

The Physio API listens on `0.0.0.0:3002` by default and is available at
`http://10.0.2.2:3002/api/v1` from an Android emulator. For a physical device
on the same Wi-Fi, use the computer's LAN IP address. Binding to `0.0.0.0`
allows access through network interfaces; restrict inbound traffic and do not
expose the development server to the public internet.

Gym and Physio are separate backend deployments: Gym uses port `3001`, its own
database, and its own `JWT_SECRET`; this Physio backend uses port `3002`, the
`rts_physioclinic` database, and a different `JWT_SECRET`. Keep the credentials
in each backend's `.env` separate. Create and migrate the Physio database before
starting it against that database.

For the super-admin panel, configure `PANEL_ADMIN_EMAIL`,
`PANEL_ADMIN_PASSWORD`, and `JWT_SECRET` in the backend `.env`, then restart the
backend. In the panel, open **API Connection**, choose **Gym Management**, enter
the panel email/password and the API URL reachable from the device, then tap
**Verify & Save**. The backend issues a short-lived signed session; the panel
stores that token in platform secure storage. `SUPER_ADMIN_KEY` remains for
trusted server-side account provisioning and is not used by the Flutter panel.
On a physical phone, use the computer's LAN IP (not `10.0.2.2`); allow the
backend port through the computer's private-network firewall if needed.

For local Flutter web development, the API accepts HTTP and HTTPS origins from
`localhost`, `127.0.0.1`, and `[::1]` on any port. No `CORS_ORIGIN` entry is
needed for these loopback origins. Set `CORS_ORIGIN` to a comma-separated list
of exact origins for non-local web clients, then restart the backend. Native
Flutter apps do not need a browser CORS origin.

## Flutter apps

The Physio app defaults to the Android emulator URL above. Override `PHYSIO_API_BASE_URL`
when running on a different platform or against a deployed server:

```powershell
flutter run --dart-define=PHYSIO_API_BASE_URL=http://10.0.2.2:3002/api/v1
```

`gym_app` uses the JWT-protected gym routes under `/api/v1` and requires an
existing account. `multyapp_pannel` signs in to `/api/v1/super-admin/auth/login` and uses the
resulting JWT for `/api/v1/super-admin/users`.

Keep panel login credentials and signing secrets on the backend, never in a
Flutter build. The clinic module uses a separate API and key; configure these
independently in **API Connection**. The clinic API is not provided by this
backend.

Use HTTPS and `npx prisma migrate deploy` for production.

Subscription dates and history are stored in `app_subscriptions`; account
provisioning, subscription assignment, and renewal read and write the
subscription record in the same transaction. Provisioning defaults to monthly
when no plan is specified.
