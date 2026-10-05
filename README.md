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

| Feature | Where | Proposal ref |
|---|---|---|
| Kinyarwanda interface and content | whole app | FR01 |
| Audio player for every lesson (recorded MP3, or the browser voice as a fallback) with replay, seek and speed | `components/AudioPlayer.tsx` | FR02 |
| NCD module: blood pressure, diabetes, heart disease and cancer (risk factors, warning signs, prevention) | `screens/NcdScreen.tsx` | FR03 |
| Five-item knowledge check (same items as Appendix A), with the first and latest score compared | `screens/CheckupScreen.tsx` | SO3 |
| Reminders with quick presets and browser notifications | `screens/RemindersScreen.tsx` | FR04 |
| Exercise guidance by level with steps and audio | `screens/ExerciseScreen.tsx` | FR05 |
| Offline: service worker for the app shell and audio, local copy of lessons and FAQs, offline outbox for issue reports | `public/sw.js`, `lib/offline.ts` | FR06, FR19 |
| **Learning paths**: each diagnosed condition maps to an ordered curriculum stored in PostgreSQL (`curricula`, `curriculum_lessons`); the dashboard shows "lesson 3 of 6" and the next lesson | `GET /curricula`, `screens/PathsScreen.tsx`, dashboard | FR09 |
| **Lesson flow**: illustration → short text → audio → quiz | `screens/LibraryScreen.tsx`, `public/images/` | FR01, FR02 |
| **Lesson quizzes**: questions stored in `quiz_questions`; signed-in attempts graded by the server and saved in `quiz_attempts`; progress shows the best score per lesson and the average | `POST /quiz-attempts`, `GET /progress`, `components/LessonQuiz.tsx` | SO3 |
| Onboarding: topic choice plus an optional health profile (diagnosed conditions and six lifestyle questions) | `screens/OnboardingScreen.tsx`, `screens/HealthProfileScreen.tsx` | FR07, FR08 |
| Health profile encrypted on the device (AES-GCM, non-extractable key in IndexedDB), never sent to the server | `lib/secureStore.ts` | NFR05, NFR06 |
| "For you" feed ranked by a transparent rule (topic +2, risk tag +3, finished -4) with the reason shown on each card | `lib/personalization.ts` | FR09 |
| Progress, learning streak and a seven-day calendar | `lib/activity.ts`, dashboard | FR13 |
| Phone layout with bottom navigation; laptop layout with top navigation | `components/AppNav.tsx` | FR15, NFR10 |
| Searchable FAQ with audio answers, questions to health workers, issue reports | `screens/FaqScreen.tsx` | FR18, FR19 |
| **Add a new disease**: admins add a disease (name, icon, description, risk factors, warning signs, prevention). It gets its own topic and learning path and immediately appears in the NCD module, the health profile, onboarding topics and the lesson form, so creators can write lessons for it | `POST/PATCH /admin/diseases`, `components/DiseaseManager.tsx` | FR03, FR12 |
| Staff area: admins create creators and admins; review and publish lessons; pick a lesson image, add it to learning paths and write its quiz; answer questions; manage FAQs and reports | `screens/AdminScreen.tsx` | FR12, FR16, FR17 |
| Installable PWA (manifest and icons) | `public/manifest.webmanifest` | NFR08 |

Privacy by design: diagnosed conditions and lifestyle answers stay encrypted on the phone. The server only sends the public learning paths, and the phone chooses the matching one. Progress and quiz scores, which contain no health details, are stored on the server for signed-in learners.

Left out on purpose: blood pressure and glucose logging, height and weight, and anything else that would look like diagnosis. Baho educates; it does not measure or diagnose (proposal section 1.5).

Roles: **admins** add diseases, publish lessons and manage staff; **creators** (health professionals) write lessons with an image, a quiz and learning paths, for any disease, and submit them for review. They cannot publish.

Simplifications compared with the proposal (deliberate for the MVP): email and password instead of phone and PIN; two staff roles (admin and creator) instead of three; a single signed access token instead of an access and refresh token pair.

## Demo walkthrough

1. **Landing → Tangira kwiga.** Choose topics and enter a name. In the health profile, choose *Diyabete* and answer the six questions. Point out the privacy note: the answers stay on the phone, encrypted.
2. **Dashboard.** The learning path *Inzira ya diyabete* appears with seven ordered lessons. The "for you" cards below show *why* each extra lesson is recommended.
3. **Lesson.** Press *Komeza*: the illustration, short text and audio appear, then the quiz. Submit it; the lesson is ticked off, the path moves to lesson 2, and the quiz average appears on the dashboard. When signed in, show the attempt in the `quiz_attempts` table.
4. **Indwara → Tangira isuzuma.** Take the five-question check, study the NCD module, then retake it to show the before and after scores.
5. **Imyitozo and Ibyibutsa.** Change the exercise level, add a reminder from a preset.
6. **Ubufasha.** Search the FAQ, listen to an answer, send a report.
7. **Offline.** Build and preview the app (below), open it once, then stop both servers or turn on airplane mode and reload. The app still opens with the downloaded lessons, and reports are queued until the connection returns.
8. **New disease.** As admin, open *Ubuyobozi → Indwara* and add one (e.g. *Asima*), then press *+ Isomo* or sign in as a creator to write a lesson for it with an image and a quiz. After the admin publishes it, a learner sees *Asima* in the NCD module and the health profile, and choosing it gives the path *Inzira ya Asima*.
9. **Staff.** Sign in as an admin: the review queue, publishing a creator's lesson, editing a lesson to add a quiz question and put it in a learning path (the learner side updates on reload), answering a learner's question.

## Recorded audio

Lessons point to files such as `/audio/blood-pressure.mp3`, `/audio/diabetes.mp3` and `/audio/cancer.mp3` (full list in `backend/src/config/seedData.js`). Record them in Kinyarwanda (Audacity, MP3 at 64 kbps) and put them in `frontend/public/audio/`. Until a file exists, the player falls back to the browser's speech voice automatically.

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

### 6. Production build and offline check

```bash
cd baho/frontend
npm run build
npm run preview
```

The service worker only runs in the production build. Open http://localhost:4173 once, then go offline and reload.

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
- Offline access: service worker (app shell and audio) plus a local copy of lessons and FAQs

## Full capstone context

This project aligns with the Baho proposal as a working demo rather than a final, exhaustive system. It demonstrates the core concept clearly: local-language, personalized, preventive NCD education delivered in a way that is practical, accessible and easy to extend.
# baho
