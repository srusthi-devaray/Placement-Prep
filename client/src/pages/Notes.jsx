import { useMemo, useState } from 'react';
import { Empty, FormModal, Icon, Loading, PageHeader, fmtDate, useResource, useToast } from '../ui.jsx';

const CATS = ['General', 'DSA', 'DBMS', 'Web', 'CS Core', 'Backend', 'HR', 'Aptitude', 'Projects'];
const fields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'category', label: 'Category', type: 'select', options: CATS },
  { name: 'content', label: 'Content', type: 'textarea', rows: 9 },
  { name: 'pinned', label: 'Pin to top', type: 'checkbox' }
];

export default function Notes() {
  const toast = useToast();
  const res = useResource('/notes');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [modal, setModal] = useState(null);

  const rows = useMemo(() => (res.items || []).filter((n) => (!cat || n.category === cat) && `${n.title} ${n.content}`.toLowerCase().includes(q.toLowerCase())), [res.items, q, cat]);
  if (!res.items) return <Loading />;

  return (
    <>
      <PageHeader icon="book" title="Study Notes" subtitle="Your notes are also searched by PlaceBot, so it can answer using what you wrote.">
        <button className="btn primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> New note</button>
      </PageHeader>
      <div className="toolbar">
        <input placeholder="Search notes..." aria-label="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div className="grid gfill">
        {rows.length ? rows.map((n) => (
          <div className="card pad stack sm" key={n._id}>
            <h3 style={{ fontSize: 17 }}>{n.pinned && '📌 '}{n.title}</h3>
            <div className="row" style={{ gap: 8 }}><span className="badge tone-violet">{n.category}</span><span className="muted small">{fmtDate(n.updatedAt)}</span></div>
            <div className="note-body">{n.content.length > 300 ? `${n.content.slice(0, 300)}...` : n.content}</div>
            <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
              <button className="btn sm ghost" onClick={async () => { try { await res.update(n._id, { pinned: !n.pinned }); } catch (e) { toast(e.message, 'error'); } }}>{n.pinned ? 'Unpin' : 'Pin'}</button>
              <button className="btn sm ghost" onClick={() => setModal({ note: n })}>Open / Edit</button>
              <button className="btn sm danger" onClick={async () => { if (confirm('Delete this note?')) await res.remove(n._id); }}>Delete</button>
            </div>
          </div>
        )) : <div style={{ gridColumn: '1/-1' }}><Empty icon="book" title={res.items.length ? 'No notes match' : 'No notes yet'}>Save formulas, definitions and things you keep forgetting.</Empty></div>}
      </div>
      {modal && <FormModal title={modal.note ? 'Edit note' : 'New note'} fields={fields} values={modal.note || {}} onClose={() => setModal(null)}
        onSubmit={async (d) => { if (modal.note) await res.update(modal.note._id, d); else await res.create(d); }} />}
    </>
  );
}
