import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, Markdown, PageHeader, Ring, fmtDate, scoreColor, useAiStatus, useResource, useToast } from '../ui.jsx';
import { speak, speechInputSupported, speechOutputSupported, stopSpeaking, useDictation } from '../lib/speech.js';

const PRESSURE_SECONDS = 120;
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export default function Mock() {
  const toast = useToast();
  const ai = useAiStatus();
  const sessions = useResource('/mock/sessions');
  const [cats, setCats] = useState(null);
  const [cfg, setCfg] = useState({ category: 'All', count: 5, pressure: false, readAloud: false });
  const [phase, setPhase] = useState('setup'); // setup | run | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const startedAt = useRef(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => { api.get('/mock/categories').then(setCats).catch((e) => toast(e.message, 'error')); }, [toast]);
  useEffect(() => () => stopSpeaking(), []);

  const start = async () => {
    setStarting(true);
    try {
      const qs = await api.get(`/mock/questions?category=${encodeURIComponent(cfg.category)}&count=${cfg.count}`);
      if (!qs.length) { toast(cfg.category === 'Projects' ? 'Add at least one project in My Projects first' : 'No questions in that topic', 'error'); setStarting(false); return; }
      setQuestions(qs); setIdx(0); setAnswers([]); startedAt.current = Date.now(); setPhase('run');
    } catch (e) { toast(e.message, 'error'); }
    setStarting(false);
  };

  // A follow-up question is inserted right after the current one.
  const insertFollowUp = (text) => setQuestions((qs) => { const x = [...qs]; x.splice(idx + 1, 0, { id: `f${Date.now()}`, q: text, category: 'Follow-up', keywords: [], followUp: true }); return x; });

  const onDone = (answer) => {
    const next = [...answers, answer];
    setAnswers(next);
    if (idx + 1 < questions.length) setIdx(idx + 1); else setPhase('done');
  };

  if (phase === 'run') {
    return (
      <>
        <PageHeader icon="mic" title="Mock Interview" subtitle={`${cfg.category === 'All' ? 'All topics' : cfg.category} - live feedback as you answer`}>
          <button className="btn ghost" onClick={() => { if (confirm('Quit this interview? Progress will not be saved.')) { stopSpeaking(); setPhase('setup'); } }}>Quit</button>
        </PageHeader>
        <Run key={idx} q={questions[idx]} index={idx} total={questions.length} pressure={cfg.pressure} readAloud={cfg.readAloud} aiEnabled={!!(ai && ai.enabled)} onDone={onDone} onFollowUp={insertFollowUp} />
      </>
    );
  }

  if (phase === 'done') {
    return <Summary answers={answers} category={cfg.category} durationSec={Math.round((Date.now() - startedAt.current) / 1000)} onAgain={() => { sessions.reload(); setPhase('setup'); }} />;
  }

  const last = (sessions.items || []).slice(0, 10).reverse();
  return (
    <>
      <PageHeader icon="mic" title="Mock Interview" subtitle="Answer by typing or speaking and get live feedback on filler words, structure, pace and key concepts." />
      <div className="card pad mb">
        <div className="card-title"><Icon name="play" size={18} /> Start a practice session</div>
        {!cats ? <Loading /> : (
          <>
            <div className="form-row">
              <div><label htmlFor="m-cat">Topic</label>
                <select id="m-cat" value={cfg.category} onChange={(e) => setCfg({ ...cfg, category: e.target.value })}>
                  <option value="All">All topics</option>
                  {cats.map((c) => <option key={c.name} value={c.name} disabled={c.disabled}>{c.name === 'Resume' ? 'Resume-based (from your skills)' : c.name === 'Projects' ? (c.disabled ? 'Project-based (add projects first)' : 'Project-based (from My Projects)') : c.name === 'HR' ? `HR / behavioural (${c.count})` : `${c.name} (${c.count})`}</option>)}
                </select></div>
              <div><label htmlFor="m-count">Questions</label>
                <select id="m-count" value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })}>{[3, 5, 8, 10].map((n) => <option key={n}>{n}</option>)}</select></div>
            </div>
            <div className="row mt" style={{ gap: 24 }}>
              <label className="row" style={{ gap: 8, margin: 0, color: 'var(--text)' }}><input type="checkbox" checked={cfg.pressure} onChange={(e) => setCfg({ ...cfg, pressure: e.target.checked })} /> Pressure mode (2 min per question, auto-advances)</label>
              {speechOutputSupported && <label className="row" style={{ gap: 8, margin: 0, color: 'var(--text)' }}><input type="checkbox" checked={cfg.readAloud} onChange={(e) => setCfg({ ...cfg, readAloud: e.target.checked })} /> Read questions aloud</label>}
            </div>
            <p className="small muted mt-s">{speechInputSupported ? 'Voice answers are supported in this browser.' : 'Voice input needs Chrome or Edge. Typing works everywhere.'} {ai && ai.enabled ? 'AI coach review is available after each answer.' : 'Add an AI key on the server to unlock the AI coach.'}</p>
            <button className="btn success lg mt" onClick={start} disabled={starting}>{starting ? 'Loading...' : 'Start interview'}</button>
          </>
        )}
      </div>

      <div className="card pad">
        <div className="card-title"><Icon name="clock" size={18} /> Your sessions</div>
        {!sessions.items ? <Loading /> : sessions.items.length ? (
          <>
            <div className="bars" style={{ height: 110 }}>
              {last.map((s) => <div className="bar-col" key={s._id}><span>{s.avgScore}</span><i style={{ height: `${Math.max(4, s.avgScore)}%`, background: scoreColor(s.avgScore) }} /></div>)}
            </div>
            <p className="small muted center mb">Average score of your last {last.length} sessions</p>
            <div className="stack sm">
              {sessions.items.map((s) => (
                <details className="result-q" key={s._id}>
                  <summary className="row between">
                    <span><b>{fmtDate(s.createdAt)}</b> · {s.category || 'All'} · {s.answers.length} question{s.answers.length === 1 ? '' : 's'} · <b style={{ color: scoreColor(s.avgScore) }}>{s.avgScore}/100</b></span>
                    <button className="btn sm danger" onClick={async (e) => { e.preventDefault(); if (confirm('Delete this session?')) await sessions.remove(s._id); }}>Delete</button>
                  </summary>
                  {s.answers.map((a, i) => <div key={i} className="mt-s"><b>{a.question}</b> <span className="badge">{a.score}</span><div className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{a.answer}</div></div>)}
                </details>
              ))}
            </div>
          </>
        ) : <Empty icon="mic" title="No sessions yet">Your first one takes about 5 minutes.</Empty>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ one question */
function Run({ q, index, total, pressure, readAloud, aiEnabled, onDone, onFollowUp }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const textRef = useRef(''); textRef.current = text;
  const [live, setLive] = useState(null);
  const [tab, setTab] = useState('live');
  const [coach, setCoach] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [fu, setFu] = useState(null);
  const [fuBusy, setFuBusy] = useState(false);
  const [fuAdded, setFuAdded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const seq = useRef(0);
  const lastText = useRef(null);
  const finished = useRef(false);
  const dict = useDictation({ getText: () => textRef.current, setText, onError: (m) => toast(m, 'error') });
  const micSeconds = dict.micSeconds;

  const analyze = useCallback(async (t) => {
    const mine = ++seq.current;
    try {
      const r = await api.post('/mock/analyze', { questionId: q.id, question: q.q, category: q.category, keywords: q.keywords, answer: t, durationSec: micSeconds() });
      if (mine === seq.current) { setLive(r); lastText.current = t; }
      return r;
    } catch { return null; }
  }, [q, micSeconds]);

  // Live feedback: analyze shortly after the user stops typing / speaking.
  useEffect(() => {
    if (!text.trim()) { setLive(null); lastText.current = null; return undefined; }
    const t = setTimeout(() => analyze(text), 450);
    return () => clearTimeout(t);
  }, [text, analyze]);

  useEffect(() => { const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500); return () => clearInterval(t); }, []);
  useEffect(() => { if (readAloud) speak(q.q); return () => stopSpeaking(); }, [q, readAloud]);

  const finish = async (skipped) => {
    if (finished.current) return;
    finished.current = true;
    dict.stop(); stopSpeaking();
    const t = textRef.current.trim();
    let r = live;
    if (!skipped && t && lastText.current !== textRef.current) r = await analyze(textRef.current);
    const answered = !skipped && !!t;
    onDone({ question: q.q, followUp: !!q.followUp, metrics: answered && r ? { wordCount: r.wordCount, wpm: r.metrics.wpm, fillerCount: r.metrics.fillerCount } : null, answer: answered ? t : '', score: answered && r ? r.score : 0, tips: answered && r ? r.tips.filter((x) => x.type !== 'good').slice(0, 4) : [], skipped: !answered });
  };

  useEffect(() => { if (pressure && elapsed >= PRESSURE_SECONDS) { toast("Time's up!", 'error'); finish(false); } }); // eslint-disable-line react-hooks/exhaustive-deps

  const getCoach = async () => {
    setTab('coach'); setCoachBusy(true);
    try { const r = await api.post('/mock/ai-review', { question: q.q, answer: text }); setCoach(r.text); }
    catch (e) { setCoach(`Could not get a review: ${e.message}`); }
    setCoachBusy(false);
  };

  const askFollowUp = async () => {
    setFuBusy(true); setFu(null);
    try { setFu(await api.post('/mock/follow-up', { question: q.q, answer: text, category: q.category })); }
    catch (e) { toast(e.message, 'error'); }
    setFuBusy(false);
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const left = PRESSURE_SECONDS - elapsed;

  return (
    <div className="mock-grid">
      <div className="card pad">
        <div className="row between">
          <span className="row" style={{ gap: 8 }}><span className="badge tone-violet">{q.category}</span><span className="muted small">Question {index + 1} of {total}</span></span>
          <span className={`timer ${pressure && left <= 20 ? 'warn' : ''}`}>{pressure ? `${fmtClock(left)} left` : fmtClock(elapsed)}</span>
        </div>
        <div className="q-text">{q.q}</div>
        <textarea aria-label="Your answer" style={{ minHeight: 230, fontSize: 16 }} placeholder="Type your answer here, or press Speak and talk..." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="row mt">
          {dict.supported && <button className={`btn ${dict.listening ? 'solid-danger' : 'ghost'}`} onClick={dict.toggle}><Icon name={dict.listening ? 'stop' : 'mic'} size={16} /> {dict.listening ? 'Stop' : 'Speak'}</button>}
          {speechOutputSupported && <button className="btn ghost" onClick={() => speak(q.q)}><Icon name="volume" size={16} /> Read aloud</button>}
          <span className="muted small">{words} words</span>
          <span className="grow" />
          <button className="btn ghost" onClick={askFollowUp} disabled={fuBusy || words < 5}>{fuBusy ? 'Thinking...' : 'Ask a follow-up'}</button>
          <button className="btn ghost" onClick={() => finish(true)}>Skip</button>
          <button className="btn primary" onClick={() => finish(false)}>{index === total - 1 ? 'Finish' : 'Next question'} <Icon name="chevron" size={16} /></button>
        </div>
        {fu && (
          <div className="mt" role="status">
            <div className="row between"><b className="small">Follow-up questions</b><span className={`badge tone-${fu.source === 'ai' ? 'violet' : 'slate'}`} title={fu.source === 'ai' ? 'Written by the AI model from your answer. An estimate of what an interviewer might ask.' : 'Chosen by simple rules that read your answer (no AI).'}>{fu.source === 'ai' ? 'AI-generated' : 'Rule-based'}</span></div>
            {fu.followUps.map((f) => (
              <div key={f.text} className="issue"><span className="sev low">Q</span><span>{f.text}{f.reason && <span className="tiny muted"> ({f.reason})</span>}<br />
                <button className="btn sm ghost mt-s" disabled={fuAdded} onClick={() => { onFollowUp(f.text); setFuAdded(true); toast('Added as your next question', 'success'); }}>Answer this next</button></span></div>
            ))}
          </div>
        )}
      </div>

      <div className="card pad live-panel">
        <div className="tabs">
          <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}><Icon name="zap" size={15} /> Live feedback</button>
          <button className={tab === 'coach' ? 'on' : ''} onClick={() => setTab('coach')}><Icon name="sparkles" size={15} /> AI coach</button>
        </div>
        <p className="tiny muted" style={{ margin: '0 0 8px' }}>{tab === 'live' ? 'Objective: scores and tips come from fixed rules (word counts, filler words, structure, key concepts). Not a human or AI judgement.' : 'AI estimate: written by an AI model. Treat it as one opinion, not a score.'}</p>
        {tab === 'live' ? <Live r={live} /> : (
          <div>
            {coachBusy ? <Loading /> : coach ? <Markdown text={coach} /> : (
              <div className="stack sm">
                <p className="muted small">{aiEnabled ? 'Get a detailed review, a stronger model answer and a likely follow-up question.' : 'AI coach needs an API key on the server. Live feedback works without it.'}</p>
              </div>
            )}
            <button className="btn primary block mt" onClick={getCoach} disabled={coachBusy || text.trim().length < 10}><Icon name="sparkles" size={16} /> {coach ? 'Review again' : 'Review my answer'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Live({ r }) {
  if (!r || !r.wordCount) {
    return (
      <div>
        <p className="muted">Start answering and your feedback appears here in real time.</p>
        <ul className="tips"><li className="warn">Lead with a direct one-line answer, then explain.</li><li className="warn">Give one concrete example.</li><li className="warn">Avoid filler words. Pause instead.</li></ul>
      </div>
    );
  }
  const names = { content: 'Content', structure: 'Structure', length: 'Length', fillers: 'Fluency', confidence: 'Confidence' };
  return (
    <div>
      <div className="row nowrap" style={{ gap: 16, marginBottom: 10 }}>
        <Ring value={r.score} size={84} />
        <div><h3 style={{ fontSize: 20 }}>{r.verdict}</h3><div className="muted small">{r.wordCount} words{r.metrics.wpm ? ` · ${r.metrics.wpm} wpm` : ''}</div></div>
      </div>
      {Object.entries(names).map(([k, label]) => (
        <div className="metric" key={k}><span>{label}</span><div className="track"><i style={{ width: `${r.metrics[k]}%`, background: scoreColor(r.metrics[k]) }} /></div><b>{r.metrics[k]}</b></div>
      ))}
      {r.star && (
        <>
          <div className="star-row">{['situation', 'task', 'action', 'result'].map((k) => <div key={k} className={r.star[k] ? 'on' : ''}>{r.star[k] ? '✓ ' : ''}{k[0].toUpperCase()}</div>)}</div>
          <div className="tiny muted center mt-s">STAR: Situation · Task · Action · Result</div>
        </>
      )}
      <ul className="tips">{r.tips.map((t, i) => <li key={i} className={t.type}>{t.text}</li>)}</ul>
      {(r.keywordsHit.length + r.keywordsMissed.length) > 0 && (
        <>
          <div className="small muted mt">Key concepts</div>
          <div className="chips mt-s">{r.keywordsHit.map((k) => <span key={k} className="chip hit">✓ {k}</span>)}{r.keywordsMissed.map((k) => <span key={k} className="chip">{k}</span>)}</div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ summary */
function Summary({ answers, category, durationSec, onAgain }) {
  const [status, setStatus] = useState('saving');
  const saved = useRef(false);
  const answered = answers.filter((a) => !a.skipped);
  const avg = answered.length ? Math.round(answered.reduce((s, a) => s + a.score, 0) / answered.length) : 0;
  const withM = answered.filter((a) => a.metrics && a.metrics.wordCount);
  const totalW = withM.reduce((x, a) => x + a.metrics.wordCount, 0);
  const wpms = withM.map((a) => a.metrics.wpm).filter(Boolean);
  const comm = withM.length ? { avgWords: Math.round(totalW / withM.length), shortAnswers: withM.filter((a) => a.metrics.wordCount < 30).length, avgWpm: wpms.length ? Math.round(wpms.reduce((x, y) => x + y, 0) / wpms.length) : null, fillers: totalW ? Math.round((withM.reduce((x, a) => x + (a.metrics.fillerCount || 0), 0) / totalW) * 1000) / 10 : 0 } : null;
  const verdict = avg >= 85 ? 'Excellent - interview ready!' : avg >= 70 ? 'Good job - polish the details.' : avg >= 50 ? 'Getting there - keep practicing.' : 'Keep practicing - you will improve fast.';

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    if (!answered.length) { setStatus('none'); return; }
    api.post('/mock/sessions', { category, durationSec, answers: answered }).then(() => setStatus('saved')).catch((e) => setStatus(`error: ${e.message}`));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader icon="award" title="Session complete" />
      <div className="card pad center mb">
        {answered.length ? (
          <>
            <div className="big-score" style={{ color: scoreColor(avg) }}>{avg}<span className="muted" style={{ fontSize: 24 }}>/100</span></div>
            <h2 style={{ margin: '8px 0' }}>{verdict}</h2>
            <p className="muted small">{status === 'saving' ? 'Saving your session...' : status === 'saved' ? '✓ Saved to your sessions.' : status.startsWith('error') ? `Could not save: ${status.slice(7)}` : ''}</p>
          </>
        ) : <><h2>No answers recorded</h2><p className="muted">You skipped every question, so nothing was saved.</p></>}
        <button className="btn success mt" onClick={onAgain}>Practice again</button>
      </div>
      {comm && (
        <div className="card pad mb">
          <div className="card-title">Communication (objective numbers from this session)</div>
          <div className="grid g3">
            <div className="center"><b style={{ fontSize: 22 }}>{comm.avgWords}</b><div className="small muted">average words per answer{comm.shortAnswers ? ` (${comm.shortAnswers} under 30 words)` : ''}</div></div>
            <div className="center"><b style={{ fontSize: 22 }}>{comm.avgWpm || '-'}</b><div className="small muted">words per minute{comm.avgWpm ? '' : ' (speak with the mic to measure)'}</div></div>
            <div className="center"><b style={{ fontSize: 22 }}>{comm.fillers}</b><div className="small muted">filler words per 100 words</div></div>
          </div>
          <p className="tiny muted mt-s">Good targets: 130-160 wpm when speaking, under 2 fillers per 100 words, 50-150 words for most answers. Counted from your text and microphone time, not guessed by AI.</p>
        </div>
      )}
      <div className="stack">
        {answers.map((a, i) => (
          <div className="result-q" key={i}>
            <div className="row between nowrap"><b>{a.question}</b>{a.skipped ? <span className="badge">Skipped</span> : <span className="badge" style={{ background: scoreColor(a.score), color: '#fff' }}>{a.score}/100</span>}</div>
            {a.answer && <div className="muted small mt-s" style={{ whiteSpace: 'pre-wrap' }}>{a.answer}</div>}
            {a.tips.length > 0 && <ul className="tips">{a.tips.map((t, j) => <li key={j} className={t.type}>{t.text}</li>)}</ul>}
          </div>
        ))}
      </div>
    </>
  );
}
