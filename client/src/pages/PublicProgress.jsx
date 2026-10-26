import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, Loading, Ring, fmtDate, todayStr } from '../ui.jsx';

// Public, read-only page. Only shows what the owner ticked; the server never sends anything else.
export default function PublicProgress() {
  const { token } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    document.title = 'Progress page';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = 'noindex, nofollow';
    api.get(`/public/${encodeURIComponent(token)}?today=${todayStr()}`).then(setD).catch((e) => setErr(e.message));
    return () => { meta.content = 'index, follow'; };
  }, [token]);

  return (
    <div className="public-wrap">
      <div className="card pad" style={{ maxWidth: 720, margin: '0 auto' }}>
        {err ? (
          <div className="center"><Icon name="shield" size={34} /><h2 className="mt-s">Page not available</h2><p className="muted">{err}</p><Link className="btn primary mt" to="/">Go to Placement Prep</Link></div>
        ) : !d ? <Loading /> : (
          <>
            <div className="row between"><div><h1 style={{ fontSize: 28, fontWeight: 800 }}>{d.name}</h1>{d.tagline && <p className="muted">{d.tagline}</p>}{d.targetRole && <span className="badge tone-violet">Aiming for: {d.targetRole}</span>}</div>
              {d.readiness && <div className="center"><Ring value={d.readiness.score} size={92} /><div className="tiny muted">readiness</div></div>}</div>
            {d.readiness && <p className="tiny muted mt-s">{d.readiness.note}</p>}
            <div className="grid g2 mt">
              {d.streak && <div className="card pad center"><Icon name="flame" size={22} /><div style={{ fontSize: 28, fontWeight: 800 }}>{d.streak.current}</div><div className="muted small">day streak (best {d.streak.longest})</div></div>}
              {d.hours && <div className="card pad center"><Icon name="clock" size={22} /><div style={{ fontSize: 28, fontWeight: 800 }}>{d.hours.last30Days}h</div><div className="muted small">studied in 30 days · {d.hours.activeDays} active days</div></div>}
              {d.coding && <div className="card pad center"><Icon name="code" size={22} /><div style={{ fontSize: 28, fontWeight: 800 }}>{d.coding.solved}/{d.coding.total}</div><div className="muted small">coding problems solved · {d.coding.acceptRate}% accepted</div></div>}
              {d.aptitude && <div className="card pad center"><Icon name="bars" size={22} /><div style={{ fontSize: 28, fontWeight: 800 }}>{d.aptitude.accuracy}%</div><div className="muted small">aptitude accuracy over {d.aptitude.questions} questions</div></div>}
              {d.mock && <div className="card pad center"><Icon name="mic" size={22} /><div style={{ fontSize: 28, fontWeight: 800 }}>{d.mock.sessions}</div><div className="muted small">mock interviews{d.mock.averageScore !== null ? ` · average ${d.mock.averageScore}/100` : ''}</div></div>}
            </div>
            {d.milestones && (
              <div className="mt"><b>Milestones</b>
                {d.milestones.length ? <div className="chips mt-s">{d.milestones.map((m) => <span key={m.title} className="chip hit">✓ {m.title}{m.date ? ` · ${fmtDate(m.date)}` : ''}</span>)}</div> : <p className="muted small">None yet.</p>}
              </div>
            )}
            {d.projects && (
              <div className="mt"><b>Projects</b>
                {d.projects.length ? d.projects.map((p) => (
                  <div key={p.title} className="card pad mt-s">
                    <b>{p.title}</b> <span className="badge">{p.status}</span>
                    {p.description && <p className="small muted">{p.description}</p>}
                    {p.techStack && p.techStack.length > 0 && <div className="chips">{p.techStack.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
                    <div className="row mt-s">{p.githubUrl && <a className="btn sm ghost" href={p.githubUrl} target="_blank" rel="noopener noreferrer nofollow">Code ↗</a>}{p.liveUrl && <a className="btn sm ghost" href={p.liveUrl} target="_blank" rel="noopener noreferrer nofollow">Live demo ↗</a>}</div>
                  </div>
                )) : <p className="muted small">No projects marked public.</p>}
              </div>
            )}
            {!d.shown.length && <p className="muted center">The owner has not chosen to show anything yet.</p>}
            <p className="tiny muted mt">Shared by the student themselves from Placement Prep. These numbers are self-tracked practice statistics, not verified results. Updated {new Date(d.updatedAt).toLocaleString()}.</p>
          </>
        )}
      </div>
    </div>
  );
}
