import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from 'react-router-dom';
import { Icon, Loading, PageHeader, Ring, useToast } from '../ui.jsx';
import { useAuth } from '../auth.jsx';

const STATUS = { learn: ['Learn', 'indigo'], partial: ['Partly known', 'amber'], revise: ['Revise', 'green'] };

export default function Roadmap() {
  const toast = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = useState(null);
  const [roleId, setRoleId] = useState((user && user.targetRole) || 'fullstack');
  const [hours, setHours] = useState(10);
  const [weeks, setWeeks] = useState(12);
  const [extra, setExtra] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/skills/roles').then(setRoles).catch((e) => toast(e.message, 'error')); }, [toast]);

  const run = async () => {
    setBusy(true);
    try {
      const extraSkills = extra.split(',').map((s) => s.trim()).filter(Boolean);
      setRes(await api.post('/skills/gap', { roleId, hoursPerWeek: Number(hours), targetWeeks: Number(weeks), extraSkills }));
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const addGoal = async (p, i) => {
    try { await api.post('/goals', { title: `${res.role.title} roadmap: ${p.title} (${p.weeks} wk)`, company: '' }); toast(`Added phase ${i + 1} as a goal`, 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (!roles) return <Loading />;
  const current = roles.find((r) => r.id === roleId);

  return (
    <>
      <PageHeader icon="map" title="Skill Gap & Roadmap" subtitle="Pick a target role. We compare it with the skills in your latest resume and build a week-by-week plan." />
      <div className="card pad mb">
        <div className="form-row">
          <div><label htmlFor="rm-role">Target role</label><select id="rm-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
          <div><label htmlFor="rm-h">Hours per week</label><input id="rm-h" type="number" min="2" max="60" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
          <div><label htmlFor="rm-w">Weeks until placements</label><input id="rm-w" type="number" min="0" max="104" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div>
        </div>
        {current && <p className="muted small mt-s">{current.description}</p>}
        <div className="field mt"><label htmlFor="rm-x">Other skills you know (comma separated, optional)</label><input id="rm-x" placeholder="e.g. Docker, Figma" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
        <button className="btn primary mt-s" onClick={run} disabled={busy}>{busy ? 'Building...' : 'Build my roadmap'}</button>
      </div>

      {res && (
        <>
          <div className="grid g2 mb">
            <div className="card pad">
              <div className="row nowrap" style={{ gap: 18 }}>
                <Ring value={res.percent} size={104} />
                <div><h3>{res.role.title}</h3><p className="muted small">{res.have.length} of {res.have.length + res.missing.length} core skills covered{res.fromResume ? ' (from your resume)' : ''}</p>
                  {!res.fromResume && <p className="small" style={{ color: 'var(--warn, #b45309)' }}>No resume analysed yet. Use Resume Analyzer for accurate results.</p>}</div>
              </div>
              <div className="small muted mt">You have</div>
              <div className="chips">{res.have.length ? res.have.map((s) => <span key={s} className="chip hit">✓ {s}</span>) : <span className="muted small">Nothing yet</span>}</div>
              <div className="small muted mt">Missing core skills</div>
              <div className="chips">{res.missing.length ? res.missing.map((s) => <span key={s} className="chip miss">{s}</span>) : <span className="muted small">None. Great!</span>}</div>
              {res.niceMissing.length > 0 && <><div className="small muted mt">Nice to have</div><div className="chips">{res.niceMissing.map((s) => <span key={s} className="chip">{s}</span>)}</div></>}
            </div>
            <div className="card pad">
              <div className="card-title"><Icon name="clock" size={18} /> Time needed</div>
              <div className="big-score" style={{ fontSize: 52 }}>{res.totalWeeks}<span className="muted" style={{ fontSize: 20 }}> weeks</span></div>
              <p className="muted">at {res.hoursPerWeek} hours per week</p>
              {res.fitsDeadline !== null && (
                <p style={{ fontWeight: 600, color: res.fitsDeadline ? '#059669' : '#dc2626' }}>
                  {res.fitsDeadline ? `✓ Fits your ${res.targetWeeks} week deadline.` : `Needs about ${res.totalWeeks - res.targetWeeks} more weeks than your ${res.targetWeeks} week deadline. Increase weekly hours or focus on the first phases.`}
                </p>
              )}
            </div>
          </div>

          <div className="card pad mb">
            <div className="card-title"><Icon name="target" size={18} /> Based on your practice</div>
            {res.practiceFocus.length ? (
              <>
                <p className="small muted">Weak spots found from your real coding, aptitude, CS quiz and mock results. Work on these alongside the roadmap phases.</p>
                {res.practiceFocus.map((f, i) => <div key={i} className="list-item"><div className="grow"><b>{f.topic}</b> <span className="badge">{f.area}</span><div className="small muted">{f.reason}</div></div><Link className="btn sm ghost" to={f.link}>Practise</Link></div>)}
              </>
            ) : <p className="small muted">No weak spots detected yet. This section fills in after you solve problems, take quizzes and do mock interviews.</p>}
            {res.fromProjects && res.fromProjects.length > 0 && <p className="tiny muted mt-s">Skills counted from your saved projects: {res.fromProjects.join(', ')}.</p>}
          </div>
          <div className="timeline">
            {res.roadmap.map((p, i) => (
              <div key={p.title} className={`card phase ${p.status}`}>
                <div className="row between">
                  <h3 style={{ fontSize: 18 }}>{i + 1}. {p.title}</h3>
                  <span className="row" style={{ gap: 8 }}><span className={`badge tone-${STATUS[p.status][1]}`}>{STATUS[p.status][0]}</span><span className="badge">{p.weeks} wk</span></span>
                </div>
                {p.toLearn.length > 0 && <div className="chips mt-s">{p.toLearn.map((s) => <span key={s} className="chip miss">{s}</span>)}</div>}
                {p.knownSkills.length > 0 && <div className="chips mt-s">{p.knownSkills.map((s) => <span key={s} className="chip hit">✓ {s}</span>)}</div>}
                <ul>{p.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                <div className="row mt">
                  {p.resources.map((r) => <a key={r.url} className="btn sm ghost" href={r.url} target="_blank" rel="noopener noreferrer">{r.name} <Icon name="external" size={13} /></a>)}
                  <span className="grow" />
                  <button className="btn sm primary" onClick={() => addGoal(p, i)}><Icon name="plus" size={14} /> Add as goal</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
