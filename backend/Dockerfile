# Production image for the Baho API. Configuration (DATABASE_URL, AUTH_TOKEN_SECRET,
# BAHO_ADMIN_*) arrives at runtime from the server's .env, so one image fits any server.
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
