# Placement Prep – Interview & Placement Preparation Tracker

An all-in-one placement preparation platform built using the MERN stack to help students prepare for coding interviews, aptitude tests, technical interviews, and job applications while tracking their progress.

## ✨ Features

### 📊 Dashboard & Progress Tracking
- Placement readiness score based on practice progress.
- Daily progress tracking, goals, and milestones.
- Study planner with weekly plans, spaced revision, and missed-task rescheduling.
- Weekly and monthly progress reports with CSV/PDF export.

### 💻 Coding Practice
- 51 coding problems across 17 topics and multiple difficulty levels.
- Code editor, hints, editorials, and hidden test cases.
- Submission history, bookmarks, notes, and revision queue.
- Timed coding assessments and debugging exercises.

### 🎯 Aptitude & Technical Preparation
- Aptitude practice with topic-wise and difficulty-wise questions.
- Timed and mock tests with accuracy and time analytics.
- CS fundamentals lessons and quizzes covering OOP, DBMS, SQL, Operating Systems, and Computer Networks.
- Company preparation tracks and skill-gap roadmaps.

### 🎤 Mock Interviews
- Voice-based or text-based mock interviews.
- Real-time feedback and communication metrics.
- Resume-based and project-based interview questions.
- Optional AI-generated follow-up questions and coaching.

### 🤖 PlaceBot AI Assistant
- Text and voice interactions.
- Supports images, video frames, PDF, and DOCX inputs.
- Uses personal notes and the knowledge base to support preparation.
- Basic mode available when the external AI provider is not configured.

### 📄 Resume Tools
- Resume analyzer with ATS-style scoring and keyword matching against job descriptions.
- Resume builder with version saving, restoring, renaming, and deleting.
- Export resumes using the browser's Print / Save as PDF feature.

### 💼 Jobs & Career Management
- Job and internship listings through supported sources.
- Optional Adzuna integration.
- Company preparation tracks.
- Personal project portfolio with optional public sharing.
- Password reset and reminder emails when email services are configured.

### 🔐 Authentication & Security
- JWT-based authentication.
- Protected routes and per-user data isolation.
- Password reset support.
- File validation and security safeguards.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **AI Integration:** Optional Anthropic API
- **Coding Execution:** Docker or Judge0, depending on configuration
- **Testing:** Node.js test suite

## 🏗️ Project Structure

```text
placement-prep/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Reusable utilities and components
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication and error handling
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── test/               # Automated tests
│   ├── server.js
│   └── package.json
├── .gitignore
├── DEPLOY.md
├── README.md
└── render.yaml
```
Note: Run/Submit in Coding Practice, Timed Assessment and Debugging need a code runner, which is not available on the free host.
All other features work online.

