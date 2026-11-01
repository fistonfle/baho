# Testing and validation

Seven testing approaches were used. Each section says why it was chosen, how it was run, what it found and what changed as a result. Raw results are in [`evidence/`](evidence). All measurements were taken on 1 November 2026.

| Approach | Tool | Result |
|---|---|---|
| Unit testing | Node test runner, Vitest | 45 tests pass |
| Integration (API) testing | Node test runner over HTTP | 18 tests pass |
| Input and error-handling testing | inside the tests above | invalid input is rejected with clear errors |
| Performance testing | Lighthouse 12.6 on the live site | 99 (mid-range phone), 82 (low-end phone), 100 (desktop), final version with photographs |
| Compatibility and offline testing | Chrome 156, Safari on iOS 26.5, 6 screen widths | no horizontal scrolling; works offline after the first visit |
| Load testing | autocannon, 50 concurrent users | 5,400–21,000 requests/s, no errors |
| Usability and accessibility review | phone-size audit script, 12 learner screens | 6 access problems found and fixed |

## 1. Unit testing

**Why.** The rules that decide what a learner sees and who may publish must be correct in every case, and are easiest to check in isolation.

**How.** `npm test` (backend) and `npm --prefix frontend test` (frontend). Output: [`evidence/tests/`](evidence/tests).

| Unit | Cases checked |
|---|---|
| `LessonWorkflow` (backend) | publishing is held in review on a topic with a specialist, allowed after approval, allowed directly without a specialist; valid statuses; what each role may set |
| `PhoneNumber` | five ways of writing the same number all normalise to `+250781234567`; wrong prefix, too short, too long, foreign code, letters and empty values are rejected; PINs of 4–6 digits only |
| `MediaStore` | MP3 (with and without a tag), M4A, OGG, WAV and WebM recognised from their first bytes; a web page or a too-short file is refused |
| `LoginGuard` | locks after the maximum failures, other numbers unaffected, unlocks after 15 minutes (with an injected clock), a successful sign-in resets the count |
| `learnerTopics`, `orderDiseases`, `filterLessons` | sign-up and health-profile topics merged; chosen diseases listed first; "Ibyo wahisemo" shows only the learner's topics, most relevant first; learners who chose nothing see every lesson |
| `rankLessons` | risk match (+3) above topic match (+2) above unrelated; both scores add; finished lessons drop (−4); ties go to the newest lesson; empty input |
| `riskTagsFromAnswers`, `profileTags`, `recommendedPaths`, `pathProgress` | "no" counts as the risk for healthy-habit questions; unanswered questions ignored; duplicates removed; fallback to the prevention programme; next lesson in order |
| `countStreak` | streak ending today or yesterday, gap stops the count, no activity, across month and year boundaries |
| store reducers | learners go to the dashboard and staff to the staff portal after sign-in; a staff sign-in keeps the learner's name on the device; sign-out clears the account; best quiz score kept |

**Results and changes.** All 45 pass. Writing them led to two refactors: the streak logic was split into a pure `countStreak(days, today)` so it could be tested without the browser, and the lockout became a `LoginGuard` class with an injectable clock instead of module-level functions.

## 2. Integration testing (API)

**Why.** Most of Baho's behaviour crosses the frontend–backend boundary: roles, the review workflow, quiz grading and progress. These tests start the real Express app and call it over HTTP.

**How.** `backend/tests/api.test.js`, run in demo mode (in-memory data) so no database is needed; the same flows were also run against PostgreSQL during development.

**Results.** 18 tests pass, covering: audio upload (anonymous and learner uploads refused, a text file renamed as audio refused with 415, a real recording served back with its type and with byte ranges for seeking); health check; public catalogue; first-admin seeding; anonymous and learner access to staff routes is refused (401/403); phone sign-up and sign-in; duplicate accounts (409); writers cannot publish or edit others' lessons; drafts stay private until published; learners only see their own questions; FAQ and issue management; reminders and progress validation; quizzes graded on the server; a disease added by an admin gets its own topic and programme; **a lesson on a disease with a specialist cannot be published until that specialist approves it (409), and specialists only see their own diseases**.

## 3. Testing with different inputs and error handling

