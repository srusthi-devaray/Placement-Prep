import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, useToast } from '../ui.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (pw !== pw2) { setError('The two passwords do not match'); return; }
    setBusy(true);
    try { await api.post('/auth/reset', { token, password: pw }); toast('Password changed. Please log in.', 'success'); navigate('/login', { replace: true }); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-form" style={{ gridColumn: '1 / -1' }}>
        <div className="auth-card">
          <Link to="/" className="brand" style={{ color: 'var(--text)', marginBottom: 18 }}><span className="brand-logo"><Icon name="check" size={22} /></span>Placement Prep</Link>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Choose a new password</h1>
          {!token ? <p className="muted mt">This link is missing its token. Request a new reset email from the login page.</p> : (
            <form onSubmit={submit} className="mt">
              <div className="field"><label htmlFor="r-p1">New password</label><input id="r-p1" type="password" minLength={6} maxLength={72} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
              <div className="field"><label htmlFor="r-p2">Repeat password</label><input id="r-p2" type="password" minLength={6} maxLength={72} required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
              <div className="error-text" role="alert">{error}</div>
              <button className="btn primary lg block" disabled={busy}>{busy ? 'Saving...' : 'Change password'}</button>
            </form>
          )}
          <p className="small muted center mt"><Link to="/login">Back to login</Link></p>
        </div>
      </div>
    </div>
  );
}
