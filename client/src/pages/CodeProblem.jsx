import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Icon, Loading, Markdown, useToast, fmtDate } from '../ui.jsx';
import CodeEditor from '../lib/CodeEditor.jsx';

const LEVEL_TONE = { Beginner: 'green', Intermediate: 'amber', Advanced: 'rose' };
const VERDICT = { AC: ['Accepted', 'green'], WA: ['Wrong Answer', 'rose'], TLE: ['Time Limit Exceeded', 'amber'], RE: ['Runtime Error', 'rose'], MLE: ['Memory Limit Exceeded', 'amber'], CE: ['Syntax Error', 'rose'], RAN: ['Ran', 'indigo'] };

export default function CodeProblem() {
  const { id } = useParams();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState('statement'); // statement | hints | solution | history
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [hints, setHints] = useState([]);
  const [editorial, setEditorial] = useState(null);
  const [history, setHistory] = useState(null);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [note, setNote] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [runnerOk, setRunnerOk] = useState(true);
  const saveTimer = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    loaded.current = false; setP(null); setResult(null); setEditorial(null); setHistory(null); setLeft('statement');
    api.get(`/code/problems/${id}`).then(async (d) => {
      setP(d); setCode(d.progress.savedCode || d.starter); setNote(d.progress.note || ''); setBookmarked(d.progress.bookmarked);
      if (d.progress.hintsRevealed) api.get(`/code/problems/${id}/hints`).then((h) => setHints(h.hints)).catch(() => {}); else setHints([]);
      setTimeout(() => { loaded.current = true; }, 0);
    }).catch((e) => toast(e.message, 'error'));
    api.get('/code/status').then((s) => setRunnerOk(s.enabled)).catch(() => {});
  }, [id, toast]);

  // Draft auto-save (debounced).
  useEffect(() => {
    if (!loaded.current || !p) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.put(`/code/problems/${id}/state`, { savedCode: code }).catch(() => {}), 1500);
    return () => clearTimeout(saveTimer.current);
  }, [code, id, p]);

  const run = useCallback(async (kind) => {
    if (!code.trim()) { toast('Write some code first', 'error'); return; }
    setBusy(kind); setResult(null);
    try {
      const body = kind === 'run' ? { code, input: useCustom ? custom : '' } : { code };
      const r = await api.post(`/code/problems/${id}/${kind}`, body);
      setResult({ ...r, kind });
      if (kind === 'submit') { setP((x) => ({ ...x, progress: { ...x.progress, status: r.status } })); setHistory(null); if (r.verdict === 'AC') toast('Accepted! Problem solved.', 'success'); }
    } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  }, [code, custom, id, toast, useCustom]);

  const moreHint = async () => {
    try { const r = await api.post(`/code/problems/${id}/hint`); setHints(r.hints); setP((x) => ({ ...x, progress: { ...x.progress, hintsRevealed: r.revealed } })); } catch (e) { toast(e.message, 'error'); }
  };
  const showSolution = async () => {
    if (!editorial && !p.progress.editorialViewed && !confirm('Show the solution? Try the hints first. It will be marked as viewed.')) return;
    try { setEditorial(await api.get(`/code/problems/${id}/editorial?reveal=1`)); } catch (e) { toast(e.message, 'error'); }
  };
  const openTab = (t) => {
    setLeft(t);
    if (t === 'history' && !history) api.get(`/code/problems/${id}/submissions`).then(setHistory).catch((e) => toast(e.message, 'error'));
    if (t === 'solution' && p.progress.editorialViewed && !editorial) api.get(`/code/problems/${id}/editorial`).then(setEditorial).catch(() => {});
  };
  const saveNote = () => api.put(`/code/problems/${id}/state`, { note }).then(() => toast('Note saved', 'success')).catch((e) => toast(e.message, 'error'));
  const toggleBookmark = () => { const v = !bookmarked; setBookmarked(v); api.put(`/code/problems/${id}/state`, { bookmarked: v }).catch((e) => toast(e.message, 'error')); };

  if (!p) return <Loading />;
  const st = p.progress.status;

  return (
    <>
      <div className="row between mb" style={{ gap: 12 }}>
        <div>
          <Link to="/app/code" className="muted small">← All problems</Link>
          <h1 style={{ fontSize: 26, margin: '4px 0' }}>{p.title}</h1>
          <div className="row" style={{ gap: 6 }}>
            <span className={`badge tone-${LEVEL_TONE[p.level]}`}>{p.level}</span><span className="badge tone-violet">{p.topic}</span>
            {st === 'solved' && <span className="badge tone-green"><Icon name="check" size={12} /> Solved</span>}
            {st === 'attempted' && <span className="badge tone-amber">Attempted</span>}
          </div>
        </div>
        <button className="btn ghost" onClick={toggleBookmark}><Icon name="bookmark" size={16} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}</button>
      </div>

      <div className="code-grid">
        <div className="card pad" style={{ minWidth: 0 }}>
          <div className="tabs">
            {[['statement', 'Problem'], ['hints', `Hints${p.hintCount ? ` (${p.progress.hintsRevealed}/${p.hintCount})` : ''}`], ['solution', 'Solution'], ['history', 'Submissions']].map(([k, l]) => <button key={k} className={left === k ? 'on' : ''} onClick={() => openTab(k)}>{l}</button>)}
          </div>

          {left === 'statement' && (
            <div className="md">
              <Markdown text={p.description} />
              <h4>Input</h4><Markdown text={p.inputFormat} />
              <h4>Output</h4><Markdown text={p.outputFormat} />
              <h4>Constraints</h4><ul>{p.constraints.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
              {p.examples.map((e, i) => (
                <div key={i} className="example">
                  <b>Example {i + 1}</b>
                  <div className="io"><div><span>Input</span><pre>{e.input}</pre></div><div><span>Output</span><pre>{e.output}</pre></div></div>
                  {e.explain && <p className="muted small">{e.explain}</p>}
                </div>
              ))}
              <p className="muted small">Your submission is also checked against {p.hiddenTestCount} hidden tests. {p.source}</p>
              <div className="field mt"><label htmlFor="cp-note">My notes</label><textarea id="cp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pattern, mistakes, what to remember..." /></div>
              <button className="btn sm ghost" onClick={saveNote}>Save note</button>
            </div>
          )}

          {left === 'hints' && (
            <div>
              <p className="muted small">Reveal one hint at a time. Try after each one.</p>
              {hints.map((h, i) => <div key={i} className="issue"><span className="sev low">Hint {i + 1}</span><span>{h}</span></div>)}
              {hints.length < p.hintCount
                ? <button className="btn primary mt" onClick={moreHint}><Icon name="sparkles" size={15} /> Show hint {hints.length + 1} of {p.hintCount}</button>
                : <p className="muted small mt">That was the last hint. The Solution tab has the full explanation.</p>}
            </div>
          )}

          {left === 'solution' && (
            !editorial ? (
              <Empty icon="book" title="Try it first">The solution includes the approach, complexity and full Python code.<div className="mt"><button className="btn primary" onClick={showSolution}>Show solution</button></div></Empty>
            ) : (
              <div className="md">
                <h4>Approach</h4><p>{editorial.approach}</p>
                <div className="row" style={{ gap: 8 }}><span className="badge tone-indigo">Time: {editorial.time}</span><span className="badge tone-violet">Space: {editorial.space}</span></div>
                <h4>Python solution</h4>
                <pre><code>{editorial.code}</code></pre>
                <button className="btn sm ghost" onClick={() => setCode(editorial.code)}>Load into editor</button>
              </div>
            )
          )}

          {left === 'history' && (!history ? <Loading /> : history.length ? history.map((s) => (
            <details key={s._id} className="result-q">
              <summary className="row between"><span><span className={`badge tone-${s.verdict === 'AC' ? 'green' : 'rose'}`}>{VERDICT[s.verdict][0]}</span> <span className="muted small">{s.passed}/{s.total} tests{s.timeMs != null ? ` · ${s.timeMs} ms` : ''}{s.memoryKb ? ` · ${(s.memoryKb / 1024).toFixed(1)} MB` : ''} · {fmtDate(s.createdAt)}</span></span></summary>
              <pre className="code-view">{s.code}</pre>
              <button className="btn sm ghost" onClick={() => { setCode(s.code); toast('Loaded into the editor', 'success'); }}>Load into editor</button>
            </details>
          )) : <Empty icon="clock" title="No submissions yet">Submit your solution to see it here.</Empty>)}
        </div>

        <div className="stack" style={{ minWidth: 0 }}>
          <div className="card pad">
            <div className="row between mb"><b>Python 3</b><button className="btn sm ghost" onClick={() => { if (confirm('Reset to the starter code?')) setCode(p.starter); }}>Reset</button></div>
            <CodeEditor value={code} onChange={setCode} onRun={() => run('run')} />
            <label className="row small muted mt-s" style={{ gap: 6, margin: 0 }}><input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} /> Run with my own input</label>
            {useCustom && <textarea aria-label="Custom input" style={{ minHeight: 70, fontFamily: 'ui-monospace, monospace' }} placeholder="Type the input exactly as the problem expects" value={custom} onChange={(e) => setCustom(e.target.value)} />}
            <div className="row mt">
              <button className="btn ghost" disabled={!!busy || !runnerOk} onClick={() => run('run')}><Icon name="play" size={15} /> {busy === 'run' ? 'Running...' : 'Run'}</button>
              <button className="btn success" disabled={!!busy || !runnerOk} onClick={() => run('submit')}>{busy === 'submit' ? 'Judging...' : 'Submit'}</button>
              <span className="muted tiny grow">Ctrl+Enter runs · Tab indents</span>
            </div>
            {!runnerOk && <p className="small" style={{ color: '#b45309' }}>Code running is not set up on the server. See the README.</p>}
          </div>
          {result && <Result r={result} />}
        </div>
      </div>
    </>
  );
}

