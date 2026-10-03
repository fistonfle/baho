# Deployment guidance

## Local development

1. Start the backend in `baho/backend`.
2. Start the frontend in `baho/frontend`.
3. Set `DATABASE_URL` and a random `AUTH_TOKEN_SECRET` in `backend/.env`.
4. The frontend calls `http://localhost:4000/api/v1` by default; override it with `VITE_API_BASE_URL` for a separately hosted API.
5. On first launch, use the account flow to bootstrap the first administrator. Admins create creator accounts; creators submit content for review.

## Production deployment

- Build the frontend using `npm run build`.
- Serve the `dist` folder using a static host such as Vercel or Netlify.
- Deploy the backend separately to Render, Railway, or a container-based host.
- Configure PostgreSQL and environment values for production use.

## Security and future enhancements

- Keep `AUTH_TOKEN_SECRET` private and rotate it if exposed.
- Use HTTPS for deployed frontends and APIs.
- Configure CORS to allow only the deployed frontend origin.
- Add rate limiting, email verification and account recovery before production use.
- Introduce rate limiting and validation
- Add service worker caching for the offline-first experience

If PostgreSQL is unavailable, local development uses an in-memory demo store. This data is intentionally temporary; configure a healthy PostgreSQL service before hosting.
