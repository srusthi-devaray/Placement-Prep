import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { Icon } from '../ui.jsx';

export default function AuthPage() {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [info, setInfo] = useState('');
  useEffect(() => { api.get('/auth/config').then((c) => setCanReset(!!c.passwordReset)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (user) return <Navigate to={location.state?.from || '/app'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    if (mode === 'forgot') {
      try { const r = await api.post('/auth/forgot', { email: form.email }); setInfo(r.message); } catch (err) { setError(err.message); }
      setBusy(false); return;
    }
    try {
      await authenticate(mode, mode === 'login' ? { username: form.username, password: form.password } : form);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Link to="/" className="brand"><span className="brand-logo"><Icon name="check" size={22} /></span>Placement Prep</Link>
        <div>
          <h2>Your complete placement preparation companion.</h2>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 22 }}>
            {['AI chatbot that answers by voice or text, with files, images and videos', 'Mock interviews with real-time feedback', 'Resume ATS analyzer and PDF resume builder', 'Skill-gap roadmap and job match score', 'Track every company, goal and study streak'].map((t) => (
              <li key={t} className="row nowrap" style={{ alignItems: 'flex-start' }}><Icon name="check" size={18} style={{ marginTop: 3 }} /> <span>{t}</span></li>
            ))}
          </ul>
        </div>
        <p className="small" style={{ opacity: 0.7 }}>Built for students preparing for campus placements.</p>
      </div>

      <div className="auth-form">
        <div className="auth-card">
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em' }}>{mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : 'Create your account'}</h1>
          <p className="muted" style={{ margin: '6px 0 22px' }}>{mode === 'login' ? 'Log in to continue your preparation.' : mode === 'forgot' ? 'Enter your account email and we will send a reset link.' : 'Free, takes less than a minute.'}</p>
          {mode !== 'forgot' && <div className="seg">
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Login</button>
            <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(''); }}>Register</button>
          </div>}
          <form onSubmit={submit}>
            {mode === 'forgot' ? (
              <div className="field">
                <label htmlFor="a-femail">Email</label>
                <input id="a-femail" type="email" value={form.email} onChange={set('email')} required autoComplete="email" autoFocus />
              </div>
            ) : (<>
            <div className="field">
              <label htmlFor="a-user">{mode === 'login' ? 'Username or email' : 'Username'}</label>
              <input id="a-user" value={form.username} onChange={set('username')} required autoComplete="username" autoFocus />
            </div>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="a-email">Email</label>
                <input id="a-email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
              </div>
            )}
            <div className="field">
              <label htmlFor="a-pass">Password</label>
              <input id="a-pass" type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            </>)}
            <div className="error-text" role="alert">{error}</div>
            {info && <div className="small" role="status" style={{ color: 'var(--success, #059669)', marginBottom: 10 }}>{info}</div>}
            <button className="btn primary lg block" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'forgot' ? 'Send reset link' : 'Create account'}</button>
          </form>
          {mode === 'login' && canReset && <p className="small center mt"><button type="button" className="linklike" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>Forgot your password?</button></p>}
          {mode === 'forgot' && <p className="small center mt"><button type="button" className="linklike" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Back to login</button></p>}
          <p className="small muted center mt"><Link to="/">Back to home</Link></p>
        </div>
      </div>
    </div>
  );
}
