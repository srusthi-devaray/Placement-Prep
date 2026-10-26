# PlacePrep - Interview & Placement Preparation Tracker (MERN)

React + Vite frontend, Node/Express backend, MongoDB Atlas, JWT auth.

**Features:** dashboard with placement-readiness score, company tracker, daily progress, notes, goals, interview experiences,
mock interview with real-time feedback (voice or text, pressure mode, resume-based questions, optional AI coach),
aptitude tests, PlaceBot chatbot (text, voice, images, video frames, PDF/DOCX, streaming replies, uses your notes),
resume analyzer (ATS score, keyword match vs job description), resume builder (PDF via Print), skill-gap roadmap,
job/internship matcher, knowledge base, light/dark theme.

**Added in the latest version:** live job/internship listings from official APIs (Remotive; Adzuna optional), Study Planner (weekly plans from your weak topics and target company, spaced revision, missed-task rescheduling, fair streaks, weekly/monthly reports with CSV/PDF export, milestones, transparent readiness score), company prep tracks with source labels, a bigger aptitude module (69 questions with topics/difficulty, timed and mock tests, weak-topic and mistake revision, accuracy/time analytics), opt-in revocable progress sharing, password reset and reminder emails (optional), PlaceBot hardening (AI/Basic labels, provider-failure fallback, interrupted-stream recovery, prompt-injection guard, file signature checks), and deployment files.

## 1. MongoDB Atlas (free)
1. Create a free **M0** cluster at https://cloud.mongodb.com
2. *Database Access* -> add a user (username + password).
3. *Network Access* -> add IP `0.0.0.0/0` (or your IP).
4. *Connect -> Drivers* -> copy the connection string. Put your password in it (URL-encode special characters, e.g. `@` -> `%40`) and add the database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/placementprep?retryWrites=true&w=majority`

## 2. Run the backend
```
cd server
npm install
cp .env.example .env      # then edit MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:5000
```
Optional: set `ANTHROPIC_API_KEY` in `.env` for full AI chat, image understanding and the AI coach.
Without it the app runs in Basic mode (knowledge base + your notes).

## 3. Run the frontend
```
cd client
npm install
npm run dev               # http://localhost:5173 (proxies /api to :5000)
```

## Production / deployment
See **[DEPLOY.md](DEPLOY.md)** for the full beginner guide (GitHub -> Atlas -> Render, optional Vercel, environment variables, free-tier limits and costs, backups, monitoring, troubleshooting).
Local production test: `cd client && npm run build`, then `cd ../server && NODE_ENV=production npm start`. Express serves `client/dist` on port 5000.

### Environment variables
| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | server | Atlas connection string (required) |
| `JWT_SECRET` | server | Signs login tokens (required in production) |
| `CLIENT_URL` | server | Allowed frontend origin(s), comma separated (set in production) |
| `NODE_ENV=production` | server | Enables production safeguards |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | server | Optional real AI |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` | server | Optional job source |
| `BREVO_API_KEY` or `RESEND_API_KEY`, `MAIL_FROM` | server | Optional email (password reset, reminders) |
| `CRON_SECRET` | server | Protects `/api/cron/reminders` |
| `ADMIN_EMAILS` | server | Emails allowed to edit company tracks / mark them verified (optional) |
| `CODE_RUNNER`, `JUDGE0_*` | server | Coding runner (see below) |
| `VITE_API_URL` | client (build time) | API address when frontend and backend are on different hosts; must end with `/api` |

Health checks: `/api/health`, `/api/health/ready`. Backups: `npm run backup` / `npm run restore` in `server/`.

## Coding practice runner (Python)
The **Coding Practice** page has 51 original problems in 17 topics (Beginner / Intermediate / Advanced), visible examples, hidden tests,
hints, editorials with complexity, submission history, bookmarks, notes and a revision queue.
Student code is **never run inside the Node server**. Choose one runner in `server/.env`:

