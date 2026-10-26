import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Icon, Loading, Markdown, PageHeader, useDebounced, useToast } from '../ui.jsx';
import CodeEditor from '../lib/CodeEditor.jsx';
import { Result } from './CodeProblem.jsx';

export function DebugList() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState(''); const [level, setLevel] = useState(''); const [status, setStatus] = useState('');
  const dq = useDebounced(q, 300);
  const load = useCallback(() => api.get(`/debug?${new URLSearchParams({ q: dq, level, status })}`).then(setRows).catch((e) => toast(e.message, 'error')), [dq, level, status, toast]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <PageHeader icon="code" title="Debugging Exercises" subtitle="Each exercise is a real problem solution with one bug injected. Find it, fix it, and the judge checks your fix on every test." />
      <div className="card pad mb"><div className="form-row">
        <div><label htmlFor="db-q">Search</label><input id="db-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="topic, bug type..." /></div>
        <div><label htmlFor="db-l">Level</label><select id="db-l" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">All</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <div><label htmlFor="db-s">Status</label><select id="db-s" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="open">Not fixed yet</option><option value="fixed">Fixed</option></select></div>
      </div></div>
      {!rows ? <Loading /> : !rows.length ? <Empty icon="code" title="No exercises match">Try clearing the filters.</Empty> : (
        <div className="stack">{rows.map((e) => (
          <Link key={e.id} to={`/app/debug/${e.id}`} className="card pad hover row between" style={{ color: 'inherit' }}>
            <div><b>{e.title}</b><div className="small muted">{e.topic} · bug type: {e.bugType}</div></div>
            <div className="row" style={{ gap: 6 }}><span className="badge">{e.level}</span>{e.fixed ? <span className="badge tone-green">fixed</span> : e.attempts ? <span className="badge tone-amber">{e.attempts} tries</span> : null}</div>
          </Link>))}</div>
      )}
    </>
  );
}

export default function DebugExercise() {
  const { id } = useParams();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [runner, setRunner] = useState(true);
  useEffect(() => { api.get('/code/status').then((r) => setRunner(r.enabled)).catch(() => {}); }, []);

  useEffect(() => { setD(null); setResult(null); setHint(''); api.get(`/debug/${id}`).then((x) => { setD(x); setCode(x.brokenCode); }).catch((e) => toast(e.message, 'error')); }, [id, toast]);

  const submit = async () => {
    setBusy(true); setResult(null);
    try { const r = await api.post(`/debug/${id}/submit`, { code }); setResult({ ...r, kind: 'submit' }); if (r.verdict === 'AC') toast('Bug fixed!', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const reset = async () => { if (!window.confirm('Restore the original broken code?')) return; const r = await api.post(`/debug/${id}/reset`); setCode(r.brokenCode); setResult(null); };
  const getHint = async () => { try { setHint((await api.get(`/debug/${id}/hint`)).hint); } catch (e) { toast(e.message, 'error'); } };

  if (!d) return <Loading />;
  return (
    <>
      <div className="mb"><Link to="/app/debug" className="muted small">← All exercises</Link><h1 style={{ fontSize: 26 }}>{d.title}</h1>
        <div className="row" style={{ gap: 6 }}><span className="badge">{d.level}</span><span className="badge tone-violet">{d.topic}</span><span className="badge tone-amber">{d.bugType}</span>{d.fixed && <span className="badge tone-green">fixed</span>}</div></div>
      <div className="code-grid">
        <div className="card pad" style={{ minWidth: 0 }}>
          <div className="notice-bar mb" role="note"><span><b>Symptom:</b> {d.symptom}</span></div>
          <h4>What the program should do</h4>
          <Markdown text={d.problem.description} />
          <h4>Input</h4><Markdown text={d.problem.inputFormat} /><h4>Output</h4><Markdown text={d.problem.outputFormat} />
          {d.problem.examples.map((e, i) => <div key={i} className="example"><b>Example {i + 1}</b><div className="io"><div><span>Input</span><pre>{e.input}</pre></div><div><span>Output</span><pre>{e.output}</pre></div></div></div>)}
          <div className="mt">{hint ? <div className="issue"><span className="sev low">Hint</span><span>{hint}</span></div> : <button className="btn sm ghost" onClick={getHint}><Icon name="sparkles" size={14} /> Give me a hint</button>}</div>
        </div>
        <div className="stack" style={{ minWidth: 0 }}>
          <div className="card pad">
            <div className="row between mb"><b>Fix this code (Python 3)</b><button className="btn sm ghost" onClick={reset}>Restore broken code</button></div>
            <CodeEditor value={code} onChange={setCode} onRun={submit} />
            <div className="row mt"><button className="btn success" disabled={busy || !runner} onClick={submit}>{busy ? 'Judging...' : 'Check my fix'}</button><span className="muted tiny grow">Checked against all tests. This does not count as solving the problem in Coding Practice.</span></div>
          </div>
          {!runner && <p className="small" style={{ color: '#b45309' }}>Code running is not set up on this server. For your own laptop set CODE_RUNNER=local in server/.env and restart.</p>}
          {result && <Result r={result} />}
        </div>
      </div>
    </>
  );
}
