# Deployment

Baho runs as one Docker stack (`deploy/docker-compose.production.yml`) on an Ubuntu VM
at Strettch Cloud in Kigali, served at **https://bahoapp.site**. Caddy runs as its own
small stack beside it (`/app/caddy`) and terminates HTTPS:

| Container | Image | Role |
|---|---|---|
| `baho-postgres` | `postgres:16-alpine` | Database, private to the stack (volume `baho_baho_pg_data`) |
| `baho-backend` | `ghcr.io/fistonfle/baho-backend` | API on port 4000 |
| `baho-frontend` | `ghcr.io/fistonfle/baho-frontend` | Built web app served by nginx |
| `baho-tts` | `ghcr.io/fistonfle/baho-tts` | Reads a lesson aloud when nobody can record it ([tts/README.md](../tts/README.md)) |

Caddy serves one hostname with HTTPS: `/api/*` goes to the API, everything else to the
web app (`deploy/Caddyfile.snippet`). The app calls the API at `/api/v1` on the same
site, so no API address is built into the frontend and CORS is not involved. Caddy and
the two app containers meet on an external Docker network, `caddy-net`, named by
`CADDY_NETWORK` in `/app/baho/.env`; PostgreSQL stays off it.

The VM has 1 GB of RAM, which leaves nothing spare, so it is given a 2 GB swap file.
`baho-tts` is the heaviest of them: it is capped at 768 MB and holds its model in
memory, so check `docker stats` after a deploy and drop the service from the compose
file if the box cannot carry it. Without it a pull or a restart can be killed
by the kernel rather than failing with an error that says so.

## Continuous deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. backend tests and a frontend type check and build;
2. builds the three images and pushes them to GitHub Container Registry, tagged with the commit;
3. copies the compose file to `/app/baho` on the VM over SSH, pulls the new images,
   restarts the stack and waits until `/api/v1/health` reports a database connection.

Repository secrets: `VM_HOST`, `VM_SSH_PORT`, `VM_USER`, `VM_SSH_KEY`.

## One-time server setup

0. Create the compute **with an SSH key attached**. A machine created with the panel's
   Authentication field left empty has no key and no password, and answers SSH with a
   timeout during banner exchange, which reads like a firewall and is not one.
1. Point DNS A records (`@` and `www`) at the VM.
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
