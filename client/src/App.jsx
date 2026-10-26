import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Loading } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Layout from './pages/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Progress from './pages/Progress.jsx';
import Mock from './pages/Mock.jsx';
import Aptitude from './pages/Aptitude.jsx';
import Notes from './pages/Notes.jsx';
import Goals from './pages/Goals.jsx';
import Chat from './pages/Chat.jsx';
import ResumeAnalyzer from './pages/ResumeAnalyzer.jsx';
import ResumeBuilder from './pages/ResumeBuilder.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Jobs from './pages/Jobs.jsx';
import Experiences from './pages/Experiences.jsx';
import Knowledge from './pages/Knowledge.jsx';
import Code from './pages/Code.jsx';
import CodeProblem from './pages/CodeProblem.jsx';
import Planner from './pages/Planner.jsx';
import Tracks from './pages/Tracks.jsx';
import Projects from './pages/Projects.jsx';
import Assess from './pages/Assess.jsx';
import DebugExercise, { DebugList } from './pages/Debug.jsx';
import CsLearn from './pages/CsLearn.jsx';
import CsLesson from './pages/CsLesson.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import PublicProgress from './pages/PublicProgress.jsx';

// Redirects to the login page when nobody is logged in.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/u/:token" element={<PublicProgress />} />
      <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="progress" element={<Progress />} />
        <Route path="mock" element={<Mock />} />
        <Route path="aptitude" element={<Aptitude />} />
        <Route path="notes" element={<Notes />} />
        <Route path="goals" element={<Goals />} />
        <Route path="chatbot" element={<Chat />} />
        <Route path="resume" element={<ResumeAnalyzer />} />
        <Route path="builder" element={<ResumeBuilder />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="experiences" element={<Experiences />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="code" element={<Code />} />
        <Route path="code/:id" element={<CodeProblem />} />
        <Route path="planner" element={<Planner />} />
        <Route path="tracks" element={<Tracks />} />
        <Route path="projects" element={<Projects />} />
        <Route path="assess" element={<Assess />} />
        <Route path="debug" element={<DebugList />} />
        <Route path="debug/:id" element={<DebugExercise />} />
        <Route path="cs" element={<CsLearn />} />
        <Route path="cs/:id" element={<CsLesson />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
