import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarChart, Icon, Loading, PageHeader, Ring, StatCard, fmtDate, scoreColor, todayStr, useToast } from '../ui.jsx';

const TABS = [['plan', 'Plan', 'calendar'], ['insights', 'Insights & readiness', 'trending'], ['reports', 'Reports', 'bars'], ['milestones', 'Milestones', 'award'], ['settings', 'Settings & sharing', 'shield']];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = ['coding', 'aptitude', 'revision', 'mock', 'cs', 'behavioral', 'resume', 'other'];
const KIND_TONE = { coding: 'indigo', aptitude: 'amber', revision: 'rose', mock: 'violet', cs: 'cyan', behavioral: 'green', resume: 'cyan', other: 'slate' };
const tz = () => new Date().getTimezoneOffset();
const addDays = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return new Date(x - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

export default function Planner() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t[0] === params.get('tab')) ? params.get('tab') : 'plan';
  return (
    <>
      <PageHeader icon="calendar" title="Study Planner" subtitle="Plans built from your own practice results, adaptive revision, fair streaks and honest progress reports." />
      <div className="tabs" role="tablist" aria-label="Planner sections">
        {TABS.map(([id, label, ic]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setParams({ tab: id })}><Icon name={ic} size={15} /> {label}</button>)}
      </div>
      {tab === 'plan' && <PlanTab />}
      {tab === 'insights' && <InsightsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'milestones' && <MilestonesTab />}
      {tab === 'settings' && <SettingsTab />}
    </>
  );
}

