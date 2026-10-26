import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarChart, Empty, FormModal, Icon, Loading, Ring, StatCard, fmtDate, todayStr, useResource, useToast } from '../ui.jsx';

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLOR = { Applied: '#6366f1', Interview: '#f59e0b', Offer: '#10b981', Rejected: '#ef4444' };

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const companies = useResource('/companies');
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', role: '', status: 'Applied', date: todayStr() });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);

  const [plan, setPlan] = useState(null);
  const [csd, setCsd] = useState(null);
  const [code, setCode] = useState(null);
  const loadPlan = () => api.get(`/plan/overview?today=${todayStr()}&tz=${new Date().getTimezoneOffset()}`).then(setPlan).catch(() => setPlan(false));
  useEffect(() => { loadPlan(); api.get('/code/progress').then(setCode).catch(() => setCode(false)); api.get('/cs').then(setCsd).catch(() => setCsd(false)); }, []);
  const tick = async (t) => { try { await api.patch(`/plan/tasks/${t._id}/done?today=${todayStr()}`, { done: true }); loadPlan(); toast('Task done', 'success'); } catch (er) { toast(er.message, 'error'); } };

  const loadStats = () => api.get(`/stats?today=${todayStr()}&tz=${new Date().getTimezoneOffset()}`).then(setStats).catch((e) => setErr(e.message));
  useEffect(() => { loadStats(); }, []);

  const shown = useMemo(() => (companies.items || []).filter((c) => (!filter || c.status === filter) && `${c.name} ${c.role}`.toLowerCase().includes(q.toLowerCase())), [companies.items, q, filter]);

  const add = async (e) => {
    e.preventDefault();
    try { await companies.create(form); setForm({ ...form, name: '', role: '' }); toast('Company added', 'success'); loadStats(); } catch (er) { toast(er.message, 'error'); }
  };
  const changeStatus = async (c, status) => { try { await companies.update(c._id, { status }); loadStats(); } catch (er) { toast(er.message, 'error'); } };
  const remove = async (c) => { if (confirm(`Delete ${c.name}?`)) { try { await companies.remove(c._id); loadStats(); toast('Deleted'); } catch (er) { toast(er.message, 'error'); } } };

  if (err) return <Empty icon="shield" title="Could not load your dashboard">{err}</Empty>;
  if (!stats || !companies.items) return <Loading />;

  const s = stats;
  const goalPct = s.goalsDone + s.goalsOpen ? (s.goalsDone / (s.goalsDone + s.goalsOpen)) * 100 : 0;
  const parts = [
    ['Resume ATS score', s.resumeScore ?? 0, 25], ['Mock interviews', s.mockSessions ? s.avgMockScore : 0, 25], ['Aptitude accuracy', s.aptitudePercent, 15],
    ['Study streak (7 days = full)', Math.min(s.streak, 7) / 7 * 100, 15], ['Goals completed', goalPct, 10], ['Applications started', s.total ? 100 : 0, 10]
  ];
  const localReadiness = Math.round(parts.reduce((sum, [, v, w]) => sum + (v * w) / 100, 0));
  const readiness = plan && plan.readiness ? plan.readiness.score : localReadiness;
  const pipeline = STATUSES.map((st) => ({ st, n: { Applied: s.applied, Interview: s.interview, Offer: s.offer, Rejected: s.rejected }[st] }));

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="hero-card">
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <span className="hero-pill"><Icon name="flame" size={16} /> {s.streak} day{s.streak === 1 ? '' : 's'} study streak</span>
            <h1 style={{ marginTop: 14 }}>{greeting()}, {user.username} 👋</h1>
            <p>{s.streak ? `Keep it going${s.streakInfo && s.streakInfo.graceBanked ? ` (you have ${s.streakInfo.graceBanked} grace day${s.streakInfo.graceBanked > 1 ? 's' : ''} banked)` : ''} - any practice today counts.` : 'Log what you studied today to start your streak.'}</p>
            <div className="row" style={{ marginTop: 18 }}>
              <Link to="/app/chatbot" className="btn white"><Icon name="bot" size={17} /> Ask PlaceBot</Link>
              <Link to="/app/mock" className="btn glass"><Icon name="mic" size={17} /> Mock interview</Link>
              <Link to="/app/progress" className="btn glass"><Icon name="calendar" size={17} /> Log study</Link>
            </div>
          </div>
          <div className="center" style={{ background: 'rgba(255,255,255,.14)', padding: '16px 22px', borderRadius: 20 }} title="A practice-progress indicator, not a prediction of selection. Click to see exactly how it is calculated.">
            <div className="small" style={{ opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>Placement readiness</div>
            <Ring value={readiness} size={100} color="#fff" />
            <Link to="/app/planner?tab=insights" className="small" style={{ color: '#fff', opacity: 0.9, display: 'block', marginTop: 8 }}>How is this calculated?</Link>
          </div>
        </div>
      </div>

      <div className="grid g5">
        <StatCard icon="briefcase" tone="indigo" label="Total companies" value={s.total} />
        <StatCard icon="send" tone="cyan" label="Applied" value={s.applied} />
        <StatCard icon="users" tone="amber" label="Interview" value={s.interview} />
        <StatCard icon="award" tone="green" label="Offers" value={s.offer} />
        <StatCard icon="x" tone="rose" label="Rejected" value={s.rejected} />
      </div>

      <div className="grid g2">
        <div className="card pad">
          <div className="row between"><div className="card-title" style={{ margin: 0 }}><Icon name="calendar" size={19} /> Today's plan</div><Link to="/app/planner" className="btn sm ghost">Open planner</Link></div>
          {plan === null ? <Loading /> : !plan ? <p className="muted small mt">Could not load your plan.</p> : (
            <>
              {plan.overdue.length > 0 && <div className="notice-bar mt" role="status">{plan.overdue.length} unfinished task{plan.overdue.length > 1 ? 's' : ''} from earlier days. No stress - <Link to="/app/planner">move them to upcoming days</Link>.</div>}
              {plan.todayTasks.length ? plan.todayTasks.slice(0, 6).map((t) => (
                <div key={t._id} className={`list-item ${t.done ? 'done' : ''}`} style={{ padding: '10px 0' }}>
                  <input type="checkbox" aria-label={`Mark "${t.title}" done`} checked={t.done} disabled={t.done} onChange={() => tick(t)} style={{ marginTop: 4 }} />
                  <div className="grow"><div className="title">{t.link ? <Link to={t.link}>{t.title}</Link> : t.title}</div><div className="muted small">{t.minutes} min{t.reason ? ` · ${t.reason}` : ''}</div></div>
                </div>
              )) : <p className="muted small mt">Nothing planned for today. <Link to="/app/planner">Generate a weekly plan</Link> from your weak topics and target company.</p>}
            </>
          )}
        </div>
        <div className="card pad">
          <div className="row between"><div className="card-title" style={{ margin: 0 }}><Icon name="code" size={19} /> Coding practice</div><Link to="/app/code" className="btn sm ghost">Practice</Link></div>
          {code === null ? <Loading /> : !code ? <p className="muted small mt">Coding stats are unavailable right now.</p> : (
            <>
              <div className="row mt" style={{ gap: 18 }}>
                <Ring value={code.total ? (code.solved / code.total) * 100 : 0} size={84} label={`${code.solved}/${code.total}`} />
                <div><b style={{ fontSize: 20 }}>{code.solved}</b> solved<div className="muted small">{code.submissions} submissions · {code.accuracy}% accepted</div></div>
              </div>
              <div className="small muted mt">Revision queue {code.revision.length ? `(${code.revision.length})` : ''}</div>
              {code.revision.length ? code.revision.slice(0, 4).map((r) => (
                <Link key={r.id} to={`/app/code/${r.id}`} className="list-item" style={{ padding: '8px 0', color: 'inherit' }}><div className="grow"><div className="title">{r.title}</div><div className="muted small">{r.topic} · {r.wrongAttempts} wrong attempt{r.wrongAttempts === 1 ? '' : 's'}</div></div><Icon name="chevron" size={15} /></Link>
              )) : <p className="muted small">Nothing to revise. Problems you fail will appear here.</p>}
            </>
          )}
        </div>
      </div>

      <div className="card pad mb">
        <div className="row between"><div className="card-title" style={{ margin: 0 }}><Icon name="book" size={19} /> CS Fundamentals</div><Link to="/app/cs" className="btn sm ghost">Open</Link></div>
        {csd === null ? <p className="muted small mt">Loading...</p> : !csd ? <p className="muted small mt">Not available right now.</p> : (
          <div className="row between mt" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div className="small"><b>{csd.stats.lessonsRead}/{csd.stats.totalLessons}</b> lessons read · {csd.stats.questions ? <><b>{csd.stats.accuracy}%</b> quiz accuracy</> : 'no quizzes taken yet'}{csd.mistakeCount ? ` · ${csd.mistakeCount} to revise` : ''}</div>
            {csd.next && <Link className="btn sm primary" to={`/app/cs/${csd.next.id}`}>Next: {csd.next.title}</Link>}
          </div>
        )}
      </div>

      <div className="grid g2">
        <div className="card pad">
          <div className="card-title"><Icon name="bars" size={19} /> Study hours - last 7 days</div>
          <BarChart data={s.week.map((d) => ({ label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }), value: d.hours }))} unit="h" />
          <div className="legend"><span><b>{+s.totalHours.toFixed(1)}</b> hours total</span><span><b>{s.topicsDone}</b> topics completed</span></div>
        </div>
        <div className="card pad">
          <div className="card-title"><Icon name="trending" size={19} /> Your progress</div>
          <div className="stack sm">
            {[['Mock interview average', s.mockSessions ? `${s.avgMockScore}/100` : 'not started', s.avgMockScore, 'mic'], ['Aptitude accuracy', s.aptitudeAttempts ? `${s.aptitudePercent}%` : 'not started', s.aptitudePercent, 'bars'], ['Resume ATS score', s.resumeScore === null ? 'not analyzed' : `${s.resumeScore}/100`, s.resumeScore || 0, 'file'], ['Goals completed', `${s.goalsDone}/${s.goalsDone + s.goalsOpen}`, goalPct, 'target']].map(([l, t, v, ic]) => (
              <div key={l}>
                <div className="row between small"><span className="row" style={{ gap: 8 }}><Icon name={ic} size={15} /> {l}</span><b>{t}</b></div>
                <div className="progress-bar" style={{ height: 8, marginTop: 6 }}><i style={{ width: `${Math.min(100, v)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="small muted mt">Readiness score: <Link to="/app/planner?tab=insights">see every component, its evidence and the limitations</Link>.</p>
        </div>
      </div>

      <div className="grid g4">
        {[['bot', 'indigo', 'PlaceBot Chat', 'Ask anything, attach files', '/app/chatbot'], ['file', 'cyan', 'Resume Analyzer', 'Get your ATS score', '/app/resume'], ['compass', 'green', 'Skill Roadmap', 'Find your skill gaps', '/app/roadmap'], ['briefcase', 'amber', 'Job Match', 'Match a job description', '/app/jobs']].map(([ic, tone, t, sub, to]) => (
          <Link key={to} to={to} className="card hover quick"><span className={`ico-chip tone-${tone}`}><Icon name={ic} size={20} /></span><div><b>{t}</b><span className="sub">{sub}</span></div></Link>
        ))}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="briefcase" size={19} /> Application pipeline</div>
        {s.total ? (
          <>
            <div className="pipeline">{pipeline.map((p) => <i key={p.st} style={{ width: `${(p.n / s.total) * 100}%`, background: STATUS_COLOR[p.st] }} />)}</div>
            <div className="legend">{pipeline.map((p) => <span key={p.st}><span className="dot" style={{ background: STATUS_COLOR[p.st] }} />{p.st} <b>{p.n}</b></span>)}</div>
          </>
        ) : <p className="muted">No applications yet. Add your first company below.</p>}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="plus" size={19} /> Add company</div>
        <form className="form-row" onSubmit={add}>
          <div><input placeholder="Company name" aria-label="Company name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><input placeholder="Role (optional)" aria-label="Role" maxLength={120} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          <div><select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><input type="date" aria-label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <button className="btn success">Add</button>
        </form>
      </div>

      <div>
        <div className="toolbar">
          <input placeholder="Search companies..." aria-label="Search companies" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.length ? shown.map((c) => (
                <tr key={c._id}>
                  <td><b>{c.name}</b>{c.notes && <div className="muted small">{c.notes.slice(0, 70)}</div>}</td>
                  <td>{c.role || '-'}</td>
                  <td><select className={`status-sel ${c.status}`} aria-label={`Status of ${c.name}`} value={c.status} onChange={(e) => changeStatus(c, e.target.value)}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></td>
                  <td>{fmtDate(c.date)}</td>
                  <td><div className="row" style={{ gap: 6 }}><button className="btn sm ghost" onClick={() => setEditing(c)}>Edit</button><button className="btn sm danger" onClick={() => remove(c)}>Delete</button></div></td>
                </tr>
              )) : <tr><td colSpan={5}><Empty icon="briefcase" title={companies.items.length ? 'No matches' : 'No companies yet'}>{companies.items.length ? 'Try a different search.' : 'Add the first company you applied to.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <FormModal title="Edit company" values={editing} onClose={() => setEditing(null)}
          onSubmit={async (d) => { await companies.update(editing._id, d); loadStats(); }}
          fields={[{ name: 'name', label: 'Company', required: true }, { name: 'role', label: 'Role' }, { name: 'status', label: 'Status', type: 'select', options: STATUSES }, { name: 'date', label: 'Date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Recruiter, package, next steps...' }]} />
      )}
    </div>
  );
}
