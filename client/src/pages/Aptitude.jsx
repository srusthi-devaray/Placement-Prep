import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, Ring, fmtDate, scoreColor, useResource, useToast } from '../ui.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const LEVEL = { E: 'Easy', M: 'Medium', H: 'Hard' };
const LEVEL_TONE = { E: 'green', M: 'amber', H: 'rose' };
const clock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const MODES = [
  ['practice', 'Topic practice', 'Pick a section, topic and difficulty'],
  ['progressive', 'Difficulty ladder', 'Starts easy and gets harder'],
  ['mock', 'Mixed mock test', 'Balanced across all sections, timed'],
  ['weak', 'Weak-topic revision', 'Questions from your lowest-accuracy topics'],
  ['mistakes', 'Reattempt mistakes', 'Questions you got wrong last time']
];

export default function Aptitude() {
  const toast = useToast();
  const results = useResource('/aptitude/results');
  const [meta, setMeta] = useState(null);
  const [an, setAn] = useState(null);
  const [cfg, setCfg] = useState({ mode: 'practice', section: 'All', topic: '', level: '', count: 10, timed: false });
  const [qs, setQs] = useState(null);
  const [limit, setLimit] = useState(0);
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const qStart = useRef(0);
  const spent = useRef({});       // seconds spent per question id
  const submitting = useRef(false);

  const loadAnalytics = useCallback(() => api.get('/aptitude/analytics').then(setAn).catch(() => setAn(false)), []);
  useEffect(() => { api.get('/aptitude/sections').then(setMeta).catch((e) => toast(e.message, 'error')); loadAnalytics(); }, [toast, loadAnalytics]);

  const flushTime = useCallback(() => {
    if (!qs) return;
    const q = qs[idx]; const now = Date.now();
    spent.current[q.id] = (spent.current[q.id] || 0) + Math.round((now - qStart.current) / 1000);
    qStart.current = now;
  }, [qs, idx]);
  const goto = (i) => { flushTime(); setIdx(i); };

  const submit = useCallback(async (auto = false) => {
    if (submitting.current) return;
    flushTime();
    const answered = Object.keys(choices).length;
    if (!auto && answered < qs.length && !confirm(`You answered ${answered} of ${qs.length}. Submit anyway?`)) return;
    submitting.current = true; setBusy(true);
    try {
      const r = await api.post('/aptitude/submit', {
        section: cfg.section, mode: cfg.mode, durationSec: Math.floor((Date.now() - startRef.current) / 1000),
        answers: qs.map((q) => ({ id: q.id, choice: choices[q.id] ?? -1, timeSec: spent.current[q.id] || 0 }))
      });
      setResult(r); results.reload(); loadAnalytics();
      if (auto) toast('Time is up - your test was submitted.', 'info');
    } catch (e) { toast(e.message, 'error'); }
    submitting.current = false; setBusy(false);
  }, [qs, choices, cfg.section, cfg.mode, flushTime, results, loadAnalytics, toast]);

  // clock (and automatic submit when a timed test runs out)
  useEffect(() => {
    if (!qs || result) return undefined;
    const t = setInterval(() => {
      const e = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(e);
      if (limit && e >= limit) submit(true);
    }, 500);
    return () => clearInterval(t);
  }, [qs, result, limit, submit]);

  const start = async (override) => {
    const c = { ...cfg, ...(override || {}) };
    setBusy(true);
    try {
      const p = new URLSearchParams({ mode: c.mode, section: c.mode === 'practice' || c.mode === 'progressive' ? c.section : 'All', topic: c.mode === 'practice' ? c.topic : '', level: c.mode === 'practice' ? c.level : '', count: c.mode === 'mock' ? Math.max(c.count, 15) : c.count });
      const r = await api.get(`/aptitude/questions?${p}`);
      if (!r.questions.length) { toast('No questions match those filters', 'error'); setBusy(false); return; }
      if (r.note) toast(r.note, 'info');
      setCfg({ ...c, mode: r.mode });
      setQs(r.questions); setIdx(0); setChoices({}); setResult(null); setElapsed(0); spent.current = {};
      setLimit(r.timeLimitSec || (c.timed ? r.questions.length * 75 : 0));
      startRef.current = Date.now(); qStart.current = Date.now();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  /* ---------- results ---------- */
  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    const wrongCount = result.details.filter((d) => !d.correct).length;
    const byTopic = {};
    for (const d of result.details) { const t = byTopic[d.topic] || (byTopic[d.topic] = { n: 0, ok: 0, time: 0 }); t.n++; if (d.correct) t.ok++; t.time += d.timeSec; }
    return (
      <>
        <PageHeader icon="bars" title="Aptitude results" />
        <div className="card pad center mb">
          <div className="row" style={{ justifyContent: 'center', gap: 28 }}>
            <Ring value={pct} size={120} label={`${result.score}/${result.total}`} />
            <div style={{ textAlign: 'left' }}>
              <h2>{pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good work' : 'Keep practicing'}</h2>
              <p className="muted">{pct}% accuracy · {clock(elapsed)} taken · {result.total ? Math.round(elapsed / result.total) : 0}s per question</p>
            </div>
          </div>
          <div className="row mt" style={{ justifyContent: 'center' }}>
            <button className="btn success" onClick={() => { setQs(null); setResult(null); }}>Back to practice</button>
            {wrongCount > 0 && <button className="btn primary" onClick={() => { setQs(null); setResult(null); setTimeout(() => start({ mode: 'mistakes' }), 0); }}>Reattempt {wrongCount} mistake{wrongCount > 1 ? 's' : ''}</button>}
          </div>
        </div>
        <div className="card pad mb">
          <div className="card-title"><Icon name="trending" size={18} /> Accuracy & time by topic</div>
          {Object.entries(byTopic).map(([t, v]) => (
            <div key={t} className="row between small" style={{ padding: '4px 0' }}><span>{t}</span><span><b>{v.ok}/{v.n}</b> correct · avg {v.time ? Math.round(v.time / v.n) : 0}s</span></div>
          ))}
        </div>
        <div className="stack">
          {result.details.map((d, i) => (
            <div className="result-q" key={d.id}>
              <div className="row between nowrap"><b>{i + 1}. {d.q}</b><span className={`badge tone-${d.correct ? 'green' : 'rose'}`}>{d.correct ? 'Correct' : d.choice < 0 ? 'Skipped' : 'Wrong'}</span></div>
              <div className="row small muted" style={{ gap: 6 }}><span className={`badge tone-${LEVEL_TONE[d.level]}`}>{LEVEL[d.level]}</span><span>{d.topic}</span><span>· {d.timeSec}s</span></div>
              <div className="mt-s">
                {d.options.map((o, j) => <div key={j} className={`option ${j === d.answer ? 'right' : j === d.choice ? 'wrong' : ''}`} style={{ cursor: 'default', padding: '9px 14px', marginBottom: 6 }}><span className="letter">{LETTERS[j]}</span>{o}{j === d.choice && j !== d.answer ? ' (your answer)' : ''}</div>)}
              </div>
              <p className="small muted"><b>Worked solution:</b> {d.explain}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ---------- running ---------- */
  if (qs) {
    const q = qs[idx];
    const left = limit ? limit - elapsed : null;
    return (
      <>
        <PageHeader icon="bars" title={MODES.find((m) => m[0] === cfg.mode)[1]}>
          <span className="timer" role="timer" aria-live="off" style={left !== null && left < 60 ? { color: '#ef4444' } : undefined}>{left !== null ? `${clock(left)} left` : clock(elapsed)}</span>
          <button className="btn ghost" onClick={() => { if (confirm('Quit this test? Your answers will not be saved.')) setQs(null); }}>Quit</button>
        </PageHeader>
        <div className="card pad">
          <div className="row between mb"><span className="row" style={{ gap: 8 }}><span className="badge tone-violet">{q.section}</span><span className="badge">{q.topic}</span><span className={`badge tone-${LEVEL_TONE[q.level]}`}>{LEVEL[q.level]}</span><span className="muted small">Question {idx + 1} of {qs.length}</span></span></div>
          <div className="progress-bar mb" style={{ height: 6 }}><i style={{ width: `${((idx + 1) / qs.length) * 100}%` }} /></div>
          <div className="q-text" style={{ fontSize: 20 }}>{q.q}</div>
          <div role="radiogroup" aria-label="Answer options">
            {q.options.map((o, j) => (
              <label key={j} className={`option ${choices[q.id] === j ? 'sel' : ''}`} style={{ color: 'var(--text)', margin: '0 0 10px' }}>
                <input type="radio" name={`q-${q.id}`} checked={choices[q.id] === j} onChange={() => setChoices({ ...choices, [q.id]: j })} />
                <span className="letter">{LETTERS[j]}</span>{o}
              </label>
            ))}
          </div>
          <div className="row mt">
            <button className="btn ghost" disabled={idx === 0} onClick={() => goto(idx - 1)}>Previous</button>
            <span className="grow center muted small">{Object.keys(choices).length}/{qs.length} answered</span>
            {idx < qs.length - 1 ? <button className="btn primary" onClick={() => goto(idx + 1)}>Next <Icon name="chevron" size={16} /></button> : <button className="btn success" disabled={busy} onClick={() => submit(false)}>{busy ? 'Submitting...' : 'Submit test'}</button>}
          </div>
          <div className="chips mt">{qs.map((x, i) => <button key={x.id} aria-label={`Go to question ${i + 1}`} className={`chip btn-chip ${choices[x.id] !== undefined ? 'hit' : ''}`} style={i === idx ? { outline: '2px solid var(--primary)' } : undefined} onClick={() => goto(i)}>{i + 1}</button>)}</div>
          {idx < qs.length - 1 && <div className="row end mt"><button className="btn sm ghost" onClick={() => submit(false)}>Submit now</button></div>}
        </div>
      </>
    );
  }

  /* ---------- setup ---------- */
  const last = (results.items || []).slice(0, 10).reverse();
  const topics = meta ? (cfg.section === 'All' ? meta.sections.flatMap((s) => s.topics) : (meta.sections.find((s) => s.name === cfg.section) || { topics: [] }).topics) : [];
  const uniq = [...new Set(topics)].sort();
  const needsFilters = cfg.mode === 'practice' || cfg.mode === 'progressive';
  return (
    <>
      <PageHeader icon="bars" title="Aptitude Practice" subtitle={`${meta ? meta.total : ''} questions across quantitative, logical and verbal topics, with worked solutions, timing and weak-topic tracking.`} />
      <div className="card pad mb">
        <div className="card-title"><Icon name="play" size={18} /> Start a test</div>
        {!meta ? <Loading /> : (
          <>
            <div className="chips mb" role="radiogroup" aria-label="Test type">
              {MODES.map(([id, label, sub]) => <button key={id} role="radio" aria-checked={cfg.mode === id} title={sub} className={`chip btn-chip ${cfg.mode === id ? 'hit' : ''}`} onClick={() => setCfg({ ...cfg, mode: id })}>{label}</button>)}
            </div>
            <p className="small muted mb">{MODES.find((m) => m[0] === cfg.mode)[2]}.{cfg.mode === 'weak' && an && !an.weakTopics.length ? ' (No weak topics yet - answer a few more questions first.)' : ''}{cfg.mode === 'mistakes' && an ? ` You have ${an.mistakeCount} unresolved mistake${an.mistakeCount === 1 ? '' : 's'}.` : ''}</p>
            <div className="form-row">
              {needsFilters && <div><label htmlFor="ap-s">Section</label><select id="ap-s" value={cfg.section} onChange={(e) => setCfg({ ...cfg, section: e.target.value, topic: '' })}><option value="All">All sections</option>{meta.sections.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}</select></div>}
              {cfg.mode === 'practice' && <div><label htmlFor="ap-t">Topic</label><select id="ap-t" value={cfg.topic} onChange={(e) => setCfg({ ...cfg, topic: e.target.value })}><option value="">All topics</option>{uniq.map((t) => <option key={t}>{t}</option>)}</select></div>}
              {cfg.mode === 'practice' && <div><label htmlFor="ap-l">Difficulty</label><select id="ap-l" value={cfg.level} onChange={(e) => setCfg({ ...cfg, level: e.target.value })}><option value="">Any</option>{meta.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
              <div><label htmlFor="ap-c">Questions</label><select id="ap-c" value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })}>{[5, 10, 15, 20, 30].map((n) => <option key={n}>{n}</option>)}</select></div>
              {cfg.mode !== 'mock' && <label className="row small" style={{ gap: 6, alignSelf: 'end', marginBottom: 12 }}><input type="checkbox" checked={cfg.timed} onChange={(e) => setCfg({ ...cfg, timed: e.target.checked })} /> Timed (75 s per question)</label>}
              <button className="btn success" onClick={() => start()} disabled={busy}>{busy ? 'Loading...' : 'Start test'}</button>
            </div>
            {cfg.mode === 'mock' && <p className="tiny muted mt-s">Mock tests have at least 15 questions with a time limit of 75 seconds per question, like a real online assessment. The test submits automatically when time runs out.</p>}
          </>
        )}
      </div>

      <div className="card pad mb">
        <div className="card-title"><Icon name="trending" size={18} /> Your accuracy & speed</div>
        {an === null ? <Loading /> : !an || !an.questions ? <Empty icon="bars" title="No data yet">Finish a test to see accuracy and time per topic.</Empty> : (
          <>
            {an.lowData && <p className="small muted mb">Based on only {an.questions} answers so far - treat the numbers as rough until you have answered more.</p>}
            <div className="grid g3">
              {an.byLevel.map((l) => <div key={l.key} className="center"><span className={`badge tone-${LEVEL_TONE[l.key]}`}>{l.name}</span><div style={{ fontSize: 24, fontWeight: 800 }}>{l.accuracy}%</div><div className="tiny muted">{l.correct}/{l.attempted}{l.avgTimeSec ? ` · ${l.avgTimeSec}s avg` : ''}</div></div>)}
            </div>
            <div className="stack sm mt">
              {an.byTopic.map((t) => (
                <div key={t.key}>
                  <div className="row between small"><span>{t.name} {an.weakTopics.some((w) => w.topic === t.name) && <span className="badge tone-rose">weak</span>}</span><span><b>{t.accuracy}%</b> · {t.correct}/{t.attempted}{t.avgTimeSec ? ` · ${t.avgTimeSec}s` : ''}</span></div>
                  <div className="progress-bar" style={{ height: 6, marginTop: 4 }}><i style={{ width: `${t.accuracy}%`, background: scoreColor(t.accuracy) }} /></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="clock" size={18} /> Your attempts</div>
        {!results.items ? <Loading /> : results.items.length ? (
          <>
            <div className="bars" style={{ height: 100 }}>{last.map((r) => { const p = r.total ? Math.round((r.score / r.total) * 100) : 0; return <div className="bar-col" key={r._id}><span>{p}%</span><i style={{ height: `${Math.max(4, p)}%`, background: scoreColor(p) }} /></div>; })}</div>
            <div className="stack sm mt">{results.items.map((r) => <div key={r._id} className="row between small"><span>{fmtDate(r.createdAt)} · {r.section}{r.mode && r.mode !== 'practice' ? ` · ${r.mode}` : ''}</span><b>{r.score}/{r.total}</b></div>)}</div>
          </>
        ) : <Empty icon="bars" title="No attempts yet">Take your first test to see your accuracy here.</Empty>}
      </div>
    </>
  );
}
