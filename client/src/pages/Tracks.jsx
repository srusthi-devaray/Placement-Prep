import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, Loading, PageHeader, todayStr, useToast } from '../ui.jsx';

const TONE = { official: 'green', editorial: 'indigo', reported: 'amber' };

function SourceBadge({ source, map }) {
  const m = map[source];
  return <span className={`badge tone-${TONE[source] || 'slate'}`} title={m ? m.note : ''}>{m ? m.label : source}</span>;
}

export default function Tracks() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState(null);
  const [track, setTrack] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = params.get('company') || '';

  useEffect(() => { api.get('/tracks').then(setList).catch((e) => toast(e.message, 'error')); }, [toast]);
  useEffect(() => {
    setTrack(null);
    if (id) api.get(`/tracks/${id}`).then(setTrack).catch((e) => toast(e.message, 'error'));
  }, [id, toast]);

  const addToPlan = async () => {
    setBusy(true);
    try {
      await api.put('/plan/settings', { targetCompany: track.id });
      const r = await api.post('/plan/generate', { today: todayStr(), days: 7 });
      toast(`${track.name} is now your target. Added ${r.created} tasks to your plan.`, 'success');
      navigate('/app/planner');
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!list) return <Loading />;
  return (
    <>
      <PageHeader icon="layers" title="Company Prep Tracks" subtitle="Structured preparation paths. Every block is labelled by where the information comes from." />
      <div className="notice-bar mb" role="note">
        <span><b>Please read:</b> these tracks are preparation guidance, <b>not</b> lists of real interview questions. Companies do not publish their questions, and unofficial lists are often outdated or wrong. Practice prompts here are written by this app. Always check the company's official careers page for the current process.</span>
      </div>
      <div className="chips mb">
        {list.map((c) => <button key={c.id} className={`chip btn-chip ${id === c.id ? 'hit' : ''}`} aria-pressed={id === c.id} onClick={() => setParams({ company: c.id })}>{c.name} <span className="muted">· {c.kind}</span></button>)}
      </div>
      {!id && <div className="grid gfill">{list.map((c) => <button key={c.id} className="card pad hover" style={{ textAlign: 'left' }} onClick={() => setParams({ company: c.id })}><b style={{ fontSize: 18 }}>{c.name}</b><span className={`badge tone-${c.kind === 'product' ? 'violet' : 'cyan'}`} style={{ marginLeft: 8 }}>{c.kind === 'product' ? 'Product company' : 'IT services'}</span><p className="muted small mt-s">{c.summary}</p><p className="tiny muted">{c.verifiedAt ? `Verified ${c.verifiedAt}` : `Not verified · written ${c.authoredAt}`}</p></button>)}</div>}
      {id && !track && <Loading />}
      {track && (
        <div className="stack">
          <div className="card pad">
            <div className="row between">
              <div><h2>{track.name}</h2><p className="muted">{track.summary}</p></div>
              <button className="btn primary" onClick={addToPlan} disabled={busy}>{busy ? 'Planning...' : 'Make this my target & plan my week'}</button>
            </div>
            <div className="chips mt-s">{track.official.map((o) => <a key={o.url} className="chip hit" href={o.url} target="_blank" rel="noopener noreferrer">{o.label} ↗</a>)}</div>
            <p className="tiny muted mt-s">{track.disclaimer}</p>
            {track.meta && <p className={`small mt-s ${track.meta.verifiedAt ? '' : 'muted'}`}><Icon name={track.meta.verifiedAt ? 'shield' : 'info'} size={14} /> <b>{track.meta.verifiedAt ? `Verified ${track.meta.verifiedAt}` : 'Not verified'}</b> · Written {track.meta.authoredAt}. {track.meta.verification}{track.meta.sourceNote ? ` ${track.meta.sourceNote}` : ''}</p>}
            <div className="row tiny muted mt-s" style={{ gap: 8 }}>Source labels: {Object.entries(track.sourceKey).map(([k, v]) => <span key={k}><SourceBadge source={k} map={track.sourceKey} /> {v.note}</span>)}</div>
          </div>

          <div className="grid g2">
            <div className="card pad">
              <div className="row between"><div className="card-title" style={{ margin: 0 }}>Typical stages</div><SourceBadge source={track.stages.source} map={track.sourceKey} /></div>
              <ol style={{ paddingLeft: 20 }}>{track.stages.items.map((s) => <li key={s} className="small" style={{ padding: '4px 0' }}>{s}</li>)}</ol>
            </div>
            <div className="card pad">
              <div className="row between"><div className="card-title" style={{ margin: 0 }}>DSA patterns</div><SourceBadge source={track.dsa.source} map={track.sourceKey} /></div>
              <p className="small muted">{track.dsa.note}</p>
              {track.dsa.items.map((d) => (
                <Link key={d.topic} to={`/app/code?topic=${encodeURIComponent(d.topic)}`} className="list-item" style={{ padding: '8px 0', color: 'inherit' }}>
                  <div className="grow"><b>{d.topic}</b><div className="progress-bar" style={{ height: 6, marginTop: 5 }}><i style={{ width: `${d.total ? (d.solved / d.total) * 100 : 0}%` }} /></div></div>
                  <span className="muted small">{d.solved}/{d.total}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid g2">
            <div className="card pad">
              <div className="row between"><div className="card-title" style={{ margin: 0 }}>CS fundamentals</div><SourceBadge source={track.cs.source} map={track.sourceKey} /></div>
              <ul style={{ paddingLeft: 18 }}>{track.cs.topics.map((t) => <li key={t} className="small" style={{ padding: '3px 0' }}>{t}</li>)}</ul>
              <Link className="btn sm ghost" to="/app/knowledge">Open Knowledge Base</Link>
            </div>
            <div className="card pad">
              <div className="row between"><div className="card-title" style={{ margin: 0 }}>Aptitude focus</div><SourceBadge source={track.aptitude.source} map={track.sourceKey} /></div>
              {track.aptitude.note && <p className="small muted">{track.aptitude.note}</p>}
              <div className="chips">{track.aptitude.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              <Link className="btn sm ghost mt" to="/app/aptitude">Practice aptitude</Link>
            </div>
          </div>

          <div className="card pad">
            <div className="row between"><div className="card-title" style={{ margin: 0 }}>{track.behavioral.title}</div><SourceBadge source={track.behavioral.source} map={track.sourceKey} /></div>
            <p className="small muted">{track.behavioral.tip}</p>
            {track.behavioral.principles && <div className="chips mt-s">{track.behavioral.principles.map((p) => <span key={p} className="chip">{p}</span>)}</div>}
            <div className="row between mt"><b className="small">Practice prompts</b><span className="badge tone-indigo" title="Written by this app for practice. Not actual interview questions.">App-written practice prompts</span></div>
            <ul style={{ paddingLeft: 18 }}>{track.behavioral.prompts.map((q) => <li key={q} className="small" style={{ padding: '4px 0' }}>{q}</li>)}</ul>
            <div className="chips"><span className="small muted">Mock interview categories:</span>{track.mock.map((m) => <Link key={m} className="chip btn-chip" to="/app/mock">{m}</Link>)}</div>
          </div>
        </div>
      )}
    </>
  );
}
