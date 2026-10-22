# Deployment

Baho runs as one Docker stack (`deploy/docker-compose.production.yml`) on a Linux VM
that already serves other sites through Caddy:

| Container | Image | Role |
|---|---|---|
| `baho-postgres` | `postgres:16-alpine` | Database, private to the stack (volume `baho_baho_pg_data`) |
| `baho-backend` | `ghcr.io/fistonfle/baho-backend` | API on port 4000 |
| `baho-frontend` | `ghcr.io/fistonfle/baho-frontend` | Built web app served by nginx |

Caddy serves one hostname with HTTPS: `/api/*` goes to the API, everything else to the
web app (`deploy/Caddyfile.snippet`). The app calls the API at `/api/v1` on the same
site, so no API address is built into the frontend and CORS is not involved.

## Continuous deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. backend tests and a frontend type check and build;
2. builds both images and pushes them to GitHub Container Registry, tagged with the commit;
3. copies the compose file to `/app/baho` on the VM over SSH, pulls the new images,
   restarts the stack and waits until `/api/v1/health` reports a database connection.

Repository secrets: `VM_HOST`, `VM_SSH_PORT`, `VM_USER`, `VM_SSH_KEY`.

## One-time server setup

1. Point a DNS A record (for example `baho.example.rw`) at the VM.
2. Create `/app/baho/.env` from `deploy/.env.production.example` with new random secrets.
3. Add the block from `deploy/Caddyfile.snippet` to the Caddyfile with the real hostname,
   validate it and reload Caddy.
4. Push to `main` (or run the workflow by hand).

Tables and demo content are created on the API's first start; the first admin comes from
the `BAHO_ADMIN_*` values in `.env`.

## Before real users

- Keep `.env` private; rotate `AUTH_TOKEN_SECRET` if it is ever exposed.
- Back up the `baho_baho_pg_data` volume (for example a nightly `pg_dump`).
- Have a native speaker and a health professional review all lesson and quiz content.
