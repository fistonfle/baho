# Deployment

The full deployment plan (platforms, environment variables and steps) is in the main [README](../README.md#deployment-plan).

## Summary

- **Web app:** `npm run build` in `frontend/`, host `frontend/dist` on Vercel or Netlify (HTTPS). Set `VITE_API_BASE_URL` to the API's `/api/v1` URL.
- **API:** deploy `backend/` with its Dockerfile to Render or Railway. Set `DATABASE_URL`, `AUTH_TOKEN_SECRET` and optionally `BAHO_ADMIN_*`.
- **Database:** managed PostgreSQL. Tables and demo content are created automatically on the API's first start.
- **Local or health-centre server:** `docker compose up --build` runs the API and PostgreSQL together.

## Before going live

- Keep `AUTH_TOKEN_SECRET` private and rotate it if exposed.
- Restrict CORS to the deployed frontend origin (`backend/src/app.js`).
- Add rate limiting, email verification and account recovery.
- Have a native speaker and a health professional review all lesson and quiz content.
