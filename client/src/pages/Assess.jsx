import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, Markdown, PageHeader, fmtDate, useToast } from '../ui.jsx';
import CodeEditor from '../lib/CodeEditor.jsx';
import { Result } from './CodeProblem.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Assess() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [cfg, setCfg] = useState({ durationMin: 45, count: 2, level: '' });
  const [busy, setBusy] = useState(false);
  const [runner, setRunner] = useState(null);
  useEffect(() => { api.get('/code/status').then(setRunner).catch(() => setRunner({ enabled: false, note: 'Could not check the code runner.' })); }, []);

  const load = useCallback(() => api.get('/assessments').then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy(true);
    try { await api.post('/assessments', { ...cfg, durationMin: Number(cfg.durationMin), count: Number(cfg.count) }); await load(); }
    catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (err && !data) return <div className="card pad center"><p>{err}</p><button className="btn primary mt" onClick={load}>Retry</button></div>;
  if (!data) return <Loading />;
  if (data.active) return <Runner a={data.active} onEnd={load} />;

  return (
    <>
      <PageHeader icon="clock" title="Timed Coding Assessment" subtitle="Practice under real test conditions. The server keeps the clock, hints and solutions are locked, and your score comes from hidden test cases." />
      <div className="card pad mb">
        <div className="form-row">
          <div><label htmlFor="as-d">Time (minutes, {data.limits.minMin}-{data.limits.maxMin})</label><input id="as-d" type="number" min={data.limits.minMin} max={data.limits.maxMin} value={cfg.durationMin} onChange={(e) => setCfg({ ...cfg, durationMin: e.target.value })} /></div>
          <div><label htmlFor="as-c">Problems (1-{data.limits.maxProblems})</label><input id="as-c" type="number" min="1" max={data.limits.maxProblems} value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: e.target.value })} /></div>
          <div><label htmlFor="as-l">Level</label><select id="as-l" value={cfg.level} onChange={(e) => setCfg({ ...cfg, level: e.target.value })}><option value="">Any</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        </div>
        <p className="tiny muted mt-s">Problems you have not solved yet are preferred. Once started, the timer cannot be paused. Needs the code runner to be set up on the server.</p>
        {runner && !runner.enabled && <div className="notice-bar mt-s" role="alert"><span><b>Code running is not set up on this server.</b> {runner.note} On your own laptop you can set <code>CODE_RUNNER=local</code> in <code>server/.env</code> (needs Python installed) and restart the server.</span></div>}
        <button className="btn primary mt-s" onClick={start} disabled={busy || !runner || !runner.enabled}>{busy ? 'Starting...' : 'Start assessment'}</button>
      </div>
      <h2 style={{ fontSize: 18 }} className="mb">History</h2>
      {!data.history.length ? <Empty icon="clock" title="No assessments yet">Your finished assessments appear here with the score and problems solved.</Empty> : data.history.map((h) => (
        <div key={h.id} className="card pad mb row between"><div><b>{fmtDate(h.startedAt)}</b> <span className="muted small">· {h.durationMin} min · {h.status === 'expired' ? 'time ran out' : 'submitted'}</span></div><div className="row" style={{ gap: 8 }}><span className="badge tone-indigo">Solved {h.solved}/{h.total}</span><span className={`badge tone-${h.score >= 70 ? 'green' : h.score >= 40 ? 'amber' : 'rose'}`}>Score {h.score}%</span></div></div>
      ))}
      <p className="tiny muted">Score = average share of test cases passed across the problems (objective, from the code judge).</p>
    </>
  );
}

function Runner({ a, onEnd }) {
  const toast = useToast();
  const [cur, setCur] = useState(a.problems[0].id);
  const [prob, setProb] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(a.remainingSec);
  const [probs, setProbs] = useState(a.problems);
  const ended = useRef(false);

  // Display timer. The server decides when time is really up.
  useEffect(() => {
    const end = Date.now() + a.remainingSec * 1000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000)); setLeft(s);
      if (s === 0 && !ended.current) { ended.current = true; clearInterval(t); toast('Time is up', 'info'); onEnd(); }
    }, 500);
    return () => clearInterval(t);
  }, [a.remainingSec, onEnd, toast]);

  useEffect(() => {
    setProb(null); setResult(null);
    api.get(`/assessments/${a.id}/problems/${cur}`).then((p) => { setProb(p); setCode(p.lastCode || p.starter); }).catch((e) => toast(e.message, 'error'));
  }, [a.id, cur, toast]);

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await api.post(`/assessments/${a.id}/problems/${cur}/submit`, { code });
      setResult({ ...r, kind: 'submit' });
      setProbs((ps) => ps.map((p) => (p.id === cur && (r.verdict === 'AC' || p.verdict !== 'AC') ? { ...p, verdict: r.verdict, passed: r.passed, attempts: r.attempts } : p)));
    } catch (e) { toast(e.message, 'error'); if (/closed|Time is up/.test(e.message)) onEnd(); }
    setBusy(false);
  };
  const finish = async () => {
    if (!window.confirm('Finish the assessment now? You cannot change answers afterwards.')) return;
    try { await api.post(`/assessments/${a.id}/finish`); onEnd(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <div className="row between mb" style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', padding: '8px 0' }}>
        <div className="row" style={{ gap: 6 }}>{probs.map((p, i) => <button key={p.id} className={`btn sm ${cur === p.id ? 'primary' : 'ghost'}`} onClick={() => setCur(p.id)}>Q{i + 1}{p.verdict === 'AC' ? ' ✓' : p.attempts ? ` (${p.passed}/${p.testCount || '?'})` : ''}</button>)}</div>
        <div className="row" style={{ gap: 10 }}><b role="timer" aria-live="off" style={{ fontSize: 22, color: left < 300 ? '#dc2626' : 'inherit' }}><Icon name="clock" size={18} /> {fmt(left)}</b><button className="btn danger" onClick={finish}>Finish</button></div>
      </div>
      {!prob ? <Loading /> : (
        <div className="code-grid">
          <div className="card pad" style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20 }}>{prob.title}</h2>
            <Markdown text={prob.description} />
            <h4>Input</h4><Markdown text={prob.inputFormat} /><h4>Output</h4><Markdown text={prob.outputFormat} />
            <h4>Constraints</h4><ul>{prob.constraints.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
            {prob.examples.map((e, i) => <div key={i} className="example"><b>Example {i + 1}</b><div className="io"><div><span>Input</span><pre>{e.input}</pre></div><div><span>Output</span><pre>{e.output}</pre></div></div></div>)}
            <p className="tiny muted">Hints and solutions are locked during the assessment. Each submission is judged on all {prob.hiddenTestCount + prob.examples.length}+ tests.</p>
          </div>
          <div className="stack" style={{ minWidth: 0 }}>
            <div className="card pad">
              <CodeEditor value={code} onChange={setCode} onRun={submit} />
              <div className="row mt"><button className="btn success" disabled={busy} onClick={submit}>{busy ? 'Judging...' : 'Submit this problem'}</button><span className="muted tiny grow">Best result per problem is kept.</span></div>
            </div>
            {result && <Result r={result} />}
          </div>
        </div>
      )}
    </>
  );
}
