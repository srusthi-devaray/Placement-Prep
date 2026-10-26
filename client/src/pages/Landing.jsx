import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { Icon, Ring, useToast } from '../ui.jsx';

const FEATURES = [
  { icon: 'bot', tone: 'indigo', title: 'PlaceBot AI Chat', isNew: true, text: 'Ask by voice or text. Attach screenshots, PDFs, resumes or even a video and get answers made for placement prep.', to: '/app/chatbot' },
  { icon: 'mic', tone: 'rose', title: 'Mock Interviews', isNew: true, text: 'Answer real questions and get live feedback on filler words, structure, pace and key concepts while you speak.', to: '/app/mock' },
  { icon: 'file', tone: 'cyan', title: 'Resume ATS Analyzer', text: 'Upload your resume and see your ATS score, missing keywords and exactly what to fix.', to: '/app/resume' },
  { icon: 'edit', tone: 'violet', title: 'Resume Builder + PDF', text: 'Build a clean one-page resume with live preview, AI rewriting and one-click PDF download.', to: '/app/builder' },
  { icon: 'compass', tone: 'green', title: 'Skill Gap Roadmap', text: 'Pick a target role and get a week-by-week plan based on the skills you already have.', to: '/app/roadmap' },
  { icon: 'briefcase', tone: 'amber', title: 'Job / Internship Match', text: 'Paste any job description and see your match percentage and missing skills.', to: '/app/jobs' },
  { icon: 'bars', tone: 'indigo', title: 'Aptitude Practice', text: 'Quant, logical and verbal questions with instant scoring and explanations.', to: '/app/aptitude' },
  { icon: 'layers', tone: 'cyan', title: 'Knowledge Assistant', text: 'Search placement topics and your own notes. The chatbot uses them to answer.', to: '/app/knowledge' },
  { icon: 'briefcase', tone: 'rose', title: 'Company Tracker', text: 'Move every application from Applied to Interview to Offer. Search and filter instantly.', to: '/app' },
  { icon: 'calendar', tone: 'violet', title: 'Daily Progress & Streaks', text: 'Log what you studied, build a streak and see your weekly hours.', to: '/app/progress' },
  { icon: 'users', tone: 'green', title: 'Interview Experiences', text: 'Save questions and lessons from every round so you never repeat a mistake.', to: '/app/experiences' },
  { icon: 'target', tone: 'amber', title: 'Goals & Notes', text: 'Set company-wise goals with deadlines and keep searchable study notes.', to: '/app/goals' }
];

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState('home');
  const [msg, setMsg] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  // Highlight the navbar link of the section you are looking at.
  useEffect(() => {
    const ids = ['home', 'features', 'about', 'contact'];
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    ids.map((id) => document.getElementById(id)).filter(Boolean).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const start = () => navigate(user ? '/app' : '/login?mode=register');
  const open = (to) => navigate(user ? to : '/login', { state: { from: to } });

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try { await api.post('/contact', msg); toast('Message sent. Thank you!', 'success'); setMsg({ name: '', email: '', message: '' }); }
    catch (err) { toast(err.message, 'error'); }
    setSending(false);
  };

  const link = (id, text) => <a href={`#${id}`} className={`link ${active === id ? 'active' : ''}`} onClick={() => setMenu(false)}>{text}</a>;

  return (
    <div>
      <header className="l-nav">
        <div className="l-nav-in">
          <a href="#home" className="brand"><span className="brand-logo"><Icon name="check" size={22} /></span>Placement Prep</a>
          <button className="btn icon ghost burger" aria-label="Menu" onClick={() => setMenu((m) => !m)}><Icon name="menu" size={20} /></button>
          <nav className={`l-links ${menu ? 'open' : ''}`}>
            {link('home', 'Home')}{link('features', 'Features')}{link('about', 'About')}{link('contact', 'Contact')}
            <button className="btn icon ghost" onClick={toggle} aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
            {user ? <Link to="/app" className="btn primary">Dashboard</Link> : <><Link to="/login" className="btn ghost">Login</Link><Link to="/login?mode=register" className="btn primary">Sign up free</Link></>}
          </nav>
        </div>
      </header>

      <section id="home" className="l-hero">
        <div>
          <span className="pill-tag"><Icon name="sparkles" size={15} /> New: AI chatbot + live mock interview feedback</span>
          <h1>Ace your <span className="grad-text">dream job</span> with a prep partner that never sleeps.</h1>
          <p className="lead">Track your preparation, chat with an AI coach by voice or text, practice mock interviews with real-time feedback, fix your resume and find the skills you are missing.</p>
          <div className="row">
            <button className="btn primary lg" onClick={start}>Get Started <Icon name="chevron" size={18} /></button>
            <a className="btn ghost lg" href="#features">See features</a>
          </div>
        </div>
        <div className="preview" aria-hidden="true">
          <div className="stack">
            <div className="msg user" style={{ margin: 0 }}><div className="av">S</div><div className="bubble">How should I answer "Tell me about yourself"?</div></div>
            <div className="msg bot" style={{ margin: 0 }}><div className="av"><Icon name="bot" size={18} /></div><div className="bubble">Use <b>Present - Past - Future</b> in 60-90 seconds: your degree and focus now, one project with a result, then the role you want and why.</div></div>
            <div className="card pad row between" style={{ boxShadow: 'none' }}>
              <div><div className="small muted">Resume ATS score</div><div style={{ fontWeight: 800, fontSize: 22 }}>86 / 100</div><span className="chip hit">Excellent</span></div>
              <Ring value={86} size={92} />
            </div>
          </div>
          <div className="float-card" style={{ right: -10, top: -22 }}><Icon name="flame" size={18} style={{ color: '#f59e0b' }} /> 12 day streak</div>
          <div className="float-card" style={{ left: -16, bottom: -20 }}><Icon name="mic" size={18} style={{ color: '#ef4444' }} /> Live feedback: great pace</div>
        </div>
      </section>

      <section id="features" className="l-section">
        <h2 className="title-xl">Everything you need to get placed</h2>
        <p className="sub-xl">Twelve tools in one place. Click any card to open it.</p>
        <div className="grid g4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {FEATURES.map((f) => (
            <button key={f.title} className="card hover feature" style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => open(f.to)}>
              <span className={`ico-chip tone-${f.tone}`}><Icon name={f.icon} size={21} /></span>
              <h3>{f.title}{f.isNew && <span className="badge-new">NEW</span>}</h3>
              <p>{f.text}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="band">
        <section className="l-section">
          <h2 className="title-xl">How it works</h2>
          <p className="sub-xl">From sign-up to offer letter in four steps.</p>
          <div className="grid g4">
            {[['Create your account', 'Free and private. Only you can see your data.'], ['Check your resume', 'Get an ATS score and the skills you are missing.'], ['Practice daily', 'Chat, mock interviews and aptitude with instant feedback.'], ['Track results', 'Follow every company from Applied to Offer.']].map(([t, d], i) => (
              <div key={t} className="center"><div className="step-no">{i + 1}</div><h3>{t}</h3><p className="muted small mt-s">{d}</p></div>
            ))}
          </div>
        </section>
      </div>

      <section id="about" className="l-section">
        <div className="grid g2" style={{ alignItems: 'center', gap: 40 }}>
          <div>
            <h2 className="title-xl" style={{ textAlign: 'left' }}>About Placement Prep</h2>
            <p className="muted mt" style={{ fontSize: 17 }}>Most prep platforms give you a list of questions and nothing else. Placement Prep keeps your whole journey in one place: what you studied, how you performed, where every application stands, and an AI coach that knows your notes and your resume.</p>
            <ul className="stack sm mt" style={{ listStyle: 'none', padding: 0 }}>
              {['Real-time feedback on filler words, pace, structure and keywords', 'STAR-method checker for behavioral questions', 'Resume ATS score with keyword matching against any job description', 'Works without an AI key (basic mode) and gets smarter with one'].map((t) => (
                <li key={t} className="row nowrap" style={{ alignItems: 'flex-start' }}><span className="ico-chip tone-green" style={{ width: 26, height: 26, borderRadius: 8 }}><Icon name="check" size={15} /></span><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="card pad stack">
            <div className="row between"><b>Live feedback preview</b><span className="chip hit">Score 81</span></div>
            <p className="small muted">"Um, basically I think maybe I built a project..."</p>
            {[['Content', 62, '#10b981'], ['Confidence', 40, '#f59e0b'], ['Fluency', 28, '#ef4444']].map(([l, v, c]) => (
              <div className="metric" key={l}><span>{l}</span><div className="track"><i style={{ width: `${v}%`, background: c }} /></div><b>{v}</b></div>
            ))}
            <ul className="tips"><li className="bad">Too many filler words: "um", "basically". Pause silently instead.</li></ul>
          </div>
        </div>
      </section>

      <div className="band">
        <section id="contact" className="l-section">
          <h2 className="title-xl">Contact</h2>
          <p className="sub-xl">Questions, feedback or feature ideas? Send a message.</p>
          <form className="card pad" style={{ maxWidth: 620, margin: '0 auto' }} onSubmit={send}>
            <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" required maxLength={100} value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" required value={msg.email} onChange={(e) => setMsg({ ...msg, email: e.target.value })} /></div>
            <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" required minLength={5} maxLength={3000} rows={5} value={msg.message} onChange={(e) => setMsg({ ...msg, message: e.target.value })} /></div>
            <button className="btn primary block" disabled={sending}><Icon name="send" size={16} /> {sending ? 'Sending...' : 'Send message'}</button>
          </form>
        </section>
      </div>

      <footer className="l-footer">
        <h3 style={{ fontWeight: 700 }}>Placement Prep</h3>
        <p>© 2026 All Rights Reserved</p>
      </footer>
    </div>
  );
}
