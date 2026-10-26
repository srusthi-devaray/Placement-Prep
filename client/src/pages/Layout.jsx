import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { api } from '../api.js';
import { Icon, todayStr } from '../ui.jsx';

const GROUPS = [
  { label: 'Overview', items: [{ to: '/app', end: true, icon: 'home', text: 'Dashboard' }] },
  {
    label: 'Prepare', items: [
      { to: '/app/planner', icon: 'compass', text: 'Study Planner', pill: 'NEW' },
      { to: '/app/progress', icon: 'calendar', text: 'Daily Progress' },
      { to: '/app/mock', icon: 'mic', text: 'Mock Interview', pill: 'LIVE' },
      { to: '/app/code', icon: 'code', text: 'Coding Practice', pill: 'NEW' },
      { to: '/app/assess', icon: 'clock', text: 'Timed Assessment', pill: 'NEW' },
      { to: '/app/debug', icon: 'code', text: 'Debugging Exercises', pill: 'NEW' },
      { to: '/app/cs', icon: 'book', text: 'CS Fundamentals', pill: 'NEW' },
      { to: '/app/aptitude', icon: 'bars', text: 'Aptitude Practice' },
      { to: '/app/notes', icon: 'book', text: 'Study Notes' },
      { to: '/app/goals', icon: 'target', text: 'Goal Tracker' }
    ]
  },
  {
    label: 'AI Career Tools', items: [
      { to: '/app/chatbot', icon: 'bot', text: 'PlaceBot Chat', pill: 'AI' },
      { to: '/app/resume', icon: 'file', text: 'Resume Analyzer' },
      { to: '/app/builder', icon: 'edit', text: 'Resume Builder' },
      { to: '/app/roadmap', icon: 'compass', text: 'Skill Roadmap' },
      { to: '/app/jobs', icon: 'briefcase', text: 'Jobs & Internships' },
      { to: '/app/tracks', icon: 'layers', text: 'Company Tracks' },
      { to: '/app/projects', icon: 'star', text: 'My Projects', pill: 'NEW' }
    ]
  },
  {
    label: 'Library', items: [
      { to: '/app/experiences', icon: 'users', text: 'Interview Experiences' },
      { to: '/app/knowledge', icon: 'layers', text: 'Knowledge Base' }
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  // Optional in-browser reminder (only if the student enabled it; shown at most once a day while the app is open).
  useEffect(() => {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !localStorage.getItem('pp_browser_reminders')) return;
      const today = todayStr();
      if (localStorage.getItem('pp_last_reminder') === today) return;
      api.get(`/plan/overview?today=${today}&tz=${new Date().getTimezoneOffset()}`).then((o) => {
        const open2 = o.todayTasks.filter((t) => !t.done).length + o.overdue.length;
        if (open2) { new Notification('Placement Prep', { body: `You have ${open2} study task${open2 > 1 ? 's' : ''} waiting today.` }); localStorage.setItem('pp_last_reminder', today); }
      }).catch(() => {});
    } catch { /* notifications unavailable */ }
  }, []);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-logo"><Icon name="check" size={22} /></span>
          Placement Prep
        </Link>
        <nav>
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon name={it.icon} size={19} />
                  {it.text}
                  {it.pill && <span className="pill">{it.pill}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="user-card">
            <span className="avatar">{(user?.username || '?')[0].toUpperCase()}</span>
            <div className="grow">
              <div className="nowrap-text" style={{ fontWeight: 700 }}>{user?.username}</div>
              <div className="nowrap-text tiny" style={{ opacity: 0.65 }}>{user?.email}</div>
            </div>
          </div>
          <button className="side-btn" onClick={toggle}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /> {theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <button className="side-btn logout" onClick={logout}><Icon name="logout" size={17} /> Logout</button>
        </div>
      </aside>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar">
          <button className="btn icon ghost" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" size={20} /></button>
          <strong>Placement Prep</strong>
        </div>
        <main id="main-content" className="content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
