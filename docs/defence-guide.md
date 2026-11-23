# Defending Baho

A summary sheet for the viva: why the system is the way it is, how to show any
part of it, and how to add something on the spot without breaking it.

---

## 1. The decisions, in one line each

| Decision | Why | What I turned down |
| --- | --- | --- |
| Kinyarwanda for learners, English for staff | The learner cannot be asked to read English about her own blood pressure. Staff are literate professionals and the portal is not the product. | One bilingual interface, which doubles the translation work on the screens that matter least |
| Audio on every lesson | Reading is the barrier, not interest. A lesson nobody can read is a lesson nobody gets. | Text only, with audio "later" |
| Progressive web app, not Android native | No store account, no APK, no install friction, one codebase, and it updates itself. Works on the cheap Android phones the participants actually carry. | React Native or Flutter, which needs a store listing and a download before anyone can try it |
| Offline-first with a service worker | Rural network is intermittent and data costs money. After the first visit the app and its audio open with no connection. | Assuming connectivity and showing an error when it drops |
| Guest access, no account required | An account form before any value is a wall. The account exists only to carry progress across devices. | Sign-up first, which loses the curious visitor |
| Phone number + 4-digit PIN for learners | Learners have phone numbers, not email, and a PIN is the pattern they already know from mobile money. | Email + password, which excludes most of the target users |
| Writers draft, specialists publish | Health content with a wrong fact is a harm, not a bug. `LessonWorkflow.resolve` downgrades any publish request on an unreviewed lesson to `review`, so no writer's lesson goes live unseen. A specialist is the clinical authority on their own diseases, so there they write and publish in one step. | Trusting the author, or trusting an admin to check medicine |
| Admins manage people, not lesson content | Separation of duties. The generate-audio route is `requireRole('creator', 'specialist')` — administrators are deliberately excluded. | One powerful role, which makes the approval step decorative |
| Questions are public, askers are not | The same question comes up again and again, so an answer that reaches one person helps the next twenty. Anyone may ask, signed in or not; the answer is published under the lesson with no name on it, and the API strips the asker before any staff member sees the question. | A private inbox per learner, which answers the same question twenty times |
| Health profile stays encrypted on the phone | The server cannot leak what it never holds. Personalisation runs on the device in `frontend/src/lib/personalization.ts`. | A server-side profile, which turns a learning app into a health-records system |
| Self-hosted on a Kigali VM | Rwandan personal data under Law 058/2021, kept in Rwanda, on infrastructure I control, at a price a student project can carry. | A US cloud, which raises a transfer question I would then have to answer |
| In-memory fallback when Postgres is unavailable | The app and the whole test suite run with no database, so a marker can start it with one command. | Requiring a database before anything can be demonstrated |
| A machine voice as the floor, not the ceiling | Three lessons had a human recording; eleven were silent. Silence serves nobody. Generated audio is labelled, reviewable, and any uploaded recording replaces it. | Leaving eleven lessons silent until volunteers appear, or passing a computer voice off as a person |
| Audio generated once and stored as a file | The learner's phone never meets a model, replay costs nothing, and the service worker caches it for offline use. | Synthesising in the browser or on every request |
| The voice in its own container | Torch has no business in the API image. If `baho-tts` is down the endpoint answers `503` and the portal asks for a recording; lessons, learners and the rest of the API are untouched. | One image, where a 700 MB model can take the API down with it |

**The honest limits** — say them before you are asked:

- 20 participants in one setting. Useful evidence, not a claim about rural Rwanda.
- Six of the twenty had never used a smartphone; they finished 1.7 of 5 tasks
  unaided (SUS 50.4) against 5 of 5 and 85.4 for regular users. The language
  barrier came down; a device barrier was underneath it, and the platform needed
  a community health worker to introduce it.
- Kinyarwanda is tonal and the model often flattens tone. That is why generated
  audio is labelled and why a recording always wins.
- NCSA registration and the breach-notification duty are not yet met.
- The eleven backfilled lessons were already published, so that audio went live
  before a specialist listened to it.

---

## 2. "Show me…"

