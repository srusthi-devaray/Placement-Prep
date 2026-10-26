# Deploying Placement Prep (step by step, for beginners)

Goal: anyone can open your app from a public `https://...` link, without your laptop being on.

You need three free accounts: **GitHub** (stores your code), **MongoDB Atlas** (database, you already have it) and **Render** (runs the app).
Vercel is optional (see "Option B").

> A local server that works on your laptop is **not** a deployed app. After step 6 you must test the public link from your phone
> (on mobile data, not your home Wi-Fi) with your laptop switched off.

---

## The plan (Option A - recommended: ONE service, one link)

The Express server already serves the built React app. So Render runs a single service and you get one URL.
No CORS settings, no second host. Do this first. (Option B at the bottom splits frontend and backend.)

### Step 1 - Put the project on GitHub
1. Create an account at https://github.com and click **New repository**. Name it `placement-prep`, choose **Private**, do not add a README. Create it.
2. Install Git for Windows (https://git-scm.com) if you do not have it.
3. Open a terminal **in the `placement-prep` folder** (the one that contains `client`, `server`, `render.yaml`) and run:
```
git init
git add .
git status
```
Check that `.env` and `node_modules` are **not** in the list (they are ignored by `.gitignore`). Your passwords must never go to GitHub. Then:
```
git commit -m "first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/placement-prep.git
git push -u origin main
```
(GitHub will ask you to sign in in the browser the first time.)

### Step 2 - Production database (MongoDB Atlas)
You can reuse your cluster, but use a **separate database name** for production so test data stays out:
1. Atlas -> **Database Access**: keep your user (or add a new one with a strong password, no `@ : / ?` characters to avoid encoding problems).
2. Atlas -> **Network Access** -> **Add IP Address** -> **Allow access from anywhere** (`0.0.0.0/0`). Render's free servers have changing IP addresses, so a fixed IP cannot work. Security comes from your long database password.
3. Atlas -> **Connect -> Drivers** -> copy the string and change it to:
`mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/placementprep_prod?retryWrites=true&w=majority`
   (if `mongodb+srv` fails on your network, use the "Legacy" `mongodb://` string, as you did locally).
Keep this string private. You will paste it into Render in step 4. Do not send it to anyone, including me.

### Step 3 - Create the Render service
1. Sign up at https://render.com with your GitHub account.
2. **New +** -> **Web Service** -> connect your `placement-prep` repository.
3. Fill the form:
   - **Name:** `placement-prep` (this becomes `https://placement-prep.onrender.com`; if taken, Render adds letters)
   - **Language/Runtime:** Node
   - **Root Directory:** leave empty
   - **Build Command:**
     `npm --prefix client install --include=dev && npm --prefix client run build && npm --prefix server install`
   - **Start Command:** `npm --prefix server start`
   - **Instance type:** Free
   - **Health Check Path** (under Advanced): `/api/health`

### Step 4 - Environment variables (Render -> your service -> Environment)
| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the production string from step 2 |
| `JWT_SECRET` | a long random text (40+ characters). Make one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | your Render address, e.g. `https://placement-prep.onrender.com` (set it after you know the address; redeploy once) |
| `ANTHROPIC_API_KEY` | optional - real AI chat. Paid per use. Without it the app uses Basic mode. |
| `ANTHROPIC_MODEL` | optional, e.g. `claude-sonnet-5-5` |
| `ADMIN_EMAILS` | optional - your own email, so you can mark company tracks as verified after checking them |

Secrets are stored by Render, not in your code. Never put them in the repository or in files starting with `VITE_` (those are public).

### Step 5 - Deploy and check
Click **Create Web Service**. The first build takes a few minutes; watch the **Logs**. You should see `API running on port ...` and `MongoDB connected`.
Then open:
- `https://YOUR-APP.onrender.com/api/health` -> `{"ok":true,"db":"connected",...}`
- `https://YOUR-APP.onrender.com/` -> the landing page. Register an account and try it.

If the health page says `"db":"connecting"` forever: the Atlas IP list or the connection string is wrong (see Troubleshooting).

### Step 6 - Test it the real way
Switch off your laptop's server (close the terminal), open the link on your phone using mobile data, register and log in.
Free services sleep after 15 minutes without visitors; the first visit afterwards takes about a minute to wake up. That is normal on the free plan.

### Step 7 - Keep it awake and enable reminder emails (optional, free)
1. Make a free account at https://cron-job.org -> **Create cronjob** -> URL `https://YOUR-APP.onrender.com/api/health`, every 10 minutes.
   This keeps the app awake during the day. (A single free service has 750 hours a month, enough to run 24/7.)
   Please do not use it to hammer the service; every 10-14 minutes is plenty.
2. For daily study-reminder emails also set `CRON_SECRET` (any random text) and create a second cron job: `POST https://YOUR-APP.onrender.com/api/cron/reminders`
   once a day, with the request header `x-cron-secret: YOUR_SECRET`.

### Step 8 - Updating the app later
Change code -> `git add . && git commit -m "message" && git push`. Render redeploys automatically.

---

## What does NOT work on free hosting (and what to do)

| Feature | Situation |
|---|---|
| **Coding practice "Run / Submit"** | Needs a safe sandbox. Render's free plan cannot run Docker sandboxes and the "local" runner is blocked in production on purpose (it is not safe for strangers' code). Problems, hints, editorials and progress still work; Run/Submit shows "unavailable". To enable it: use Judge0 (`CODE_RUNNER=judge0`, `JUDGE0_URL`, `JUDGE0_RAPIDAPI_KEY`; check their current free plan limits) or host the app on a VPS with Docker. |
| **Email (password reset, reminders)** | Render's free plan blocks SMTP ports, so this app sends email through an HTTPS email API. Create a free Brevo account (https://www.brevo.com), verify your sender address, create an API key, then set `BREVO_API_KEY` and `MAIL_FROM=Placement Prep <you@gmail.com>`. Without it, "Forgot password" is hidden. |
| **File uploads** | Files are processed in memory and never stored (Render's free disk is wiped on restart), so there is nothing to back up or to leak. Limits: 15 MB per upload, 10 MB for documents in chat, first 25 PDF pages. |
| **Live job listings** | Remotive works with no key (remote tech jobs, 24h delayed). For India-focused jobs create a free Adzuna key (https://developer.adzuna.com) and set `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`. Read Adzuna's terms: free use is meant for personal job search/research. Internshala, LinkedIn, Naukri etc. have no public API and forbid scraping, so they are link-outs only. |

## Free-tier limits and possible future costs (checked October 2026 - prices change, re-check before relying on them)
- **Render free web service:** sleeps after 15 min idle (about 1 min to wake), 750 free instance hours/month per workspace, local files are lost on every restart, outbound SMTP ports blocked, one instance only. Paid plans start at a few dollars a month and remove sleeping. https://render.com/docs/free
- **MongoDB Atlas M0:** 512 MB storage, shared CPU, **no automatic backups**. More space/backups means a paid cluster.
- **Vercel Hobby (Option B):** free for personal, non-commercial projects.
- **Brevo free email:** about 300 emails/day. **Remotive:** free, max ~4 requests/day (the app caches for 8 hours and respects this). **Adzuna:** free key with a daily call limit shown in your account.
- **Anthropic API (AI chat):** pay per use. Costs depend on usage; set a spending limit in the Anthropic console. If the key runs out or fails the app falls back to Basic mode automatically and says so in the chat.
- **Custom domain:** about 700-1,000 rupees a year if you want `yourname.in` instead of `onrender.com`.

## Backups and recovery
Atlas M0 does not back up for you. From your laptop, in `server/` with your production `MONGODB_URI` in `.env`:
```
npm run backup
```
This writes every collection to `server/backups/<date>/`. Do it weekly and keep the folder somewhere private (it contains password hashes and user data - never commit it; it is git-ignored).
Restore into an empty database: `node scripts/restore.js backups/<folder> --confirm` (add `--force` to replace existing data).

## Monitoring and logging
- Render -> **Logs**: one line per API call (method, path, status, time). No passwords, tokens or request bodies are logged. Errors print a stack trace.
- `GET /api/health` (process alive) and `GET /api/health/ready` (database connected too) are for monitors. Add a free https://uptimerobot.com monitor on `/api/health/ready` to get an email when it goes down.
- If the database is briefly unreachable the API answers 503 "starting up" instead of hanging, retries the connection on its own, and finishes in-flight requests when Render restarts the service.
- Optional later: error tracking with Sentry (free tier). Not included to keep dependencies small.

## Security checklist before sharing the link
- [ ] `JWT_SECRET` is long and random, set only in Render.
- [ ] `.env` is not on GitHub (`git ls-files | findstr .env` shows nothing except `.env.example`).
- [ ] `CLIENT_URL` is set to your real address (otherwise any website can call your API).
- [ ] Atlas user has a strong password; production uses its own database name.
- [ ] `CODE_RUNNER` is not `local` (the server refuses it in production anyway).
- [ ] Anthropic key has a monthly spending limit.
- [ ] Rotate any secret that was ever pasted into a chat, screenshot or public repo.
- Built in: passwords hashed with bcrypt, rate limits on login/chat/uploads/jobs, uploaded files verified by content (not just extension), uploaded text treated as data (prompt-injection guard), every query scoped to the logged-in user, public share pages expose only what the owner ticked.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Render build fails: `vite: not found` | Build command must contain `--include=dev` for the client install (as above). |
| Logs: `MONGODB_URI is missing` | Add it under Environment, then **Manual Deploy**. |
| Logs: `Server selection timed out` / TLS alert | Atlas Network Access must show `0.0.0.0/0` **Active**; the cluster must not be paused; try the Legacy `mongodb://` string. |
| `querySrv ECONNREFUSED` | Use the Legacy connection string. |
| Page loads but login says "Cannot reach the server" | You opened the wrong URL, or (Option B) `VITE_API_URL` is missing/wrong. |
| Browser console: CORS error | `CLIENT_URL` must exactly equal the address in the browser bar (no trailing slash, `https`). |
| First visit takes a minute | Free plan waking up. Use the keep-awake job (step 7) or a paid plan. |
| `FATAL: JWT_SECRET is not set` | Add `JWT_SECRET` in Render. |

---

## Option B - Frontend on Vercel, backend on Render
Use this if you want the faster global CDN for the frontend. It adds CORS and one more variable.
1. Deploy the backend on Render exactly as above, but use **Build Command** `npm --prefix server install`. Set `CLIENT_URL` to your future Vercel address.
2. https://vercel.com -> sign in with GitHub -> **Add New Project** -> pick the repo.
   - **Root Directory:** `client`; Framework: Vite (auto-detected). `client/vercel.json` already makes page refreshes work.
   - **Environment variable:** `VITE_API_URL` = `https://YOUR-API.onrender.com/api` (must end with `/api`).
3. Deploy. Copy the Vercel address (e.g. `https://placement-prep.vercel.app`), put it in Render's `CLIENT_URL` (several addresses can be comma-separated) and redeploy Render.
4. Test from your phone as in step 6.

## Local development (unchanged)
`server`: `npm install`, copy `.env.example` to `.env`, `npm run dev`. `client`: `npm install`, `npm run dev`. Tests: `cd server && npm test`.
