import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, Loading, Markdown, PageHeader, useToast } from '../ui.jsx';

// Reusable quiz: shows questions one list, collects answers, sends them to the server for grading, shows explanations.
export function Quiz({ questions, mode, lessonId, onDone }) {
  const toast = useToast();
  const [ans, setAns] = useState({});
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const start = useRef(Date.now());
  const times = useRef({});
  const last = useRef(Date.now());

  const pick = (qid, i) => {
    const now = Date.now();
    times.current[qid] = (times.current[qid] || 0) + Math.round((now - last.current) / 1000);
    last.current = now;
    setAns((a) => ({ ...a, [qid]: i }));
  };
  const submit = async () => {
    setBusy(true);
    try {
      const answers = questions.map((q) => ({ id: q.id, choice: ans[q.id] === undefined ? -1 : ans[q.id], timeSec: times.current[q.id] || 0 }));
      const r = await api.post('/cs/grade', { mode, lessonId, answers });
      setRes(r); if (onDone) onDone(r);
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const byId = res ? Object.fromEntries(res.results.map((x) => [x.id, x])) : {};
  const answered = Object.keys(ans).length;

  return (
    <div className="stack">
      {res && (
        <div className="card pad" role="status">
          <b style={{ fontSize: 20 }}>Score: {res.score}/{res.total} ({res.percent}%)</b>
          <p className="tiny muted">{res.note} Took {Math.round((Date.now() - start.current) / 1000)}s.</p>
          {res.results.some((r) => !r.correct) && <p className="small">Read the explanations below. Wrong answers will be offered again in "Mistakes" practice.</p>}
        </div>
      )}
      {questions.map((q, n) => {
        const r = byId[q.id];
        return (
          <fieldset key={q.id} className="card pad" style={{ border: '1px solid var(--line)' }}>
            <legend className="small muted" style={{ padding: '0 6px' }}>Question {n + 1}</legend>
            <p style={{ fontWeight: 600 }}>{q.q}</p>
            {q.options.map((o) => {
              const chosen = ans[q.id] === o.i;
              const mark = r ? (o.i === r.answer ? 'correct' : chosen ? 'wrong' : '') : '';
              return (
                <label key={o.i} className={`opt ${chosen ? 'sel' : ''} ${mark}`} style={{ display: 'flex', gap: 8, padding: '8px 10px', margin: '6px 0', border: '1px solid var(--line)', borderRadius: 8, cursor: res ? 'default' : 'pointer', background: mark === 'correct' ? 'rgba(16,185,129,.14)' : mark === 'wrong' ? 'rgba(239,68,68,.14)' : chosen ? 'rgba(99,102,241,.12)' : 'transparent' }}>
                  <input type="radio" name={q.id} checked={chosen} disabled={!!res} onChange={() => pick(q.id, o.i)} /> <span>{o.text}{mark === 'correct' ? ' ✓' : mark === 'wrong' ? ' ✗' : ''}</span>
                </label>
              );
            })}
            {r && <p className="small mt-s"><b>{r.correct ? 'Correct.' : `Answer: ${r.answerText}.`}</b> {r.explain}{!r.correct && r.lessonId && lessonId !== r.lessonId && <> <Link to={`/app/cs/${r.lessonId}`}>Review "{r.lessonTitle}"</Link></>}</p>}
          </fieldset>
        );
      })}
      {!res && <div><button className="btn primary" onClick={submit} disabled={busy || !answered}>{busy ? 'Checking...' : `Submit answers (${answered}/${questions.length})`}</button></div>}
    </div>
  );
}

export default function CsLesson() {
  const { id } = useParams();
  const toast = useToast();
  const [l, setL] = useState(null);
  const [err, setErr] = useState('');
  const [quizKey, setQuizKey] = useState(0);
  const [quizQs, setQuizQs] = useState(null);

  useEffect(() => {
    setL(null); setErr('');
    api.get(`/cs/lessons/${encodeURIComponent(id)}`).then((r) => { setL(r); setQuizQs(r.questions); }).catch((e) => setErr(e.message));
  }, [id]);

  const toggleRead = async () => {
    try { const r = await api.post(`/cs/lessons/${l.id}/read`, { read: !l.read }); setL({ ...l, read: r.read }); toast(r.read ? 'Marked as read' : 'Marked as unread', 'success'); } catch (e) { toast(e.message, 'error'); }
  };
  const retake = async () => {
    try { const r = await api.get(`/cs/lessons/${encodeURIComponent(id)}`); setQuizQs(r.questions); setQuizKey((k) => k + 1); } catch (e) { toast(e.message, 'error'); }
  };

  if (err) return <div className="card pad center"><p>{err}</p><Link className="btn primary mt" to="/app/cs">Back to lessons</Link></div>;
  if (!l) return <Loading />;
  return (
    <>
      <PageHeader icon="book" title={l.title} subtitle={`${l.level} · about ${l.minutes} min · ${l.summary}`}>
        <Link className="btn ghost" to="/app/cs">All lessons</Link>
        <button className={`btn ${l.read ? 'ghost' : 'primary'}`} onClick={toggleRead}>{l.read ? '✓ Read (undo)' : 'Mark as read'}</button>
      </PageHeader>
      <div className="card pad mb">
        <Markdown text={l.body} />
        <div className="chips mt">{l.keyPoints.map((k) => <span key={k} className="chip hit">{k}</span>)}</div>
        <p className="tiny muted mt">{l.source}</p>
      </div>
      <div className="row between mb"><h2 style={{ fontSize: 20 }}>Check yourself</h2><button className="btn sm ghost" onClick={retake}><Icon name="refresh" size={14} /> New attempt</button></div>
      <Quiz key={quizKey} questions={quizQs || []} mode="lesson" lessonId={l.id} />
    </>
  );
}
