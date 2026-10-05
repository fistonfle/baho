# Baho architecture overview

![Baho system architecture](../designs/architecture.svg)

## Three tiers

1. **Client: React + TypeScript progressive web app** (`frontend/`)
   - Screens in `src/components/screens/`, shared navigation in `AppNav.tsx`.
   - Redux Toolkit store (`src/store/appSlice.ts`) and REST client (`src/services/api.ts`).
   - Personalization on the device (`src/lib/personalization.ts`): learning path from diagnosed conditions, rules-based "for you" ranking.
   - Offline layer: service worker (`public/sw.js`) for the app shell, images and audio; localStorage copy of lessons, FAQs and paths; outbox for reports (`src/lib/offline.ts`).
   - Privacy: the health profile is encrypted with AES-GCM (Web Crypto, non-extractable key in IndexedDB) and never sent to the server (`src/lib/secureStore.ts`).
2. **Server: Node.js + Express REST API** (`backend/`)
   - Routes in `src/routes/index.js` under `/api/v1`; `authenticate` and `requireRole` middleware protect staff routes.
   - Modules: `auth`, `content`, `learning` (paths, diseases, quizzes), `progress`, `questions`, `issues`, `reminders`.
   - Each data function uses PostgreSQL and falls back to an in-memory demo store when the database is unavailable.
3. **Database: PostgreSQL**: 13 tables, see `designs/erd.svg` and `database/schema.sql`.

## Key flows

- **Personal learning path:** the learner's conditions stay on the phone. The app downloads the public paths (`GET /curricula`) and picks the matching one. Completing a lesson calls `POST /progress/:id/complete`.
- **Quiz:** answers go to `POST /quiz-attempts`, the server grades them against `quiz_questions` and stores the score in `quiz_attempts`. Guests are graded on the device.
- **Content workflow:** a creator saves a lesson (`POST /admin/content`, status `review`) with an image, quiz and paths. The admin publishes it (`PATCH /admin/content/:id/status`), and only then does it appear in learners' paths.
- **New disease:** the admin calls `POST /admin/diseases`, which creates a category and a learning path in one transaction. The disease then appears in the NCD module, the health profile and the lesson form.

## Design principles

- Kinyarwanda-first, audio for every lesson, short sentences, illustrations.
- Offline-first for weak rural connections.
- Privacy by design: no health details on the server.
- Education, not diagnosis: every lesson carries a disclaimer.
