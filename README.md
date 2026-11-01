# Baho

**Baho** ("live" in Kinyarwanda) is a Kinyarwanda-first, audio-first web app that teaches people in rural Rwanda how to prevent and live with non-communicable diseases (NCDs): high blood pressure, diabetes, heart disease and cancer. Learners follow a study programme chosen from a private health profile, listen to short illustrated lessons, check their understanding with quizzes, and keep learning when the network drops. Health workers write the lessons, a specialist for each disease approves them, and an administrator publishes them.

| | |
|---|---|
| **Live app** | https://baho.filito.rw |
| **Walkthrough video** | [demo/Baho-Walkthrough.mp4](demo/Baho-Walkthrough.mp4) |
| **Technical report (PDF)** | [docs/Baho-Technical-Report.pdf](docs/Baho-Technical-Report.pdf) |
| **Repository** | https://github.com/fistonfle/baho |
| **Capstone** | BSc Software Engineering, African Leadership University (FullStack track) |

![Learner dashboard with the diabetes study programme](designs/screenshots/04-dashboard-learning-path.png)

---

## Contents

1. [Features](#features)
2. [Technical requirements](#technical-requirements)
3. [Installation](#installation)
4. [Repository structure](#repository-structure)
5. [Testing and evidence](#testing-and-evidence)
6. [Code quality and algorithms](#code-quality-and-algorithms)
7. [Designs and screenshots](#designs-and-screenshots)
8. [Database schema](#database-schema)
9. [API endpoints](#api-endpoints)
10. [Deployment](#deployment)
11. [Translations](#translations)
12. [Scope and privacy notes](#scope-and-privacy-notes)

---

## Features

| Feature | Where in the code | Proposal ref |
|---|---|---|
| Kinyarwanda learner interface and content; staff portal in English | whole app; `components/admin/` | FR01 |
| **Study programmes** (*gahunda y'imyigire*): each disease has an ordered set of lessons; the dashboard shows "lesson 2 of 7" and the next lesson | `GET /curricula`, `screens/PathsScreen.tsx`, `DashboardScreen.tsx` | FR09 |
| **Lesson flow**: illustration → short text → audio → quiz | `screens/LibraryScreen.tsx`, `public/images/` | FR01, FR02 |
| **Recorded audio**: staff upload a person reading the lesson (or record it on a phone); learners get play, seek, speed and offline listening. Lessons without a recording show no player; there is no computer voice | `components/admin/AudioUpload.tsx`, `components/AudioPlayer.tsx`, `modules/media/` | FR02 |
| **Lesson quizzes** graded by the server; best score and average in progress | `POST /quiz-attempts`, `components/LessonQuiz.tsx` | SO3 |
| NCD module: what each disease is, risk factors, warning signs, prevention | `screens/NcdScreen.tsx` | FR03 |
| Onboarding with topics and an optional health profile (diagnosed conditions plus six lifestyle questions) | `OnboardingScreen.tsx`, `HealthProfileScreen.tsx` | FR07, FR08 |
| Health profile **encrypted on the device** (AES-GCM, non-extractable key in IndexedDB), never sent to the server | `lib/secureStore.ts` | NFR05, NFR06 |
| "For you" lessons ranked by a transparent rule (risk +3, topic +2, finished −4) with the reason shown | `lib/personalization.ts` | FR09 |
| Five-question knowledge check comparing the first and latest scores | `screens/CheckupScreen.tsx` | SO3 |
| Progress, learning streak and a seven-day calendar | `lib/activity.ts` | FR13 |
| Exercise guidance by level, reminders with notifications, searchable FAQ, questions to health workers, issue reports | `ExerciseScreen.tsx`, `RemindersScreen.tsx`, `FaqScreen.tsx` | FR04, FR05, FR18, FR19 |
| **Sign-in with a phone number and PIN** for learners (most have no email); lockout after 5 wrong PINs | `modules/auth/phone.js`, `screens/AuthScreen.tsx` | FR10 |
| **Specialist approval**: lessons on a disease with a specialist must be approved before publishing | `domain/LessonWorkflow.js`, `modules/review/`, `components/admin/SpecialistWorkspace.tsx` | FR16, FR17 |
| Staff portal: review and publish, lesson editor with quiz editor, diseases, learner questions, staff and specialist assignment, reports, FAQ | `screens/AdminScreen.tsx`, `components/admin/` | FR12, FR16, FR17 |
| **Offline**: the service worker caches the app and audio; lessons are kept on the device; reports written offline wait in an outbox | `public/sw.js`, `lib/offline.ts` | FR06, FR19 |
| Responsive portal layout: top navigation on laptops, bottom tab bar on phones; installable PWA | `components/AppNav.tsx`, `styles/portal.css`, `public/manifest.webmanifest` | FR15, NFR08, NFR10 |

**Roles.** *Learners* use Baho as guests or with an account (phone number + 4–6 digit PIN), which keeps progress, quiz scores, reminders and questions on the server. *Writers* (health workers) draft lessons and send them for review. *Specialists* are assigned one or more diseases; they approve lessons on those diseases or send them back with a note. *Admins* publish approved lessons, add diseases, answer questions and manage staff.

**Lesson workflow:** `draft` → `review` → `approved` (by a specialist of that disease) → `published`; `rejected` means changes were requested. The API enforces it: publishing a lesson whose disease has a specialist returns `409` until it is approved.

---

## Technical requirements

| | Version used | Notes |
|---|---|---|
| Node.js / npm | 20.x / 10.x | Backend runtime and build tools (the Docker images use `node:20-alpine`) |
| PostgreSQL | 16 (production), 14+ supported | Without a database the API runs in demo mode with in-memory data |
| React / React DOM | 18.3 | With TypeScript 5.9 and Vite 5.4 |
| Redux Toolkit | 2.13 | Application state |
| Express | 4.22 | REST API, with `pg` 8.23, `cors`, `dotenv` |
| Vitest | 2.1 | Frontend unit tests; backend tests use Node's built-in test runner |
| Docker / Docker Compose | 24+ | Production images and the local stack (optional for development) |
| Browsers | Chrome / Edge 100+ (Android and desktop), Safari on iOS 16+ | Tested on Chrome 156 (macOS) and Safari on iOS 26.5 (iPhone simulator); needs Service Worker, IndexedDB and Web Crypto |
| Hardware | Any phone that runs a current Chrome or Safari | First visit downloads about 230 KB on a phone (photos included); the server stack is capped at 1.2 GB of memory |

---

## Installation

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
#    set DATABASE_URL, a long random AUTH_TOKEN_SECRET and the first admin (BAHO_ADMIN_*)

# 5. Start the API (http://localhost:4000) and the web app (http://localhost:5173)
npm run dev:backend      # terminal 1
npm run dev:frontend     # terminal 2
```

On start-up the backend creates all tables and seeds the demo content (14 lessons, 6 topics, 5 study programmes, 6 FAQs). If PostgreSQL cannot be reached it starts in **demo mode** with the same content in memory.

`backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://<user>@localhost:5432/baho
AUTH_TOKEN_SECRET=<long random secret>
BAHO_ADMIN_NAME=        # first administrator, created on start-up
BAHO_ADMIN_EMAIL=
BAHO_ADMIN_PASSWORD=    # at least 12 characters
```

The first admin is created only from the `BAHO_ADMIN_*` values; there is no public staff sign-up. Admins then create writers, specialists and other admins in **Staff portal → Staff**. The frontend calls `http://localhost:4000/api/v1` by default; set `VITE_API_BASE_URL` in `frontend/.env.local` to use another API.

**With Docker instead:** `docker compose up --build` (API on :4000, PostgreSQL on :5433), then `npm run dev:frontend`.

**Production build and offline check:** `npm run preview` serves the production build on http://localhost:4173. Open it once, stop the servers or switch off the network, and reload: the app still opens with the downloaded lessons.

---

## Repository structure

```text
baho/
├── frontend/                     React + TypeScript PWA (Vite)
│   ├── public/                   sw.js (service worker), manifest, icons, robots.txt, lesson photographs (images/)
│   ├── nginx.conf, Dockerfile    production image (nginx serving the build)
│   └── src/
│       ├── App.tsx               app controller: data loading, navigation, handlers
│       ├── components/           AppNav, AudioPlayer, LessonQuiz, ui (shared building blocks)
│       │   ├── screens/          one file per screen (Dashboard, Library, Ncd, Auth, Admin, ...)
│       │   └── admin/            staff portal parts: ContentForm, QuizEditor, LessonPreview,
│       │                         SpecialistWorkspace, StaffPanel, DiseaseManager
│       ├── lib/                  personalization, activity (streaks), phone, secureStore (AES-GCM), offline
│       │                         and their unit tests (*.test.ts)
│       ├── data/                 built-in Kinyarwanda content (offline fallback, exercises, risk questions)
│       ├── services/api.ts       REST client
│       ├── store/                Redux Toolkit slice (+ tests)
│       └── styles/portal.css     the whole design system
├── backend/                      Node.js + Express REST API
│   ├── src/
│   │   ├── config/               db.js (schema, migrations, seeding), seedData.js, in-memory store
│   │   ├── domain/               LessonWorkflow (lesson status rules)
│   │   ├── modules/              auth, content, review, media (recordings), learning, progress, questions, issues, reminders, health
│   │   └── routes/index.js       all /api/v1 routes with role checks
│   ├── tests/                    api.test.js (integration), domain.test.js (unit)
│   └── Dockerfile
├── database/                     schema.sql (14 tables) and seed.sql
├── deploy/                       production compose file, Caddy block, .env template
├── designs/                      screenshots/, wireframes/, uml/, erd + architecture (Mermaid sources and SVG)
├── docs/
│   ├── Baho-Technical-Report.pdf the technical report
│   ├── testing.md                testing strategies and results
│   ├── deployment.md             server setup
│   ├── photo-credits.md          authors and licences of the lesson photographs
│   ├── evidence/                 Lighthouse reports, compatibility, load tests, test output
│   └── translations/             Kinyarwanda text spreadsheet for review
├── scripts/
│   ├── evidence/                 headless-Chrome scripts for screenshots and compatibility checks
│   └── translations/             export / apply scripts for the Kinyarwanda review
├── demo/                         walkthrough video
├── .github/workflows/deploy.yml  CI/CD: tests → Docker images → deploy
└── package.json                  root scripts (setup, dev, test, build, translations)
```

---

## Testing and evidence

```bash
npm test                       # backend: 18 API integration tests + 6 unit tests (no database needed)
npm --prefix frontend test     # frontend: 39 unit tests (Vitest)
npm run build                  # type check (strict, no unused code) and production build
```

| Strategy | What it covers | Result |
|---|---|---|
| **Unit tests** | Lesson workflow rules, phone/PIN validation, sign-in lockout, audio format detection, recommendation ranking, learner choices (topics and diseases first), risk tags, streaks, store reducers | 45 unit tests pass |
| **Integration tests** | Every API module through HTTP: roles and permissions, phone sign-up, lesson review and publishing, audio upload, quizzes, progress, reminders, FAQ | 18 tests pass |
| **Performance** (Lighthouse, live site) | Mid-range phone, low-end phone (6× slower CPU, 3G), desktop | 95 / 75 / 100 performance with photographs (100 / 92 / 100 before); 100 accessibility, best practices and SEO |
| **Compatibility** | Screen widths 320–1920 px, Chrome 156, Safari on iOS 26.5, offline after first visit | No overflow; works offline |
| **Load** (local) | 50 concurrent users for 15 s per endpoint | 5,400–21,000 requests/s, p99 ≤ 11 ms, no errors |

Testing found and fixed three problems: a layout shift from an unsized image, missing `robots.txt` and heading order, and the app not opening offline after the first visit once the browser cache was cleared. Full details, method and before/after numbers: [docs/testing.md](docs/testing.md). Raw results are in [docs/evidence](docs/evidence).

---

## Code quality and algorithms

- **Separation of concerns.** Backend modules each have routes → controller (HTTP) → service (data access); the frontend separates screens, reusable components, the Redux store, the API client and pure logic in `lib/`.
- **Classes where state or rules belong together.** `LessonWorkflow` encapsulates the lesson status rules used by both the content and review modules; `PhoneNumber` normalises Rwandan numbers; `LoginGuard` keeps its failure counts private and takes an injectable clock so it can be unit-tested; `MediaStore` saves recordings and recognises the audio format from the file's first bytes.
- **Swappable data layer.** Each service runs a PostgreSQL implementation and falls back to an in-memory implementation with the same contract (`withFallback`), so the API keeps working and tests run without a database.
- **Algorithms.** Rules-based ranking of lessons (O(n log n)), study-programme progress, streak counting over a set of days, server-side quiz grading, phone normalisation with a single regular expression, a sliding lockout for PIN attempts, audio format detection by file signature, byte-range slicing of cached recordings, AES-GCM encryption of the health profile, and service-worker caching strategies (network-first for pages, cache-first for assets and audio).
- **Checks.** Strict TypeScript with unused-code errors, tests and a build on every push.

---

## Designs and screenshots

The interface follows a formal information-portal layout, revised after supervisor feedback that the first version looked generic: utility bar, masthead, main navigation, breadcrumbs, titled panels, data tables and a footer, all from one stylesheet (`frontend/src/styles/portal.css`). Colours: primary green `#0b5845`, navy `#14304d`, neutral borders; status colours only for badges and notices. No emojis, gradients or decorative fonts. Lessons and diseases use real photographs (several from Rwanda) from Wikimedia Commons under open licences; authors and licences are listed in [docs/photo-credits.md](docs/photo-credits.md) and in the app under *Ubufasha*.

| | | |
|---|---|---|
| ![Landing](designs/screenshots/01-landing.png) Landing | ![Onboarding](designs/screenshots/02-onboarding-topics.png) Onboarding: topics | ![Health profile](designs/screenshots/03-health-profile.png) Private health profile |
| ![Lesson](designs/screenshots/05-lesson-image-audio.png) Lesson: image, text, audio | ![Quiz](designs/screenshots/06-lesson-quiz-feedback.png) Lesson quiz with feedback | ![Programmes](designs/screenshots/07-learning-programmes.png) Study programmes |
| ![NCD](designs/screenshots/08-ncd-module.png) NCD module | ![Knowledge check](designs/screenshots/09-knowledge-check.png) Knowledge check | ![Exercise](designs/screenshots/10-exercise.png) Exercises |
| ![Reminders](designs/screenshots/11-reminders.png) Reminders | ![Help](designs/screenshots/12-help-faq.png) Help and FAQ | ![Profile](designs/screenshots/21-profile-phone-account.png) Profile (phone account) |
| ![Phone sign-up](designs/screenshots/13-phone-sign-up.png) Phone: sign-up with a phone number | ![Phone dashboard](designs/screenshots/14-phone-dashboard.png) Phone: dashboard | ![Phone diseases](designs/screenshots/15-phone-diseases.png) Phone: diseases |
| ![Review](designs/screenshots/16-admin-review-and-publish.png) Staff: review and publish | ![Editor](designs/screenshots/17-lesson-editor.png) Staff: lesson editor | ![Staff](designs/screenshots/18-admin-staff-specialists.png) Staff: accounts and specialists |
| ![Diseases](designs/screenshots/19-admin-diseases.png) Staff: diseases | ![Specialist](designs/screenshots/20-specialist-review.png) Specialist: review a lesson | |

Wireframes from the proposal: [`designs/wireframes/`](designs/wireframes). UML diagrams (use case, activity, class, sequence): [`designs/uml/`](designs/uml).

### Architecture

![Baho system architecture](designs/architecture.svg)

---

## Database schema

14 PostgreSQL tables. Full DDL: [`database/schema.sql`](database/schema.sql); the backend applies it on start-up. Diagram source: [`designs/erd.mmd`](designs/erd.mmd).

![Entity relationship diagram](designs/erd.svg)

| Group | Tables |
|---|---|
| People | `users` (phone for learners, email for staff), `staff` (admin, creator or specialist), `specialist_topics` |
| Content | `categories`, `content` (lessons, with `reviewed_by`, `review_note`, `reviewed_at`), `quiz_questions`, `faqs` |
| Study programmes and diseases | `curricula` (a programme; with a condition it is also a disease), `curriculum_lessons` |
| Learner activity | `progress`, `quiz_attempts`, `reminders`, `questions`, `issues` |

The health profile is deliberately **not** in the database: it stays encrypted on the learner's device.

---

## API endpoints

Base path `/api/v1`. 🔒 = signed-in user, 🛡 = staff role required.

| Method and path | Purpose | Access |
|---|---|---|
| `POST /auth/register` | Create a learner account: `{ name, phone, pin }` | Public |
| `POST /auth/login` | Sign in with `{ identifier, password }`: phone + PIN, or staff email + password | Public |
| `GET /categories`, `GET /content`, `GET /content/:id` | Topics and published lessons (with image and quiz) | Public |
| `GET /curricula` | Study programmes and diseases with their ordered lessons | Public |
| `GET /faq` | Frequently asked questions | Public |
| `POST /issues` | Report a problem | Public |
| `POST /quiz-attempts` | Submit quiz answers; graded and saved by the server | 🔒 |
| `GET /progress`, `POST /progress/:contentId/complete` | Completed lessons, best quiz scores and average | 🔒 |
| `GET/POST/DELETE /reminders` | Personal reminders | 🔒 |
| `GET/POST /questions` | Ask a health worker; see answers | 🔒 |
| `GET/POST /admin/content`, `PATCH /admin/content/:id` | Write and edit lessons (image, quiz, programmes) | 🛡 admin, creator |
| `PATCH /admin/content/:id/status`, `DELETE /admin/content/:id` | Publish, reject or delete a lesson | 🛡 admin |
| `POST /admin/diseases`, `PATCH /admin/diseases/:id` | Add or edit a disease | 🛡 admin |
| `POST /questions/:id/answer` | Answer a learner's question | 🛡 admin, creator, specialist |
| `GET /review/queue` | Lessons waiting for this specialist (with quiz answers) and their history | 🛡 specialist |
| `POST /review/lessons/:id` | Approve a lesson, or request changes with a note | 🛡 specialist |
| `PUT /admin/staff/:id/topics` | Set the diseases a specialist reviews | 🛡 admin |
| `GET/POST /admin/creators` | List staff; create writer, specialist or admin accounts | 🛡 admin |
| `POST/PATCH/DELETE /admin/faqs` | Manage the FAQ | 🛡 admin |
| `GET/PATCH /admin/issues` | Review and resolve reports | 🛡 admin |
| `POST /admin/media/audio` | Upload a lesson recording (MP3, M4A, OGG, WAV, WebM; checked by file signature, max 20 MB) | 🛡 admin, creator |
| `GET /media/:file` | Play a recording (supports byte ranges for seeking) | Public |
| `GET /health` | Health check | Public |

---

## Deployment

Live at **https://baho.filito.rw** on a Linux server, as a Docker stack behind Caddy (HTTPS from Let's Encrypt).

| Part | Runs as | Notes |
|---|---|---|
| Web app (PWA) | `baho-frontend` (nginx serving the Vite build) | Same domain as the API; installable with **Add to home screen** |
| REST API | `baho-backend` (Node 20) | `https://baho.filito.rw/api/v1`, health check at `/api/v1/health` |
| Database | `baho-postgres` (PostgreSQL 16) | Private to the stack |
| Recordings | volume `baho_media` mounted in `baho-backend` | Uploaded lesson audio, served at `/api/v1/media/…` |
| Routing and HTTPS | Caddy | `/api/*` to the API, everything else to the web app |

**Continuous deployment** (`.github/workflows/deploy.yml`): every push to `main` runs the backend and frontend tests and the build, builds both images and pushes them to GitHub Container Registry, then connects over SSH, pulls the images, restarts the stack and waits until the health check reports a database connection. Secrets live only in `/app/baho/.env` on the server. Setup steps: [docs/deployment.md](docs/deployment.md).

---

## Translations

Learner text is Kinyarwanda; the staff portal is English. Every learner-facing phrase can be reviewed in a spreadsheet and written back automatically:

```bash
npm run translations:export                 # docs/translations/baho-text.csv
npm run translations:apply -- --dry-run     # show what the corrections would change
npm run translations:apply -- --db          # apply to the code and to lessons in PostgreSQL
```

---

## Scope and privacy notes

- **Privacy by design:** diagnosed conditions and lifestyle answers never leave the device. The server stores progress, quiz scores, reminders and questions, which contain no health details.
- **Not a diagnosis tool:** Baho does not collect readings and does not diagnose; every lesson carries a disclaimer advising a visit to the health centre.
- **Changes from the proposal:** no SMS verification of phone numbers yet; one signed access token instead of an access/refresh pair; lessons have audio only once a person's recording is uploaded (no computer voice), and the recordings still have to be made.
- **Content review:** lessons and quizzes were reviewed for Kinyarwanda wording; a health professional should check them before field testing.