| Option | Setup | Notes |
|---|---|---|
| **Docker** (default, recommended) | Install Docker Desktop, start it, run once `docker pull python:3.12-alpine`. Leave `CODE_RUNNER` empty. | Each submission runs in a throw-away container: no network, read-only filesystem, 256 MB RAM, 0.5 CPU, 64 processes, non-root, 2 s per test. Free. Needs a server that can run Docker, so most free web hosts cannot. |
| **Judge0** | Self-host it (needs a Linux machine with Docker) or use the hosted API (RapidAPI has a limited free plan, paid plans above that). Set `CODE_RUNNER=judge0`, `JUDGE0_URL`, and `JUDGE0_RAPIDAPI_KEY` or `JUDGE0_AUTH_TOKEN`. | Best choice for online deployment. Uses Python 3.8 on Judge0 CE, so avoid newer syntax. Not tested here. |
| **Local** (dev only) | Install Python, set `CODE_RUNNER=local`. | Runs in a separate Python process with limits, but it is **not a sandbox**. Only for your own computer. Refused when `NODE_ENV=production`. |

Memory use is only reported by Docker/local on Linux/macOS. On Windows local mode, time is reported and memory is shown as blank.
Piston's public API now needs an approved key and only supports non-commercial educational projects, so it is not wired in.

Regenerate the problems (needs python3): `cd server && npm run build:problems`. Check the judge itself: `npm run judge:selftest`.

## Newer modules (what is real and what is not)
| Module | How it works | Limits |
|---|---|---|
| **My Projects** | Saved in MongoDB per user, GitHub/live links validated (http/https only). Optional public showcase on your share page (only projects you tick). Feeds project-based mock questions and the skill-gap check. | Links are not visited or verified. |
| **Resume versions** | Snapshot / restore / rename / delete (max 30) in the Resume Builder. | PDF = your browser's "Save as PDF" from the print window (works everywhere, no server PDF library). |
| **Company tracks** | Stored in the `CompanyTrack` collection (seeded from `services/companyTracks.js` on first start). Each shows when it was written and whether it is verified. | Seeded tracks are **app guidance, not verified**. Only emails in `ADMIN_EMAILS` can edit or mark a track verified. No salaries, eligibility or interview questions are claimed. |
| **CS Fundamentals** | 16 lessons, 64 quiz questions (OOP, DBMS, SQL, OS, Networks) written for this app. Quizzes are graded on the server; weak lessons and mistakes feed the planner, roadmap and dashboard. | Small curriculum; verify details in your textbook. |
| **Timed assessments** | Server-side clock and deadline, hints/solutions locked for the problems inside, score = share of test cases passed. | Needs the code runner (Docker or Judge0 in production). |
| **Debugging exercises** | 10 exercises made by injecting one bug into verified solutions (`node scripts/buildDebug.js` re-checks them by running the code). | Python only. |
| **Mock interview** | Objective scoring is rule-based. Follow-ups are AI-generated only if `ANTHROPIC_API_KEY` is set, otherwise rule-based, and always labelled. Project-based questions come from My Projects. Communication numbers (words, wpm, fillers) are counted, not guessed. | Voice uses the browser's speech recognition (Chrome/Edge); no audio is uploaded or stored. |

## Tests
`cd server && npm test` runs the logic tests, the coding-practice route tests, and the workflow tests (projects, resume versions, DB tracks, CS quizzes, timed assessments, debugging, mock follow-ups, roadmap, per-user isolation), and the feature tests (planner, readiness, reports, sharing, job feed, aptitude analytics, tracks, PlaceBot modes/fallback/injection/isolation). They use in-memory stand-ins (`test/fakeDb.js`), so no database or network is needed; set `CODE_RUNNER=local` for the coding tests.

## Honest limits
- Job feeds: Remotive is remote-only and 24h delayed; neither source gives application deadlines or a reliable closed flag, so the app only says "still listed / no longer listed" and never claims a job is open.
- Company tracks and practice prompts are app-written guidance, not real interview questions.
- The readiness score is a practice-progress indicator, not a prediction.
- Videos are read as 4 still frames; AI answers can be wrong and are labelled as such.

## Notes
- Voice input uses the browser Web Speech API: use Chrome or Edge.
- Video is analysed as 4 still frames (no audio).
- Roadmap links are suggestions of free resources.
