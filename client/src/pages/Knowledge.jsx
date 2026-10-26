import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, useDebounced, useToast } from '../ui.jsx';

export default function Knowledge() {
  const toast = useToast();
  const [topics, setTopics] = useState(null);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [hits, setHits] = useState(null);
  const [tag, setTag] = useState('');

  useEffect(() => { api.get('/kb/topics').then(setTopics).catch((e) => toast(e.message, 'error')); }, [toast]);
  useEffect(() => {
    if (!dq.trim()) { setHits(null); return undefined; }
    let live = true;
    api.get(`/kb/search?q=${encodeURIComponent(dq)}`).then((r) => { if (live) setHits(r); }).catch((e) => toast(e.message, 'error'));
    return () => { live = false; };
  }, [dq, toast]);

  if (!topics) return <Loading />;
  const tags = [...new Set(topics.flatMap((t) => t.tags || []))].sort();
  const list = hits || topics.filter((t) => !tag || (t.tags || []).includes(tag));

  return (
    <>
      <PageHeader icon="book" title="Knowledge Base" subtitle="Quick revision answers for common placement topics. Searches your own notes too. PlaceBot uses the same sources." />
      <div className="toolbar">
        <input placeholder="Search e.g. normalization, deadlock, STAR method..." aria-label="Search knowledge" value={q} onChange={(e) => setQ(e.target.value)} />
        {!hits && <select aria-label="Topic" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All topics</option>{tags.map((t) => <option key={t}>{t}</option>)}</select>}
      </div>
      <div className="grid gfill">
        {list.length ? list.map((d) => (
          <details key={`${d.source}-${d.id}`} className="card pad">
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{d.title} {d.source === 'note' && <span className="badge tone-amber">Your note</span>}</summary>
            <div className="chips mt-s">{(d.tags || []).map((t) => <span key={t} className="chip">{t}</span>)}</div>
            <div className="note-body mt-s" style={{ whiteSpace: 'pre-wrap' }}>{d.text}</div>
          </details>
        )) : <div style={{ gridColumn: '1/-1' }}><Empty icon="book" title="No results">Try different words, or ask PlaceBot.</Empty></div>}
      </div>
      <p className="muted small mt"><Icon name="sparkles" size={14} /> Tip: ask PlaceBot a follow-up question about any topic here.</p>
    </>
  );
}
