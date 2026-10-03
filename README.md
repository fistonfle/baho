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

1. Land on the welcome screen
2. Select health interests
3. View the personalized dashboard
4. Explore audio lessons and educational content
5. Review exercise and reminder guidance
6. Open the FAQ and issue reporting flow
7. Review the admin area for content management

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

### 3. Frontend

```bash
cd baho/frontend
npm install
npm run dev
```

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
```

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
