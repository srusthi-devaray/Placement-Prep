import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, useDebounced, useToast } from '../ui.jsx';
import { Quiz } from './CsLesson.jsx';

export default function CsLearn() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [practice, setPractice] = useState(null);   // { mode, questions }
  const dq = useDebounced(q, 300);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ q: dq, subject, level, status }).toString();
    api.get(`/cs?${qs}`).then((r) => { setData(r); setErr(''); }).catch((e) => setErr(e.message));
  }, [dq, subject, level, status]);
  useEffect(load, [load]);

  const startPractice = async (mode) => {
    try {
      const r = await api.get(`/cs/practice?mode=${mode}${subject ? `&subject=${subject}` : ''}&count=8`);
      if (!r.questions.length) { toast(r.message || 'Nothing to practise yet', 'info'); return; }
      setPractice({ mode, questions: r.questions, key: Date.now() });
    } catch (e) { toast(e.message, 'error'); }
  };

  if (err && !data) return <div className="card pad center"><p>{err}</p><button className="btn primary mt" onClick={load}>Retry</button></div>;
  if (!data) return <Loading />;

  if (practice) {
    return (
      <>
        <PageHeader icon="book" title={`CS practice: ${practice.mode}`} subtitle="Answers are graded by the server and saved, so weak topics are found from your real results.">
          <button className="btn ghost" onClick={() => { setPractice(null); load(); }}>Back to lessons</button>
        </PageHeader>
        <Quiz key={practice.key} questions={practice.questions} mode={practice.mode} onDone={load} />
      </>
    );
  }

  return (
    <>
      <PageHeader icon="book" title="CS Fundamentals" subtitle="Short lessons with quizzes on OOP, DBMS, SQL, Operating Systems and Networks. Weak lessons feed your study plan." />
      <div className="grid g3 mb">
        <div className="card pad center"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.stats.lessonsRead}/{data.stats.totalLessons}</div><div className="muted small">lessons read</div></div>
        <div className="card pad center"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.stats.questions ? `${data.stats.accuracy}%` : '-'}</div><div className="muted small">quiz accuracy ({data.stats.questions} questions)</div></div>
        <div className="card pad center"><div style={{ fontSize: 26, fontWeight: 800 }}>{data.mistakeCount}</div><div className="muted small">unresolved mistakes</div></div>
      </div>

      {data.next && (
        <div className="card pad mb"><div className="row between"><div><b>Recommended next:</b> {data.next.title}<div className="small muted">{data.next.reason}</div></div><Link className="btn primary" to={`/app/cs/${data.next.id}`}>Open lesson</Link></div></div>
      )}

      <div className="card pad mb">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <b>Practice:</b>
          <button className="btn sm ghost" onClick={() => startPractice('mixed')}>Mixed</button>
          <button className="btn sm ghost" onClick={() => startPractice('weak')} disabled={!data.weakLessons.length}>Weak lessons ({data.weakLessons.length})</button>
          <button className="btn sm ghost" onClick={() => startPractice('mistakes')} disabled={!data.mistakeCount}>Mistakes ({data.mistakeCount})</button>
          <span className="tiny muted">{subject ? 'Limited to the selected subject.' : ''}</span>
        </div>
      </div>

      <div className="card pad mb">
        <div className="form-row">
          <div><label htmlFor="cs-q">Search lessons</label><input id="cs-q" placeholder="e.g. deadlock, join, TCP" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><label htmlFor="cs-s">Subject</label><select id="cs-s" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">All</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label htmlFor="cs-l">Level</label><select id="cs-l" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">All</option><option>Beginner</option><option>Intermediate</option></select></div>
          <div><label htmlFor="cs-t">Status</label><select id="cs-t" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="unread">Not read yet</option><option value="read">Read</option><option value="weak">Needs revision</option></select></div>
        </div>
      </div>

      <div className="grid g2 mb">
        {data.subjects.map((s) => (
          <button key={s.id} className="card pad hover" style={{ textAlign: 'left' }} onClick={() => setSubject(subject === s.id ? '' : s.id)} aria-pressed={subject === s.id}>
            <b>{s.name}</b> <span className="muted small">{s.read}/{s.lessons} read{s.attempted ? ` · ${s.accuracy}% correct` : ''}</span>
            <div className="progress-bar" style={{ height: 6, marginTop: 6 }}><i style={{ width: `${s.lessons ? (s.read / s.lessons) * 100 : 0}%` }} /></div>
            <div className="tiny muted mt-s">{s.blurb}</div>
          </button>
        ))}
      </div>

      {!data.lessons.length ? <Empty icon="book" title="No lessons match">Try clearing the search or filters.</Empty> : (
        <div className="stack">
          {data.lessons.map((l) => (
            <Link key={l.id} to={`/app/cs/${l.id}`} className="card pad hover" style={{ color: 'inherit' }}>
              <div className="row between">
                <div><b>{l.title}</b><div className="small muted">{l.summary}</div></div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge">{l.level}</span><span className="badge">{l.minutes} min</span>
                  {l.read && <span className="badge tone-green">read</span>}
                  {l.accuracy !== null && <span className={`badge tone-${l.weak ? 'rose' : 'indigo'}`}>{l.accuracy}%</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <p className="tiny muted mt"><Icon name="shield" size={12} /> Lessons and questions are written for this app from standard computer-science material. They are study aids, not company interview questions.</p>
    </>
  );
}