| If they ask | What you do |
| --- | --- |
| The live app | https://bahoapp.site — it is a PWA, so Add to Home screen shows the install |
| It works offline | Load a lesson, turn off Wi-Fi, reload. The app and the audio come from the service worker (`frontend/public/sw.js`) |
| The staff side | Landing page → **Staff sign-in**. Writers draft, specialists approve, admins manage people |
| The review rule | As a writer, try to publish — it goes back to `review`. The rule is nine lines in `backend/src/domain/LessonWorkflow.js`. A specialist publishes on their own diseases, and nowhere else |
| Lesson questions | Open a lesson signed out, scroll to **Ibibazo n'ibisubizo**: the answered questions, no names. Ask one; the specialist answers it in the portal and it appears there |
| The generated voice | Staff portal → edit a lesson with no audio → **Generate audio instead**. Learners see *"Ijwi ryakozwe na mudasobwa"* under the player |
| Audio on a disease | Staff portal → **Diseases** → **Edit** → upload or generate. The learner hears the whole page: what it is, the risks, the signs, the prevention |
| Is the voice running | `curl https://bahoapp.site/api/v1/health` → `"voice":"ready"` |
| The tests | `cd backend && npm test` (36) and `cd frontend && npm test` (41) |
| The architecture | [architecture.md](architecture.md), with the diagram in `designs/architecture.svg` |
| The database | [database/schema.sql](../database/schema.sql), 16 tables, ERD in `designs/erd.svg` |
| How it deploys | Push to `main` → tests → three images → SSH deploy (`.github/workflows/deploy.yml`) |

Run the whole thing locally with no database:

```bash
cd backend && BAHO_DEMO_MODE=true npm run dev
```

```bash
cd frontend && npm run dev
```

---

## 3. "Add this" — the path every change walks

A feature crosses the same seven places, in this order. Follow it and nothing is
left half-wired.

