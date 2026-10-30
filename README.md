Placement Prep – Interview & Placement Preparation Tracker

An all-in-one placement preparation platform built with the MERN stack. It helps students practise coding, aptitude and CS fundamentals, take mock interviews, improve their resume and track their progress in one place.

Live demo: https://placement-prep-nu.vercel.app (The backend runs on a free server, so the first load can take up to a minute to wake up.)

✨ Features
📊 Dashboard & Progress Tracking:
Placement readiness score with a transparent breakdown.
Daily progress, streaks, goals and milestones.
Study planner with weekly plans, spaced revision and missed-task rescheduling.
Weekly and monthly reports with CSV / PDF export, and an optional public progress page.

💻 Coding Practice
51 coding problems across 17 topics and three difficulty levels.
Code editor, hints, editorials and hidden test cases.
Submission history, bookmarks, personal notes and a revision queue.
Timed coding assessments and debugging exercises.

🎯 Aptitude & Technical Preparation
Aptitude practice by topic and difficulty, with timed and mock tests and accuracy / speed analytics.
CS fundamentals lessons and server-graded quizzes: OOP, DBMS, SQL, Operating Systems and Computer Networks.
Company preparation tracks and skill-gap roadmaps.

🎤 Mock Interviews
Voice or text answers, with optional read-aloud questions and pressure mode.
Live rule-based feedback on length, structure, filler words, pace and key concepts.
Resume-based and project-based questions, and follow-up questions.
Optional AI coaching when an AI key is configured.

🤖 PlaceBot Assistant
Text and voice chat.
Accepts images, video frames, PDF and DOCX files.
Uses your notes and a built-in knowledge base, and shows its sources.
Works in basic mode when no AI key is configured.

📄 Resume Tools
Resume analyzer with ATS-style score and keyword match against a job description.
Resume builder with live preview, saved versions and PDF export (Print / Save as PDF).

💼 Career Management
Live job and internship listings with a skill-match score.
Company application tracker and goal tracker.
Project showcase with optional public sharing.
Password reset and reminder emails when an email service is configured.

🔐 Authentication & Security
JWT authentication, protected routes and per-user data isolation.
Password hashing, file validation.


🛠️ Tech Stack
Frontend	React 18, Vite, React Router, CSS
Backend	Node.js, Express
Database	MongoDB Atlas, Mongoose
Authentication	JSON Web Tokens (JWT), bcryptjs
Testing	Node.js test suite
Hosting	Vercel (frontend) and Render (backend)

## 🏗️ Project Structure
 
```
placement-prep/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Code editor, speech and theme helpers
│   │   ├── api.js          # API client
│   │   └── App.jsx
│   ├── vercel.json
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # Database connection
│   ├── data/               # Problem bank and debugging exercises
│   ├── middleware/         # Authentication and error handling
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── test/               # Automated tests
│   ├── .env.example        # Template for your environment variables
│   └── server.js
├── DEPLOY.md               # Deployment guide
├── render.yaml
└── README.md

🚀 Run it on your computer:
1. Install these first
Tool	Check it works	Download
Node.js 18 or newer (includes npm)	node -v	https://nodejs.org
Git	git --version	https://git-scm.com
A free MongoDB Atlas account	(see step 3)	https://www.mongodb.com/atlas

2. Clone the project
bash
git clone https://github.com/srusthi-devaray/Placement-Prep
cd Placement-Prep

3. Create a free MongoDB database (Atlas)
Sign in to MongoDB Atlas and create a free M0 cluster.
Database Access → Add New Database User → choose a username and a password. Write them down.
Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0) → Confirm. Wait until the status is Active.
Database → Connect → Drivers → copy the connection string. It looks like: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
Replace <username> and <password> with yours, and add the database name placementprep before the ?: mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/placementprep?retryWrites=true&w=majority

If your password has special characters (such as @ or #), replace them with their URL-encoded form (@ → %40, # → %23) or choose a simple password.

4. Set up and start the backend
bash
cd server
npm install

Create your environment file from the template:
bash
# Mac / Linux
cp .env.example .env
# Windows (Command Prompt)
copy .env.example .env

Open server/.env and set at least these four values:

env
MONGODB_URI=your_connection_string_from_step_3
JWT_SECRET=any_long_random_text
PORT=5000
CLIENT_URL=http://localhost:5173

Start the server:
bash
npm run dev      # auto-restarts when you change code
# or
npm start
Open http://localhost:5000/api/health. You should see "db":"connected".

5. Set up and start the frontend (in a second terminal)
bash
cd client
npm install
npm run dev
Keep both terminals running.
Open http://localhost:5173 in your browser


💻 Run & Submit for coding problems (optional)

Run, Submit, Timed Assessment and Debugging need a code runner. Without one the app still works, and you can read problems, hints and solutions. Choose one option, add it to server/.env, and restart the server:

Option	Setup:
Docker (safest)	Install Docker Desktop and start it, run docker pull python:3.12-alpine once, then set CODE_RUNNER=docker

Local Python (development only)	Install Python 3 and add it to PATH, then set CODE_RUNNER=local. This is not a sandbox. Use it only on your own computer.

Judge0	Set CODE_RUNNER=judge0, JUDGE0_URL and JUDGE0_RAPIDAPI_KEY

The local mode is refused when NODE_ENV=production, so it only works on your own machine.

🔧 Optional settings:All are optional. The app works without them.

Variable (in server/.env)	What it enables
ANTHROPIC_API_KEY	Full AI chat, AI answer review and AI resume rewriting
ADZUNA_APP_ID, ADZUNA_APP_KEY	India-focused job listings
BREVO_API_KEY or RESEND_API_KEY, MAIL_FROM	Password reset and reminder emails
ADMIN_EMAILS	Accounts allowed to verify company tracks

🧪 Run the tests
bash
cd server
npm test

⚠️ Known limitations

Run / Submit, Timed Assessment and Debugging do not work on the free hosted demo because it has no code runner. They work when you run the project locally with a runner.

Company tracks are community-style information and are marked unverified. Always check official company pages.
Job listings come from public job APIs. Check the original posting before applying.
Mock interview feedback is rule-based. AI coaching appears only when an AI key is set.


