# Baho

Baho is a Kinyarwanda-first digital health and wellness application designed to make preventive NCD education more accessible, understandable and actionable for communities in Rwanda and similar settings.

This repository contains an MVP/demo implementation of the product concept described in the Baho capstone proposal. The current version focuses on a realistic, student-level proof of concept that can be extended into a stronger production-ready system without losing clarity or demonstration value.

## Project structure

```text
baho/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── database/
│   ├── schema.sql
│   └── seed.sql
├── designs/
│   ├── architecture.svg
│   ├── erd.svg
│   ├── wireframes/
│   └── screenshots/
├── docs/
│   ├── deployment.md
│   └── architecture.md
├── demo/
│   └── Baho-Demo.mp4
├── README.md
└── .gitignore
```

## MVP focus

- Welcome and onboarding flow
- Kinyarwanda language UX
- Personalized dashboard
- NCD education for hypertension, diabetes and cardiovascular disease
- Audio lesson playback
- Exercise recommendations
- Reminders
- Offline-friendly behavior on the frontend
- Full-stack API with admin/content review support
- PostgreSQL-ready backend foundation for easier future extension

## Default user flow

1. Land on the welcome screen and continue as a guest to browse public lessons.
2. Select interests and enter a name to view the learner dashboard.
3. Create a learner account to save private questions, reminders and lesson progress.
4. Open account access and create the first administrator when prompted.
5. The administrator can create creator accounts, manage FAQs, review questions and issue reports, and publish or reject submitted content.
6. Creators sign in and submit new content for administrator review.

## Technologies

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express
- PostgreSQL
- dotenv for environment variables

### Database
- PostgreSQL as the main relational foundation for Baho
- Existing SQL schema is kept as the design reference for the student project

## Quick start

### 1. Start PostgreSQL locally

```bash
createdb baho
```

### 2. Backend

```bash
cd baho/backend
npm install
cp .env.example .env
npm run dev
```

The backend applies its schema on startup. Set `DATABASE_URL` to a PostgreSQL database the current user can access, and set `AUTH_TOKEN_SECRET` to a long random secret. If PostgreSQL is unavailable, the backend starts in demo mode; demo-mode data is held in memory and does not survive a restart.

### 3. Frontend

```bash
cd baho/frontend
npm install
npm run dev
```

For a separately hosted backend, create `frontend/.env.local` and set `VITE_API_BASE_URL` to its `/api/v1` URL before building.

### 4. Run simple backend tests

```bash
cd baho/backend
npm test
```

### 5. Local Docker setup

```bash
cd baho
docker compose up --build
```

This starts the backend and PostgreSQL together in containers for easier demo and deployment preparation.

### 6. Production build check

```bash
cd baho/frontend
npm run build
```

## Environment configuration

The backend reads the PostgreSQL connection string from the environment. A sample file is included as `.env.example`.

```env
PORT=4000
DATABASE_URL=postgresql://fle@localhost:5432/baho
AUTH_TOKEN_SECRET=replace-with-a-long-random-secret-before-deployment
BAHO_ADMIN_NAME=
BAHO_ADMIN_EMAIL=
BAHO_ADMIN_PASSWORD=
```

To seed the first administrator at backend startup, fill in all three `BAHO_ADMIN_*` values in `backend/.env`; use a password with at least 12 characters. The seed runs only when no administrator exists. If these values are left blank, the account screen provides one-time first-admin setup instead. Public learner registration cannot assign staff roles. Admin and creator endpoints require a signed-in staff account.

## Demo notes

This version is intentionally designed as a functioning MVP with a stronger backend foundation. It demonstrates the product in a credible way while remaining focused on a manageable scope for a capstone submission.

## Deployment ideas

- Frontend: static hosting such as Netlify or Vercel
- Backend: Node/Express service on Render, Railway, or a VM
- Database: PostgreSQL for development and managed PostgreSQL in deployment
- Local container workflow: Docker Compose for reproducible demo or staging setup
- Offline access: local cache and persistent client data

## Full capstone context

This project aligns with the Baho proposal as a working demo rather than a final, exhaustive system. It demonstrates the core concept clearly: local-language, personalized, preventive NCD education delivered in a way that is practical, accessible and easy to extend.
# baho
