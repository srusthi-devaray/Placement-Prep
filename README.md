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
⚙️ Prerequisites
Before running the project, install the following:
Node.js and npm — to run the frontend and backend.
Git — to clone the repository.
MongoDB Atlas or a local MongoDB instance — to provide the database.

🚀 Getting Started
Follow these steps to run the project on your local machine.

Step 1: Clone the Repository
Open a terminal and run:git clone YOUR_GITHUB_REPOSITORY_URL
Replace YOUR_GITHUB_REPOSITORY_URL with the HTTPS URL of this GitHub repository.
Navigate into the project folder:
cd Placement-Prep

Step 2: Install Backend Dependencies
Open a terminal in the project root and run:cd server,npm install
This installs the packages required by the backend.

Step 3: Configure Backend Environment Variables
Create a .env file inside the server folder.
Example:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_private_random_secret
Replace the example values with your own configuration.
PORT: The port used by the backend during local development.
MONGODB_URI: Your MongoDB connection string
JWT_SECRET: A private secret used to sign authentication tokens, if JWT authentication is implemented.

Step 4: Start the Backend
From the server folder, use the development command configured in server/package.json.
For example, if the project defines a dev script:
npm run dev
If it defines only a start script, use:
npm start
The backend should start on the configured local port. Check the terminal for startup errors and database connection status.

Step 5: Install Frontend Dependencies
Open a second terminal in Visual Studio Code.
Run:cd client,npm install

Step 6: Configure the Frontend
Create a .env file inside the client folder.
For local development, if the backend is running on port 5000 and its API routes use the /api prefix, configure:VITE_API_URL=http://localhost:5000/api
Change the port if your backend uses a different one.
The frontend environment variable should point to the local backend when testing locally, rather than the deployed backend.

Step 7: Start the Frontend
From the client folder, run:
npm run dev
Vite will display a local URL in the terminal, usually:http://localhost:5173
Open that URL in your browser.
Keep the frontend and backend terminals running while testing the application.

Note: Run/Submit in Coding Practice, Timed Assessment and Debugging need a code runner, which is not available on the free host.
All other features work online.

