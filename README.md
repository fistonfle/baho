# Baho

**Baho** ("live" in Kinyarwanda) is a Kinyarwanda-first, audio-first web app that teaches rural communities in Rwanda how to prevent and live with non-communicable diseases (NCDs): high blood pressure, diabetes, heart disease and cancer. Learners get a personal learning path based on their health profile, listen to short illustrated lessons, check their understanding with quizzes, and keep learning when the network drops. Health professionals write the lessons, and an administrator reviews and publishes them.

- **GitHub repository:** https://github.com/fistonfle/baho
- **Video demo:** [demo/Baho-Demo.mp4](demo/Baho-Demo.mp4) ([watch on GitHub](https://github.com/fistonfle/baho/blob/main/demo/Baho-Demo.mp4))
- **Capstone:** BSc Software Engineering, African Leadership University (FullStack track)

![Learner dashboard with the diabetes learning path](designs/screenshots/04-dashboard-learning-path.png)

---

## Contents

1. [Features](#features)
2. [Technology choices](#technology-choices)
3. [Project structure](#project-structure)
4. [Setting up the environment](#setting-up-the-environment)
5. [Designs](#designs)
6. [Database schema](#database-schema)
7. [API endpoints](#api-endpoints)
8. [Deployment plan](#deployment-plan)
9. [Demo walkthrough](#demo-walkthrough)
10. [Scope and privacy notes](#scope-and-privacy-notes)

---

## Features

| Feature | Where in the code | Proposal ref |
|---|---|---|
| Kinyarwanda interface and content | whole app | FR01 |
| **Learning paths**: each diagnosed condition maps to an ordered curriculum stored in PostgreSQL; the dashboard shows "lesson 2 of 7" and the next lesson | `GET /curricula`, `screens/PathsScreen.tsx`, `DashboardScreen.tsx` | FR09 |
| **Lesson flow**: illustration → short text → audio → quiz | `screens/LibraryScreen.tsx`, `public/images/` | FR01, FR02 |
| Audio player for every lesson (recorded MP3, or the browser voice as a fallback) with replay, seek and speed | `components/AudioPlayer.tsx` | FR02 |
| **Lesson quizzes**: questions in `quiz_questions`; signed-in attempts are graded by the server and saved in `quiz_attempts`; progress shows the best score and the average | `POST /quiz-attempts`, `components/LessonQuiz.tsx` | SO3 |
| NCD module: risk factors, warning signs and prevention for each disease, with audio | `screens/NcdScreen.tsx` | FR03 |
| **Add a new disease**: an admin adds a disease; it gets its own topic and learning path and appears for learners right away | `POST/PATCH /admin/diseases`, `components/DiseaseManager.tsx` | FR03, FR12 |
| Onboarding with topic choice and an optional health profile (diagnosed conditions plus six lifestyle questions) | `OnboardingScreen.tsx`, `HealthProfileScreen.tsx` | FR07, FR08 |
| Health profile encrypted on the device (AES-GCM, non-extractable key in IndexedDB), never sent to the server | `lib/secureStore.ts` | NFR05, NFR06 |
| "For you" feed ranked by a transparent rule (topic +2, risk +3, finished −4) with the reason on each card | `lib/personalization.ts` | FR09 |
| Five-item knowledge check (Appendix A of the proposal) comparing the first and latest scores | `screens/CheckupScreen.tsx` | SO3 |
| Progress, learning streak and a seven-day calendar | `lib/activity.ts` | FR13 |
| Exercise guidance by level with steps and audio | `screens/ExerciseScreen.tsx` | FR05 |
| Reminders with quick presets and browser notifications | `screens/RemindersScreen.tsx` | FR04 |
| Searchable FAQ with audio answers, questions to health workers, issue reports | `screens/FaqScreen.tsx` | FR18, FR19 |
| Offline: service worker for the app shell, images and audio; local copy of lessons; outbox for reports written offline | `public/sw.js`, `lib/offline.ts` | FR06, FR19 |
| Responsive layout: bottom navigation on phones, top navigation on laptops | `components/AppNav.tsx`, `styles/features.css` | FR15, NFR10 |
| Staff area with tabs: review queue, lessons (image, learning paths, quiz editor), diseases, learner questions, staff accounts, reports, FAQ | `screens/AdminScreen.tsx` | FR12, FR16, FR17 |
| Installable PWA (manifest and icons) | `public/manifest.webmanifest` | NFR08 |

**Roles.** *Learners* can use Baho as guests or with an account (an account keeps progress, quiz scores, reminders and questions on the server). *Creators* (health professionals) write lessons with an image, a quiz and learning paths and send them for review; they cannot publish. *Admins* review and publish lessons, add diseases, answer questions and manage staff.

---

## Technology choices

| Layer | Tool | Why |
|---|---|---|
| Frontend | **React 18 + TypeScript**, built with **Vite** | Component-based UI, type safety, fast builds; one codebase for phones and laptops |
| State | **Redux Toolkit** | One predictable store for lessons, progress, paths and staff data |
| Offline | **Service worker**, localStorage, **IndexedDB** + **Web Crypto (AES-GCM)** | Works on weak rural connections; keeps health answers private on the device |
| Audio | HTML5 Audio + **Web Speech API** | Plays recorded Kinyarwanda MP3s; reads lessons aloud when no recording exists yet |
| Backend | **Node.js + Express** | Lightweight REST API in the same language as the frontend |
| Database | **PostgreSQL** (`pg` driver) | Relational data with foreign keys (users, lessons, paths, quizzes, attempts) |
| Auth | scrypt password hashing + HMAC-signed bearer tokens, role middleware | No extra dependencies; staff routes are protected on the server |
| Tests | Node's built-in test runner | 15 API tests, including the full staff workflow |
| DevOps | **Docker / Docker Compose**, Git + GitHub | Reproducible API and database environment |

---

## Project structure

```text
baho/
├── frontend/                 React + TypeScript PWA (Vite)
│   ├── public/               sw.js, manifest, icons, lesson illustrations (images/)
│   └── src/
│       ├── App.tsx           app controller: data loading, navigation, handlers
│       ├── components/       AppNav, AudioPlayer, LessonQuiz, DiseaseManager, ui
│       │   └── screens/      one file per screen (Dashboard, Library, Ncd, Admin, ...)
│       ├── lib/              personalization, secureStore (AES-GCM), offline, activity
│       ├── data/             built-in Kinyarwanda content (offline fallback, exercises)
│       ├── services/api.ts   REST client
│       ├── store/            Redux Toolkit slice
│       └── styles/           features.css (index.css holds the base design)
├── backend/                  Node.js + Express REST API
│   ├── src/
│   │   ├── config/           db.js (schema + seeding), seedData.js, demo store
│   │   ├── modules/          auth, content, learning, progress, questions, issues, reminders
│   │   └── routes/index.js   all /api/v1 routes
│   ├── tests/api.test.js
│   ├── Dockerfile
│   └── .env.example
├── database/                 schema.sql (13 tables) and seed.sql
├── designs/                  wireframes/, uml/, screenshots/, erd.svg, architecture.svg
├── docs/                     architecture.md, deployment.md
├── demo/                     Baho-Demo.mp4 (video demo)
├── docker-compose.yml        API + PostgreSQL
└── package.json              root scripts (setup, dev, test, build)
```

---

## Setting up the environment

### Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 14+** running locally (or Docker, see option B)
- Git

### Option A: run locally (recommended for development)

```bash
# 1. Get the code
git clone https://github.com/fistonfle/baho.git
cd baho

# 2. Install backend and frontend dependencies
npm run setup

# 3. Create the database
createdb baho

# 4. Configure the backend
cp backend/.env.example backend/.env
#    edit backend/.env: set DATABASE_URL for your PostgreSQL user,
#    a long random AUTH_TOKEN_SECRET, and (optionally) the first admin account

# 5. Start the API (http://localhost:4000) and the web app (http://localhost:5173)
npm run dev:backend      # terminal 1
npm run dev:frontend     # terminal 2
```

On start-up the backend creates all tables and seeds the demo content (14 lessons, 6 topics, 5 learning paths, 6 FAQs). If PostgreSQL cannot be reached, it starts in **demo mode** with the same content held in memory (data is lost on restart).

### Environment variables (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://<user>@localhost:5432/baho
AUTH_TOKEN_SECRET=<long random secret>
BAHO_ADMIN_NAME=        # first administrator, created on start-up
BAHO_ADMIN_EMAIL=
BAHO_ADMIN_PASSWORD=    # at least 12 characters
```

The **first admin is created only from these `BAHO_ADMIN_*` values** when the backend starts and no admin exists yet; there is no public sign-up for staff. After that, admins create other admins and creators in **Ubuyobozi → Abakozi**, and learners register themselves in the app. The frontend calls `http://localhost:4000/api/v1` by default; set `VITE_API_BASE_URL` in `frontend/.env.local` for a hosted API.

### Option B: Docker

```bash
docker compose up --build      # API on :4000, PostgreSQL on :5433
npm run dev:frontend           # web app on :5173
```

### Tests, production build and offline check

```bash
npm test             # 15 backend API tests (run in demo mode, no database needed)
npm run preview      # production build served on http://localhost:4173
```

The service worker only runs in the production build: open http://localhost:4173 once, stop the servers (or switch off the network) and reload. The app still opens with the downloaded lessons.

### Recorded audio

Lessons point to files such as `/audio/blood-pressure.mp3` (full list in `backend/src/config/seedData.js`). Record them in Kinyarwanda (Audacity, MP3 at 64 kbps) and place them in `frontend/public/audio/`. Until a file exists, the player reads the lesson with the browser's voice.

---

## Designs

### Wireframes and mockups (design process)

The interface was designed first as wireframes and mockups in the proposal, then built and refined. The finished app keeps the same structure: audio-first lessons, a learning feed on the dashboard, an NCD module, and a staff area with a review queue.

| Phone screens | Laptop learner home | Responsive layouts |
|---|---|---|
| ![](designs/wireframes/01-first-visit-onboarding-home.png) | ![](designs/wireframes/03-learner-home-laptop.png) | ![](designs/wireframes/05-responsive-layouts.png) |
| ![](designs/wireframes/02-audio-lesson-ncd-exercise-reminders.png) | ![](designs/wireframes/04-ncd-lesson-laptop.png) | ![](designs/wireframes/07-staff-roles-review-queue.png) |

All wireframes: [`designs/wireframes/`](designs/wireframes). UML diagrams (use case, activity, class, sequence): [`designs/uml/`](designs/uml).

### Style guide

- **Colours:** primary green `#147764`, dark green `#18342F`, soft green `#E3F3ED`, gold accent `#E5AA50`, coral for warnings `#D9735E`, page background `#F5F8F5`.
- **Type:** Avenir Next / system sans-serif; bold, tight headings; body text at 16 px with 1.7 line height for readability.
- **Components:** rounded cards (14–24 px radius), pill chips for topics and statuses, large touch targets (≥ 44 px), a sticky top bar and a bottom tab bar on phones.
- **Illustrations:** simple flat SVGs with brown-skinned figures and local foods, one per lesson, in the same palette.
- **Accessibility:** audio for every lesson, FAQ answer and exercise; `aria-pressed`/`aria-current` on toggles and navigation; short sentences in plain Kinyarwanda.

### Screenshots of the app

| | | |
|---|---|---|
| ![Landing](designs/screenshots/01-landing.png) Landing | ![Onboarding](designs/screenshots/02-onboarding-topics.png) Onboarding: topics | ![Health profile](designs/screenshots/03-health-profile.png) Private health profile |
| ![Lesson](designs/screenshots/05-lesson-image-audio.png) Lesson: image, text, audio | ![Quiz](designs/screenshots/06-lesson-quiz-feedback.png) Lesson quiz with feedback | ![Paths](designs/screenshots/07-learning-paths.png) Learning paths |
| ![NCD](designs/screenshots/08-ncd-module.png) NCD module | ![Knowledge check](designs/screenshots/09-knowledge-check.png) Knowledge check | ![Exercise](designs/screenshots/10-exercise.png) Exercises |
| ![Reminders](designs/screenshots/11-reminders.png) Reminders | ![Help](designs/screenshots/12-help-faq.png) Help and FAQ | ![Review queue](designs/screenshots/16-admin-review-queue.png) Admin review queue |
| ![Add disease](designs/screenshots/17-admin-add-disease.png) Admin: add a disease | ![Editor](designs/screenshots/18-lesson-editor-image-paths-quiz.png) Lesson editor: image, paths, quiz | ![Creator](designs/screenshots/20-creator-workspace.png) Creator workspace |
| ![Phone dashboard](designs/screenshots/13-mobile-dashboard.png) Phone: dashboard | ![Phone lesson](designs/screenshots/14-mobile-lesson.png) Phone: lesson | ![Phone NCD](designs/screenshots/15-mobile-ncd.png) Phone: NCD module |

### Architecture

![Baho system architecture](designs/architecture.svg)

---

## Database schema

13 PostgreSQL tables. Full DDL: [`database/schema.sql`](database/schema.sql). The backend applies it automatically on start-up.

![Entity relationship diagram](designs/erd.svg)

| Group | Tables |
|---|---|
| People | `users`, `staff` (role: admin or creator) |
| Content | `categories`, `content` (lessons), `quiz_questions`, `faqs` |
| Learning paths and diseases | `curricula` (a path; with a condition it is also a disease), `curriculum_lessons` (ordered lessons in a path) |
| Learner activity | `progress`, `quiz_attempts`, `reminders`, `questions`, `issues` |

The health profile (diagnosed conditions and lifestyle answers) is deliberately **not** in the database: it stays encrypted on the learner's device.

---

## API endpoints

Base path `/api/v1`. 🔒 = signed-in user, 🛡 = staff role required.

| Method and path | Purpose | Access |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | Create a learner account, sign in (returns a token) | Public |
| `GET /categories`, `GET /content`, `GET /content/:id` | Topics and published lessons (with image and quiz) | Public |
| `GET /curricula` | Learning paths and diseases with their ordered lessons | Public |
| `GET /faq` | Frequently asked questions | Public |
| `POST /issues` | Report a problem | Public |
| `POST /quiz-attempts` | Submit quiz answers; graded and saved by the server | 🔒 |
| `GET /progress`, `POST /progress/:contentId/complete` | Completed lessons, best quiz scores and average | 🔒 |
| `GET/POST/DELETE /reminders` | Personal reminders | 🔒 |
| `GET/POST /questions` | Ask a health worker; see answers | 🔒 |
| `GET/POST /admin/content`, `PATCH /admin/content/:id` | Write and edit lessons (image, quiz, paths) | 🛡 admin, creator |
| `PATCH /admin/content/:id/status`, `DELETE /admin/content/:id` | Publish, reject or delete a lesson | 🛡 admin |
| `POST /admin/diseases`, `PATCH /admin/diseases/:id` | Add or edit a disease | 🛡 admin |
| `POST /questions/:id/answer` | Answer a learner's question | 🛡 admin, creator |
| `GET/POST /admin/creators` | List staff, create creator or admin accounts | 🛡 admin |
| `POST/PATCH/DELETE /admin/faqs` | Manage the FAQ | 🛡 admin |
| `GET/PATCH /admin/issues` | Review and resolve reports | 🛡 admin |
| `GET /health` | Health check | Public |

---

## Deployment plan

| Part | Platform | How |
|---|---|---|
| Web app (PWA) | **Vercel** or **Netlify** (free tier, HTTPS by default) | Build command `npm run build` in `frontend/`, publish `frontend/dist`, set `VITE_API_BASE_URL=https://<api-host>/api/v1` |
| REST API | **Render** or **Railway** (Docker web service) | Deploy `backend/` with its `Dockerfile` (start command `npm start`); set `DATABASE_URL`, `AUTH_TOKEN_SECRET` and the first-admin variables |
| Database | Managed **PostgreSQL** (Render, Railway or Neon) | Create the database and copy its URL into `DATABASE_URL`; tables and seed content are created on the first start |
| Audio and images | Served with the web app (`frontend/public`) | Cached by the service worker for offline use |

Steps:

1. Push to GitHub (`main`).
2. Create the managed PostgreSQL database and note its connection URL.
3. Create the API service from the repository (root `backend/`), add the environment variables and deploy. Check `GET /api/v1/health`.
4. Create the frontend site from the repository (root `frontend/`), set `VITE_API_BASE_URL` and deploy.
5. Restrict CORS to the frontend domain, open the site on an Android phone in Chrome and use **Add to home screen**.

Pilot scale (proposal: 30 participants) fits the free or smallest paid tiers of these platforms. For a health-centre setting without reliable internet, `docker compose up` runs the API and database on a single laptop or small server on the local network.

---

## Demo walkthrough

1. **Learner:** Landing → *Tangira kwiga* → choose topics and a name → health profile: tick *Diyabete* and answer six questions (the answers stay encrypted on the phone).
2. **Dashboard:** the diabetes learning path (7 ordered lessons), progress, streak and quiz average; "for you" cards explain why each lesson is suggested.
3. **Lesson:** illustration, short text, audio player, then the quiz; the server grades it and the path moves to the next lesson.
4. **NCD module and knowledge check:** information per disease; take the five-question check before and after learning.
5. **Exercises, reminders, help:** change the exercise level, add a reminder from a preset, search the FAQ and report a problem.
6. **Offline:** in the production build, stop the servers and reload; the app and lessons still work, and reports wait in an outbox.
7. **Staff:** a creator writes a lesson with an image, quiz and learning path; the admin reviews and publishes it, adds a new disease, and answers a learner's question.

---

## Scope and privacy notes

- **Privacy by design:** diagnosed conditions and lifestyle answers never leave the device. The server only stores progress, quiz scores, reminders and questions, which contain no health details.
- **Not a diagnosis tool:** Baho does not collect blood pressure or glucose readings and does not diagnose; every lesson carries a disclaimer advising a visit to the health centre.
- **Deliberate MVP simplifications compared with the proposal:** email and password instead of phone and PIN; two staff roles (admin and creator) instead of three; one signed access token instead of an access/refresh pair.
- **Content review:** the Kinyarwanda lessons and quizzes are drafts to be checked by a native speaker and a health professional before field testing.