export function Result({ r }) {
  const [label, tone] = VERDICT[r.verdict] || VERDICT.RE;
  return (
    <div className="card pad">
      <div className="row between">
        <h3 style={{ margin: 0, color: tone === 'green' ? '#059669' : tone === 'amber' ? '#b45309' : tone === 'indigo' ? 'var(--primary)' : '#dc2626' }}>{r.kind === 'run' && r.verdict === 'AC' ? 'Examples passed' : label}</h3>
        <span className="muted small">{r.passed}/{r.total} tests{r.timeMs != null ? ` · ${r.timeMs} ms` : ''}{r.memoryKb ? ` · ${(r.memoryKb / 1024).toFixed(1)} MB` : ''}</span>
      </div>
      <div className="chips mt-s">{r.results.map((t, i) => <span key={i} className={`chip ${t.verdict === 'AC' || t.verdict === 'RAN' ? 'hit' : 'miss'}`} title={t.visible ? 'Visible test' : 'Hidden test'}>{t.visible ? '' : '🔒 '}{i + 1}: {t.verdict}</span>)}</div>
      {r.results.filter((t) => t.verdict !== 'AC').slice(0, 2).map((t) => (
        <div key={t.index} className="example mt-s">
          <b>{t.visible || t.input !== undefined ? `Test ${t.index + 1}` : `Hidden test ${t.index + 1}`}: {(VERDICT[t.verdict] || VERDICT.RE)[0]}</b>
          {t.input !== undefined && <div className="io"><div><span>Input</span><pre>{t.input}</pre></div>{t.expected !== undefined && <div><span>Expected</span><pre>{t.expected}</pre></div>}<div><span>Your output</span><pre>{t.got}</pre></div></div>}
          {t.stderr && <pre className="err">{t.stderr}</pre>}
          {t.input === undefined && !t.stderr && <p className="muted small">Details of hidden tests are not shown. Think about edge cases: smallest input, duplicates, negative numbers, very large input.</p>}
        </div>
      ))}
    </div>
  );
}