| Input | Expected behaviour | Result |
|---|---|---|
| Phone `078 123 4567`, `+250 78 123 4567`, `250781234567` | same account | sign-in succeeds with any form |
| Phone `0712345678` (not MTN/Airtel) or too short | rejected before sending, and by the API (400) | message "Andika nimero ya telefoni yo mu Rwanda…" |
| PIN `12`, `1234567`, `12a4` | rejected; letters cannot be typed in the PIN field | 400 from the API |
| 5 wrong PINs | number locked for 15 minutes, even with the right PIN | 429 "Too many wrong attempts" |
| Writer sends `status: published` | saved as `review` | writer cannot publish |
| Admin publishes a lesson awaiting a specialist | refused | 409 with the reason; button disabled in the portal |
| Specialist requests changes without a note | refused | 400 "Explain what needs to change" |
| Quiz with one option, or the answer index out of range | refused | 400 with the reason |
| Learner opens a staff route | refused | 401 without a token, 403 with a learner token |
| No network | app opens from the service worker; issue reports are queued | sent automatically when the connection returns |
| Upload of a text file renamed `.mp3` | refused | 415 "Upload an MP3, M4A, OGG, WAV or WebM recording" |
| Upload over 20 MB | refused before sending, and by the API | 413 |
| Lesson without a recording | no audio player shown | player hidden; lessons with a recording show it |

## 4. Performance testing

**Why.** Learners are on low-cost phones and weak rural connections; NFR01 requires core content within 3 seconds on a mid-range Android phone.

**How.** Lighthouse 12.6.1 against https://baho.filito.rw in three profiles: mid-range phone (Lighthouse default: 4× CPU slowdown, slow 4G), low-end phone (6× CPU slowdown, 700 kbit/s, 300 ms latency) and desktop. Reports: [`evidence/lighthouse/`](evidence/lighthouse).

| Profile | Run | Performance | Accessibility | Best practices | SEO | First / largest paint | Layout shift |
|---|---|---|---|---|---|---|---|
| Mid-range phone | before | 97 | 98 | 100 | 92 | 1.41 s / 1.42 s | 0.000 |
| | after fixes | **100** | **100** | **100** | **100** | 1.35 s / 1.35 s | 0.000 |
| | **final, with photos** | **99** | **100** | **100** | **100** | 1.43 s / 2.03 s | 0.000 |
| Low-end phone | before | 90 | 98 | 100 | 92 | 2.70 s / 2.70 s | 0.084 |
| | after fixes | **92** | **100** | **100** | **100** | 2.71 s / 2.71 s | **0.000** |
| | **final, with photos** | **82** | **100** | **100** | **100** | 2.71 s / 4.21 s | 0.000 |
| Desktop | before | 97 | 98 | 100 | 92 | 0.33 s / 0.33 s | 0.109 |
| | after fixes | **100** | **100** | **100** | **100** | 0.33 s / 0.33 s | **0.000** |
| | **final, with photos** | **100** | **100** | **100** | **100** | 0.35 s / 0.43 s | 0.000 |

**What the first run found and what changed.**

1. *Layout shift (0.109 desktop, 0.084 low-end).* Lighthouse traced it to the landing illustration, which had no size, so the page moved when it loaded. Learner images now carry their 320×200 size; the shift is now 0.
2. *Heading order.* Footer headings were `<h4>` after page-level `<h2>`; they are now `<h2>` with the same look.
3. *robots.txt.* The single-page-app fallback returned the HTML page for `/robots.txt`; a real file was added.

