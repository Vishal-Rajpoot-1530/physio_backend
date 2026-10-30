REWAN MOBILE BACKENDS — DIRECT GitHub Actions -> AWS OIDC -> SSH/SCP -> EC2, NO S3 BUCKET

The archives gymapi-cicd-files.zip and physioapi-cicd-files.zip are PATCHES for existing repositories.
Extract each ZIP INTO THE ROOT of its matching local repository. Do not replace package files, source, lockfile, .env, or Prisma migrations.
Gym folder: C:\Arpit\testing\gym-api-github-ready
Physio folder: C:\Arpit\testing\physio-api-github-ready

Added files (same paths in both repositories):
.github/workflows/deploy-production.yml
scripts/deploy-remote.sh

BEFORE FIRST RUN
1. Ensure AWS role Rewan-Mobile-Services-GitHub-Deploy has the EC2 SG inline policy:
  ec2:DescribeSecurityGroups and ec2:DescribeSecurityGroupRules on *;
  ec2:AuthorizeSecurityGroupIngress and ec2:RevokeSecurityGroupIngress on
  arn:aws:ec2:ap-south-1:491934530718:security-group/sg-01500f8582cad5ade
  The role trust must match repo:rewantechsolutions/<repo>:environment:production for each repo.
2. In each GitHub repo's production environment, confirm five SECRETS already created:
  AWS_ROLE_ARN, EC2_HOST, EC2_USER, EC2_SECURITY_GROUP_ID, EC2_SSH_KEY
3. On the EC2 instance AS ROOT, obtain server ED25519 public host fingerprint (safe to share):
  ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256 | awk '{print $2}'
  In EACH GitHub production environment, under Environment VARIABLES (not Secrets), add:
  EC2_HOST_FINGERPRINT=SHA256:... (exact output)
4. In BOTH GitHub production environments, allow only deployments from branch main.
5. Ensure /var/www/mobile-app-services/{gymapi,physioapi}/.env files still exist and are owned by reactftp.
6. On EC2, ensure reactftp has pm2 command and PM2 auto-start configured after first deployment.
7. The EC2 Security Group SSH 22 inbound must not be opened permanently to all internet.

LOCAL POWERHELL, EACH REPO
  cd C:\Arpit\testing\gym-api-github-ready
  git add .github/workflows/deploy-production.yml scripts/deploy-remote.sh
  git commit -m "Add direct AWS OIDC SSH production deployment"
  git push origin main
Then repeat for physio repo.

FIRST DEPLOYMENT
GitHub -> Actions -> Deploy Gym Production/Deploy Physiotherapy Production -> Run workflow -> main.
On push, the build job always runs. Deploy job runs only for manual workflow_dispatch until enabled.
Verify successful Actions job, PM2 process, and localhost health endpoint on EC2.

ENABLE FUTURE AUTOMATIC DEPLOYMENT, NO FILE EDITS
In each repo Settings -> Secrets and variables -> Actions -> Variables (REPOSITORY variables) -> New repository variable:
  ENABLE_AUTO_DEPLOY=true
NOTE: Use repository variable, not environment variable, because the deploy-job condition is evaluated before environment variables are loaded.
Then pushes to main also deploy automatically.

NOTE: MySQL migrations are forward-only; application rollback does not reverse DB schema.
NOTE: The app is HTTP-only on localhost until Apache virtual hosts, DNS and TLS are separately configured.
NOTE: This preserves the existing /var/www/mobile-app-services/{gymapi,physioapi} top-level layout and .env.
NOTE: Release artifacts are assembled on GitHub's ubuntu-24.04 runner and include Linux node_modules.
NOTE: Deploy briefly restarts PM2 after DB migration; no zero-downtime guarantee.
NOTE: New deployment SSH key contents must never be committed or printed in GitHub logs.