1. **Database** — `backend/src/config/db.js`. Add the table, or a column as
   `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so old servers migrate themselves.
   Mirror it in `database/schema.sql`, which is the readable copy.
2. **Server logic** — `backend/src/modules/<area>/<area>.controller.js`. Rules
   that are worth testing on their own go in a class in `backend/src/domain/`.
3. **Route** — `backend/src/routes/index.js`, with `authenticate` and
   `requireRole(...)` naming exactly who may call it.
4. **Client types** — `frontend/src/types.ts`.
5. **Client call** — `frontend/src/services/api.ts`.
6. **State** — `frontend/src/store/appSlice.ts` if more than one screen needs it.
7. **Screen** — `frontend/src/components/screens/` for learners (Kinyarwanda) or
   `frontend/src/components/admin/` for staff (English), styled from
   `frontend/src/styles/portal.css`.

Then prove it:

```bash
cd backend && npm test
```

```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```

Pushing to `main` deploys it. Nothing else to do.

### The worked example: "read the lesson aloud"

Every one of the seven steps, in one feature:

1. `audio_is_synthetic` column on `content`.
2. `speakable()` builds the script and `TtsEngine` speaks it through `TTS_URL`.
3. `POST /admin/media/audio/generate`, `requireRole('creator', 'specialist')`.
4. `audioIsSynthetic` on the lesson type.
5. `api.generateAudio(title, body, quiz)`.
6. `audioIsSynthetic` carried through the content form.
7. **Generate audio instead** in `AudioUpload.tsx`; the note under the player in
   `AudioPlayer.tsx`.

Plus two pieces that only a feature with its own process needs: the `baho-tts`
service in `deploy/docker-compose.production.yml`, and `tts` in the build matrix
of `.github/workflows/deploy.yml`.

### If they ask for it live

- **A visible change** (wording, a label, a button) — one file in
  `frontend/src/components/`, save, and `npm run dev` reloads it instantly.
- **A new field on a lesson** — all seven steps; the database and the type are
  the two people forget.
- **A one-off job over existing data** — a script in `backend/scripts/`, like
  `backfill-audio.js`. Select the rows, act on each, log what you did, and make
  it safe to run twice.
- **Do not** change a status rule, a role check or the review flow on the spot.
  Say what you would change and why; those three are the safety of the system.

---

## 4. Three answers to have ready

**"Only twenty participants."** Twenty is enough to find a barrier, not enough
to measure a population. It found one I had not designed for: the people who
could not use the phone at all. I report it as a finding about those twenty.

**"A computer voice on health content is risky."** It is, which is why the voice
never decides anything. It reads text a specialist approved, it is labelled on
the screen as a machine, a human recording replaces it the moment one exists,
and the alternative was eleven silent lessons for exactly the learners who
cannot read them.

**"How much of this did you write?"** I made every decision on this sheet and I
can defend any file in the repository. I used AI assistance, it is declared, and
the commit history records it. The test for me is not whether a tool was in the
room; it is whether I can explain why `LessonWorkflow.resolve` downgrades a
publish request, and what breaks if it does not.

---

## 5. Worked live: "add a column on disease"

A disease is a row in **`curricula`** (the ones with a `condition_name`), not in
`categories`. Say that first — it is the one thing in the schema whose name does
not match the word on the screen.

Suppose they ask for **Kwivuza / treatment**, one paragraph per disease. Nine
edits, in this order. Keep `npx tsc --noEmit` running: it names every file you
still have to touch.

### Backend

**1. The column** — `backend/src/config/db.js`, with the other curricula
migrations:

```sql
ALTER TABLE curricula ADD COLUMN IF NOT EXISTS treatment TEXT;
```

`IF NOT EXISTS` is the whole migration story here: the server runs this at
start-up, every start-up, so the live database updates itself when the new image
boots and running it twice costs nothing.

**2. The readable copy** — add the same line to the `curricula` table in
`database/schema.sql`. The app does not read this file; examiners do.

**3. Four places in** `backend/src/modules/learning/learning.service.js`:

| Function | Edit |
| --- | --- |
| `mapCurriculum` | `treatment: row.treatment \|\| '',` — this is where `snake_case` becomes `camelCase`, and it serves the database and the in-memory store at once |
| `diseaseFields` | `treatment: String(body.treatment \|\| '').trim(),` |
| `createDisease` | add `treatment` to the `INSERT` column list, `$12` to the values, `fields.treatment` to the array |
| `updateDisease` | add `treatment = $9` to the `SET` list and `fields.treatment` to the array |

Add a line to `validateDisease` only if the field is required. The in-memory
fallback needs nothing: it spreads `diseaseFields` straight onto the object.

### Frontend

**4. The type** — `frontend/src/types.ts`, on `Curriculum`: `treatment: string;`
Save it and the compiler lists everything left to do.

**5. The staff form** — `frontend/src/components/admin/DiseaseManager.tsx`, four
small edits in one file: `DiseaseForm`, `emptyForm`, the prefill that fills the
form from an existing disease, and the payload sent to the API. Then one line
where the fields are drawn:

```tsx
{field('treatment', 'Kwivuza', 'How this disease is treated.')}
```

**6. The learner screen** — `frontend/src/components/screens/NcdScreen.tsx`,
beside `disease.about` and `disease.prevention`.

### Prove it

```bash
cd backend && npm test
```

```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```

Then show it working, with no database:

```bash
cd backend && BAHO_DEMO_MODE=true npm run dev
```

Staff portal → **Diseases** → **Edit** → the new box is there; save, then open
the disease as a learner.

### What to say while you do it

- The column is added with `IF NOT EXISTS` because the server migrates itself at
  start-up — there is no separate migration step to forget or run out of order.
- `mapCurriculum` is the single translation point between the database's
  `snake_case` and the API's `camelCase`, which is why the in-memory fallback
  gets the new field for free.
- TypeScript is the checklist: adding one line to `Curriculum` makes the
  compiler point at every screen that has to change.
- A field that is a **list** rather than a paragraph (like `prevention`) is the
  same nine edits with `JSONB NOT NULL DEFAULT '[]'` as the column type,
  `cleanList(body.treatment)` in `diseaseFields`, and `JSON.stringify(...)` in
  the two queries.