**Photographs (third run).** Replacing the drawings with real photographs first raised the page weight to 1.3 MB, because every photo was 1000 px wide and the landing page fetched lesson photos twice (cached lessons, then the server's). Each photo now has a 480 px copy chosen by `srcset` and photos below the first screen load only when scrolled to. A preload of the landing photo was tried and removed: on a 400 kbit/s connection it delayed the app's code, so the first text appeared after 5.6 s instead of 2.9 s. In the final version a first visit on a phone transfers 240 KB in 13 requests; the landing photo, now the largest element, appears at 2.0 s on a mid-range phone (within NFR01's 3 s) and 4.2 s on the low-end profile. (Lighthouse's total page weight also counts the lesson photos it loads while scrolling the whole page.) The trade-off was accepted because real local photographs were requested to make the app trustworthy; a smaller landing image for phones is the next step.

**Resources** (first visit on a phone screen, clean storage, before the photographs): 17 requests, **116 KB** transferred, 2 MB of JavaScript memory, 443 DOM nodes. NFR03 asks for an app shell under 5 MB.

## 5. Compatibility and offline testing

**Why.** NFR08 and NFR10 require the app to work in current mobile and desktop browsers and from 360 to 1920 px without horizontal scrolling; FR06 requires offline use.

**How.** `scripts/evidence/compatibility.mjs` drives headless Chrome 156 against the live site; Safari was tested in the iOS 26.5 simulator on an iPhone 17e and an iPhone 17 Pro Max. Results: [`evidence/compatibility/`](evidence/compatibility).

| Environment | Width | Horizontal overflow | Smallest button |
|---|---|---|---|
| Small phone (iPhone SE size) | 320 px | none | 30 px |
| Android phone | 360 px | none | 30 px |
| iPhone 15 size | 393 px | none | 30 px |
| iPad | 768 px | none | 30 px |
| Laptop | 1366 px | none | 30 px |
| Desktop monitor | 1920 px | none | 30 px |
| Safari, iOS 26.5 (iPhone 17e, iPhone 17 Pro Max) | device | none | renders as in Chrome |

**Weak network:** at about 400 kbit/s with 400 ms latency (a poor 3G signal) the first text appears after **2.9 s** on a first visit (final version).

**Offline — a bug found and fixed.** The first offline run passed only because the browser's HTTP cache still held the app's JavaScript and CSS. With that cache cleared, a learner who lost signal right after a first visit got a blank page: the service worker had cached the page but not the hashed build files. The worker now reads them from `index.html` when it installs and caches them. Re-tested with the browser cache cleared: the app, the four diseases and the three newest lessons appear offline, with the offline notice shown.

## 6. Load testing

**Why.** NFR09 asks for an architecture that can serve 10,000+ users. The live server is shared with other projects, so the load test ran against the same API and PostgreSQL on a development machine (Apple M4, 16 GB), not against production.

**How.** autocannon 8.0, 50 concurrent connections for 15 seconds per endpoint. Results: [`evidence/load/`](evidence/load).

| Endpoint | Requests/s | Median latency | 99th percentile | Errors |
|---|---|---|---|---|
| `GET /api/v1/content` (all lessons) | 5,379 | 9 ms | 11 ms | 0 |
| `GET /api/v1/curricula` (programmes) | 11,400 | 4 ms | 5 ms | 0 |
| `GET /api/v1/health` | 20,967 | 2 ms | 4 ms | 0 |

The API is stateless (signed tokens, no server sessions), so more instances can run behind Caddy if needed.

## 7. Usability and accessibility review (phone)

**Why.** Learners use low-cost phones, often for the first time; anything hard to reach or to tap keeps them out (NFR07).

**How.** `scripts/evidence/ux-audit.mjs` walks a new learner through 12 screens at 390 px (landing, onboarding, health profile, dashboard, lessons, diseases, exercises, reminders, help, knowledge check, profile, sign-up), saves full-page screenshots, and lists every control shorter than 40 px and every English or technical word. Results: [`evidence/usability/`](evidence/usability).

| Found | Fix |
|---|---|
| Help (FAQ, questions to health workers, reports) was not in the phone tab bar; only a footer link at the bottom of each page reached it | Help is the sixth tab |
| Buttons 30–38 px, text links 22 px, Yes/No answers 35 px | On phones: buttons 44 px, small buttons 40 px, links and footer items padded, Yes/No 44 px |
| A new learner's dashboard opened with four empty statistics (0, 0, –, –) before the study programme and its button | Statistics appear after the first lesson; the programme comes first |
| Onboarding pre-selected three topics the learner never chose, so "your topics" were not really theirs | Nothing is pre-selected; at least one topic must be chosen |
| Technical and English words: "(AES-GCM)" in the privacy note, "1 min" on every lesson | Removed; "Iminota 1" |
| The help page ended with a 13-entry photo-credits list | Credits fold into one closed section |

After the fixes the audit finds no controls under 40 px (checkboxes and radios sit inside full-width tappable rows) and no English on learner screens apart from "PIN", which learners know from mobile money.

## Not yet done

- **Usability testing with learners** (SUS, task completion; proposal SO3) needs the 30-participant study planned after this prototype.
- **Firefox and Samsung Internet** were not tested; the app uses only standard APIs that both support.
- **Real low-end Android hardware**: performance was measured with CPU and network throttling rather than on a physical device.