/* ------------------------------ PLAN ------------------------------ */
function PlanTab() {
  const toast = useToast();
  const today = todayStr();
  const [start, setStart] = useState(today);
  const [tasks, setTasks] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [busy, setBusy] = useState('');
  const [nt, setNt] = useState({ title: '', date: today, kind: 'other', minutes: 30 });
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, ov, st] = await Promise.all([
        api.get(`/plan/tasks?from=${start}&to=${addDays(start, 6)}&today=${today}`),
        api.get(`/plan/overview?today=${today}&tz=${tz()}`),
        api.get('/plan/settings')
      ]);
      setTasks(list); setOverdue(ov.overdue); setSettings(st.settings);
    } catch (e) { toast(e.message, 'error'); setTasks([]); }
  }, [start, today, toast]);
  useEffect(() => { load(); }, [load]);

  const generate = async (days) => {
    setBusy('gen');
    try {
      const r = await api.post('/plan/generate', { today: start, days });
      toast(r.created ? `Added ${r.created} tasks${r.usedTrack ? ` (${r.usedTrack} track)` : ''}` : 'Nothing to add - your days are already full or no study days are selected.', r.created ? 'success' : 'info');
      load();
    } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const resched = async () => {
    setBusy('re');
    try { const r = await api.post('/plan/reschedule', { today }); toast(r.moved ? `Moved ${r.moved} task${r.moved > 1 ? 's' : ''} to upcoming study days` : 'No missed tasks', 'success'); load(); } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const toggle = async (t) => {
    try { const r = await api.patch(`/plan/tasks/${t._id}/done?today=${today}`, { done: !t.done }); if (r.next) toast(`Nice! A short review is scheduled for ${fmtDate(r.next.date)}.`, 'success'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (t) => { if (!confirm(`Delete "${t.title}"?`)) return; try { await api.del(`/plan/tasks/${t._id}`); load(); } catch (e) { toast(e.message, 'error'); } };
  const addTask = async (e) => {
    e.preventDefault();
    try { await api.post('/plan/tasks', { ...nt, minutes: Number(nt.minutes) || 30 }); setNt({ ...nt, title: '' }); load(); toast('Task added', 'success'); } catch (er) { toast(er.message, 'error'); }
  };

  if (!tasks || !settings) return <Loading />;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rest = (d) => !settings.studyDays.includes(new Date(`${d}T00:00:00`).getDay());

  return (
    <div className="stack">
      {overdue.length > 0 && (
        <div className="notice-bar" role="status">
          <span>{overdue.length} task{overdue.length > 1 ? 's were' : ' was'} not finished. That is okay - plans change.</span>
          <button className="btn sm primary" onClick={resched} disabled={busy === 're'}>{busy === 're' ? 'Moving...' : 'Move to upcoming days'}</button>
        </div>
      )}
      <div className="card pad">
        <div className="row between">
          <div className="small muted">Target: <b>{settings.targetCompany ? settings.targetCompany[0].toUpperCase() + settings.targetCompany.slice(1) : 'not set'}</b> · {settings.hoursPerDay} h/day · <Link to="/app/planner?tab=settings">change</Link></div>
          <div className="row">
            <button className="btn primary" onClick={() => generate(7)} disabled={!!busy}>{busy === 'gen' ? 'Planning...' : 'Generate 7-day plan'}</button>
            <button className="btn ghost" onClick={() => generate(14)} disabled={!!busy}>14 days</button>
          </div>
        </div>
        <p className="small muted mt-s">Plans are built from your weak topics, repeated mistakes, target company track and available hours. Every task says why it is there. Your own tasks are never removed when you regenerate.</p>
        <div className="row mt">
          <button className="btn sm ghost" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week"><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
          <b>{fmtDate(days[0])} - {fmtDate(days[6])}</b>
          <button className="btn sm ghost" onClick={() => setStart(addDays(start, 7))} aria-label="Next week"><Icon name="chevron" size={14} /></button>
          {start !== today && <button className="btn sm ghost" onClick={() => setStart(today)}>Today</button>}
        </div>
      </div>

      <div className="grid g2">
        {days.map((d) => {
          const list = tasks.filter((t) => t.date === d);
          const mins = list.reduce((s, t) => s + t.minutes, 0);
          return (
            <div key={d} className="card pad" style={d === today ? { outline: '2px solid var(--primary)' } : undefined}>
              <div className="row between"><b>{dayLabel(d)}{d === today ? ' (today)' : ''}</b><span className="muted small">{list.filter((t) => t.done).length}/{list.length} done · {mins} min</span></div>
              {rest(d) && !list.length ? <p className="muted small mt-s">Rest day. Streaks are not affected.</p> : list.length ? list.map((t) => (
                <div key={t._id} className={`list-item ${t.done ? 'done' : ''}`} style={{ padding: '10px 0' }}>
                  <input type="checkbox" aria-label={`Mark "${t.title}" ${t.done ? 'not done' : 'done'}`} checked={t.done} onChange={() => toggle(t)} style={{ marginTop: 4 }} />
                  <div className="grow">
                    <div className="title">{t.link ? <Link to={t.link}>{t.title}</Link> : t.title}</div>
                    <div className="row small muted" style={{ gap: 6 }}>
                      <span className={`badge tone-${KIND_TONE[t.kind] || 'slate'}`}>{t.kind}</span><span>{t.minutes} min</span>
                      {t.movedFrom && <span>· moved from {fmtDate(t.movedFrom)}</span>}
                      {t.step > 0 && <span>· review #{t.step}</span>}
                    </div>
                    {t.reason && <div className="tiny muted">Why: {t.reason}</div>}
                  </div>
                  <button className="btn sm danger" aria-label={`Delete ${t.title}`} onClick={() => remove(t)}><Icon name="x" size={14} /></button>
                </div>
              )) : <p className="muted small mt-s">Nothing planned.</p>}
            </div>
          );
        })}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="plus" size={18} /> Add your own task</div>
        <form className="form-row" onSubmit={addTask}>
          <div style={{ flex: 3 }}><input aria-label="Task title" placeholder="e.g. Revise normalization" required maxLength={200} value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} /></div>
          <div><input type="date" aria-label="Date" required value={nt.date} onChange={(e) => setNt({ ...nt, date: e.target.value })} /></div>
          <div><select aria-label="Type" value={nt.kind} onChange={(e) => setNt({ ...nt, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><input type="number" min={5} max={600} step={5} aria-label="Minutes" value={nt.minutes} onChange={(e) => setNt({ ...nt, minutes: e.target.value })} /></div>
          <button className="btn success">Add</button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------ INSIGHTS ------------------------------ */
function InsightsTab() {
  const toast = useToast();
  const [weak, setWeak] = useState(null);
  const [rd, setRd] = useState(null);
  useEffect(() => {
    Promise.all([api.get('/plan/weak'), api.get(`/plan/readiness?today=${todayStr()}&tz=${tz()}`)]).then(([w, r]) => { setWeak(w); setRd(r); }).catch((e) => toast(e.message, 'error'));
  }, [toast]);
  if (!weak || !rd) return <Loading />;
  const conf = { low: 'Low confidence (little data)', medium: 'Medium confidence' };
  return (
    <div className="stack">
      <div className="card pad">
        <div className="row" style={{ gap: 22, alignItems: 'flex-start' }}>
          <Ring value={rd.score} size={120} />
          <div className="grow" style={{ minWidth: 240 }}>
            <h2>Readiness: {rd.score}/100</h2>
            <p className="muted small">Based on {rd.withData} of {rd.total} components that have data. It measures your practice inside this app. It does not predict whether you will be selected.</p>
          </div>
        </div>
        <div className="stack sm mt">
          {rd.components.map((c) => (
            <div key={c.key}>
              <div className="row between small"><b>{c.label} <span className="muted">(weight {c.weight}%)</span></b><span>{c.value === null ? 'no data yet' : `${c.value}/100 → ${c.points} pts`}</span></div>
              <div className="progress-bar" style={{ height: 8, marginTop: 5 }}><i style={{ width: `${c.value || 0}%`, background: c.value === null ? 'var(--line)' : scoreColor(c.value) }} /></div>
              <div className="tiny muted">{c.evidence} · {conf[c.confidence]}{c.value === null || c.value < 60 ? ` · Tip: ${c.tip}` : ''}</div>
            </div>
          ))}
        </div>
        <details className="mt small"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Limitations of this score</summary>
          <ul style={{ paddingLeft: 18, margin: '8px 0 0' }}>{rd.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </details>
      </div>

      <div className="grid g2">
        <div className="card pad">
          <div className="card-title"><Icon name="alert" size={18} /> Weak areas (from your results)</div>
          {weak.areas.length ? weak.areas.map((a, i) => <div key={i} className="list-item" style={{ padding: '10px 0' }}><span className="badge tone-rose">{a.area}</span><div className="grow"><b>{a.topic}</b><div className="muted small">{a.reason}</div></div></div>)
            : <p className="muted small">No weak areas found yet. Weak spots appear after about 3 attempts in a topic.</p>}
        </div>
        <div className="card pad">
          <div className="card-title"><Icon name="sparkles" size={18} /> Recommendations</div>
          {weak.recommendations.map((r, i) => <div key={i} className="list-item" style={{ padding: '10px 0' }}><div className="grow">{r.text}</div>{r.link && <Link className="btn sm ghost" to={r.link}>Go</Link>}</div>)}
          <p className="tiny muted mt">Rule-based suggestions from your submissions and test answers. They are not AI guesses.</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ REPORTS ------------------------------ */
function csvOf(r) {
  const rows = [['Placement Prep progress report'], ['Period', `${r.from} to ${r.to}`], ['Study hours', r.studyHours], ['Active days', `${r.activeDays} of ${r.plannedStudyDays} planned study days`],
    ['Planned tasks done', `${r.tasks.done}/${r.tasks.planned}`], ['Coding problems solved', r.coding.solved], ['Coding submissions (accepted)', `${r.coding.submissions} (${r.coding.accepted})`],
    ['Aptitude questions / accuracy', `${r.aptitude.questions} / ${r.aptitude.accuracy}%`], ['Mock interviews / average', `${r.mock.sessions} / ${r.mock.avgScore ?? '-'}`], ['Readiness', `${r.readiness.score}/100 (indicator only)`], [],
    ['Date', 'Hours', 'Tasks done', 'Submissions', 'Active'], ...r.series.map((s) => [s.date, s.hours, s.tasksDone, s.submissions, s.active ? 'yes' : 'no']), [], ['Weak areas'], ...r.weakAreas.map((w) => [w.topic, w.reason]), [], ['Recommendations'], ...r.recommendations.map((x) => [x.text]), [], [r.note]];
  return rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function ReportsTab() {
  const toast = useToast();
  const [period, setPeriod] = useState('week');
  const [r, setR] = useState(null);
  useEffect(() => { setR(null); api.get(`/plan/report?period=${period}&today=${todayStr()}&tz=${tz()}`).then(setR).catch((e) => toast(e.message, 'error')); }, [period, toast]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([csvOf(r)], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `progress-report-${r.period}-${r.to}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="stack print-area">
      <div className="row between no-print">
        <div className="seg" style={{ maxWidth: 260 }}><button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>Last 7 days</button><button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Last 30 days</button></div>
        {r && <div className="row"><button className="btn ghost" onClick={download}><Icon name="download" size={16} /> Download CSV</button><button className="btn ghost" onClick={() => window.print()}><Icon name="file" size={16} /> Print / save as PDF</button></div>}
      </div>
      {!r ? <Loading /> : (
        <>
          <h2 className="print-only">Placement Prep progress report: {r.from} to {r.to}</h2>
          <div className="grid g4">
            <StatCard icon="clock" tone="indigo" label="Study hours" value={r.studyHours} hint={`previous period: ${r.previousStudyHours}`} />
            <StatCard icon="flame" tone="amber" label="Active days" value={`${r.activeDays}/${r.plannedStudyDays}`} hint="of planned study days" />
            <StatCard icon="check" tone="green" label="Planned tasks done" value={`${r.tasks.done}/${r.tasks.planned}`} />
            <StatCard icon="code" tone="cyan" label="Problems solved" value={r.coding.solved} hint={`${r.coding.accepted}/${r.coding.submissions} accepted`} />
          </div>
          <div className="grid g2">
            <div className="card pad"><div className="card-title"><Icon name="bars" size={18} /> Study hours per day</div>
              <BarChart data={r.series.map((d) => ({ label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, period === 'week' ? { weekday: 'short' } : { day: 'numeric' }), value: d.hours }))} unit="h" />
              <p className="tiny muted mt-s">Only hours logged in Daily Progress are counted here.</p></div>
            <div className="card pad"><div className="card-title"><Icon name="trending" size={18} /> This period</div>
              <ul className="plain-list">
                <li>Aptitude: <b>{r.aptitude.questions}</b> questions, <b>{r.aptitude.accuracy}%</b> accuracy ({r.aptitude.tests} tests)</li>
                <li>Mock interviews: <b>{r.mock.sessions}</b>{r.mock.avgScore !== null && <>, average <b>{r.mock.avgScore}/100</b></>}</li>
                <li>Readiness now: <b>{r.readiness.score}/100</b> (indicator only)</li>
                {r.byCategory.length > 0 && <li>Hours by category: {r.byCategory.map((c) => `${c.name} ${c.hours}h`).join(', ')}</li>}
                {r.milestonesAchieved.length > 0 && <li>Milestones reached: {r.milestonesAchieved.join('; ')}</li>}
              </ul>
            </div>
          </div>
          <div className="grid g2">
            <div className="card pad"><div className="card-title"><Icon name="alert" size={18} /> Focus next</div>
              {r.weakAreas.length ? r.weakAreas.map((w, i) => <div key={i} className="small" style={{ padding: '6px 0' }}><b>{w.topic}</b>: {w.reason}</div>) : <p className="muted small">No weak areas detected yet.</p>}</div>
            <div className="card pad"><div className="card-title"><Icon name="sparkles" size={18} /> Recommendations</div>
              {r.recommendations.map((x, i) => <div key={i} className="small" style={{ padding: '6px 0' }}>{x.text}</div>)}</div>
          </div>
          <p className="tiny muted">{r.note}</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------ MILESTONES ------------------------------ */
function MilestonesTab() {
  const toast = useToast();
  const [ms, setMs] = useState(null);
  useEffect(() => { api.get(`/plan/milestones?today=${todayStr()}&tz=${tz()}`).then(setMs).catch((e) => toast(e.message, 'error')); }, [toast]);
  if (!ms) return <Loading />;
  return (
    <>
      <p className="muted small mb">{ms.filter((m) => m.achieved).length} of {ms.length} milestones reached.</p>
      <div className="grid gfill">
        {ms.map((m) => (
          <div key={m.id} className="card pad" style={m.achieved ? { borderColor: 'var(--primary)' } : undefined}>
            <div className="row between nowrap"><b>{m.title}</b>{m.achieved && <span className="badge tone-green"><Icon name="check" size={12} /> Done</span>}</div>
            <div className="progress-bar mt-s" style={{ height: 8 }}><i style={{ width: `${(m.current / m.target) * 100}%` }} /></div>
            <div className="tiny muted mt-s">{m.current}/{m.target}{m.date ? ` · reached ${fmtDate(m.date)}` : ''}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------ SETTINGS + SHARING ------------------------------ */
function SettingsTab() {
  const toast = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [share, setShare] = useState(null);
  const [pw, setPw] = useState('');

  const load = useCallback(async () => {
    try { const [s, sh] = await Promise.all([api.get('/plan/settings'), api.get('/share')]); setData(s); setForm(s.settings); setShare(sh); } catch (e) { toast(e.message, 'error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (!data || !share) return <Loading />;
  const saveSettings = async (e) => {
    e.preventDefault();
    try { await api.put('/plan/settings', { targetCompany: form.targetCompany, targetRole: form.targetRole, hoursPerDay: Number(form.hoursPerDay), studyDays: form.studyDays, placementDate: form.placementDate || '', reminderEmail: !!form.reminderEmail }); toast('Settings saved', 'success'); load(); }
    catch (er) { toast(er.message, 'error'); }
  };
  const toggleDay = (d) => setForm((f) => ({ ...f, studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d] }));
  const saveShare = async (patch) => { try { setShare(await api.put('/share', patch)); } catch (e) { toast(e.message, 'error'); } };
  const link = share.token ? `${window.location.origin}/u/${share.token}` : '';
  const labels = { readiness: 'Readiness score', streak: 'Study streak', hours: 'Study hours (last 30 days)', coding: 'Coding problems solved', aptitude: 'Aptitude accuracy', mock: 'Mock interview count & average', milestones: 'Milestones reached', targetRole: 'Target role', projects: 'Projects I marked "show on public page"' };

  return (
    <div className="stack">
      <form className="card pad" onSubmit={saveSettings}>
        <div className="card-title"><Icon name="target" size={18} /> My plan settings</div>
        <div className="form-row">
          <div><label htmlFor="s-co">Target company track</label><select id="s-co" value={form.targetCompany} onChange={(e) => setForm({ ...form, targetCompany: e.target.value })}><option value="">None</option>{data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label htmlFor="s-ro">Target role</label><select id="s-ro" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}><option value="">Not set</option>{data.roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
          <div><label htmlFor="s-h">Study hours per day</label><input id="s-h" type="number" min={0.5} max={12} step={0.5} value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })} /></div>
          <div><label htmlFor="s-d">Placement / test date (optional)</label><input id="s-d" type="date" value={form.placementDate || ''} onChange={(e) => setForm({ ...form, placementDate: e.target.value })} /></div>
        </div>
        <fieldset className="mt" style={{ border: 0, padding: 0 }}>
          <legend className="small muted">Study days (other days are rest days and never break your streak)</legend>
          <div className="chips mt-s">{DAY_NAMES.map((n, d) => <label key={n} className={`chip btn-chip ${form.studyDays.includes(d) ? 'hit' : ''}`} style={{ cursor: 'pointer' }}><input type="checkbox" hidden checked={form.studyDays.includes(d)} onChange={() => toggleDay(d)} />{n}</label>)}</div>
        </fieldset>
        <label className="row mt small" style={{ gap: 8, opacity: data.emailConfigured ? 1 : 0.6 }}>
          <input type="checkbox" disabled={!data.emailConfigured} checked={!!form.reminderEmail} onChange={(e) => setForm({ ...form, reminderEmail: e.target.checked })} />
          Email me a reminder on study days when tasks are unfinished (at most one per day){!data.emailConfigured && ' - email is not set up on this server'}
        </label>
        <div className="row mt">
          <button className="btn primary">Save settings</button>
          {data.emailConfigured && form.reminderEmail && <button type="button" className="btn ghost" onClick={() => api.post('/plan/reminders/test').then(() => toast('Test email sent', 'success')).catch((e) => toast(e.message, 'error'))}>Send test email</button>}
          <BrowserReminders />
        </div>
        <p className="tiny muted mt-s">Streak rules: rest days never break a streak, and every 7 active days earns a grace day (max 2) that covers one missed study day automatically.</p>
      </form>

      <div className="card pad">
        <div className="card-title"><Icon name="users" size={18} /> Share my progress (optional)</div>
        <p className="small muted">Off by default. When on, anyone with your private link can see only the items you tick below. Your resume, notes, interview answers and chats, company applications, email and college are never shown.</p>
        <label className="row mt" style={{ gap: 8 }}><input type="checkbox" checked={share.enabled} onChange={(e) => saveShare({ enabled: e.target.checked })} /> <b>{share.enabled ? 'Sharing is ON' : 'Sharing is OFF'}</b></label>
        <div className="form-row mt">
          <div><label htmlFor="sh-n">Display name (shown publicly)</label><input id="sh-n" maxLength={40} placeholder="e.g. Asha" defaultValue={share.displayName} onBlur={(e) => e.target.value !== share.displayName && saveShare({ displayName: e.target.value })} /></div>
          <div style={{ flex: 2 }}><label htmlFor="sh-t">Tagline (optional)</label><input id="sh-t" maxLength={140} placeholder="e.g. Preparing for SDE roles" defaultValue={share.tagline} onBlur={(e) => e.target.value !== share.tagline && saveShare({ tagline: e.target.value })} /></div>
        </div>
        <fieldset style={{ border: 0, padding: 0 }} className="mt"><legend className="small muted">What to show</legend>
          <div className="stack sm mt-s">{share.keys.map((k) => <label key={k} className="row small" style={{ gap: 8 }}><input type="checkbox" checked={share.show[k]} onChange={(e) => saveShare({ show: { ...share.show, [k]: e.target.checked } })} /> {labels[k] || k}</label>)}</div>
        </fieldset>
        {share.enabled && (
          <div className="mt">
            <label htmlFor="sh-l">Your private link</label>
            <div className="row nowrap"><input id="sh-l" readOnly value={link} onFocus={(e) => e.target.select()} /><button type="button" className="btn ghost" onClick={() => navigator.clipboard && navigator.clipboard.writeText(link).then(() => toast('Link copied', 'success'))}>Copy</button><a className="btn ghost" href={link} target="_blank" rel="noopener noreferrer">Preview</a></div>
            <button type="button" className="btn sm danger mt-s" onClick={() => confirm('Create a new link? The old link will stop working immediately.') && api.post('/share/rotate').then(setShare).then(() => toast('New link created. The old one no longer works.', 'success'))}>Revoke link & create a new one</button>
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="shield" size={18} /> Delete my account</div>
        <p className="small muted">Permanently deletes your account and everything stored for it (progress, notes, chats, resumes, submissions). This cannot be undone.</p>
        <form className="form-row mt" onSubmit={async (e) => { e.preventDefault(); if (!confirm('Delete your account and ALL data permanently?')) return; try { await api.del('/auth/me', { password: pw }); logout(); navigate('/'); } catch (er) { toast(er.message, 'error'); } }}>
          <div><input type="password" aria-label="Confirm with your password" placeholder="Your password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <button className="btn danger">Delete account</button>
        </form>
      </div>
    </div>
  );
}

function BrowserReminders() {
  const toast = useToast();
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  if (perm === 'unsupported') return null;
  return (
    <button type="button" className="btn ghost" disabled={perm === 'denied'} onClick={async () => {
      const p = await Notification.requestPermission(); setPerm(p);
      try { localStorage.setItem('pp_browser_reminders', p === 'granted' ? '1' : ''); } catch { /* ignore */ }
      toast(p === 'granted' ? 'Browser reminders on (shown when this app is open)' : 'Notifications were not allowed', p === 'granted' ? 'success' : 'info');
    }}>{perm === 'granted' ? 'Browser reminders: on' : perm === 'denied' ? 'Notifications blocked in browser' : 'Enable browser reminders'}</button>
  );
}

