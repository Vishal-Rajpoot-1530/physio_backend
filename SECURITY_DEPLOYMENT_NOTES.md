# Physio API — review and deployment notes

- Registration `POST /api/v1/auth/register` is protected by `SUPER_ADMIN_KEY` (`x-super-admin-key` header). Never expose this key in mobile applications or browser JavaScript. Call account-provisioning only through a trusted admin backend.
- The archive's `.env` was excluded. Rotate any credentials if the original archive was shared beyond trusted operators. Configure the production `.env` under the server's shared persistent directory.
- `HOST=0.0.0.0`; proxy requests through Apache HTTPS and restrict inbound traffic. `PORT=3002` is the Physio API port.
- `CORS_ORIGIN` is a comma-separated list of exact trusted browser origins. This is a browser control, not an authentication mechanism.
- Photo upload currently checks MIME declaration and 5MB limit; MIME alone does NOT validate actual content. Production deployment should add content-signature checks/image re-encoding and file lifecycle protections before handling untrusted uploads.
- Prisma migrations are preserved. Run `prisma migrate deploy` against the correct isolated database after inspecting migration effects; database rollbacks are not automatic.
- Static source inspection and structural checks are completed. A successful dependency installation, TypeScript build, automated tests and live database migration have not yet been verified in this environment.
- A public super-admin API key alone has operational risk. Prefer a real authenticated admin identity and scoped authorization for long-term use.
