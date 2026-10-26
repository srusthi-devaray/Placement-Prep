import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Empty, FormModal, Icon, Loading, PageHeader, useDebounced, useToast } from '../ui.jsx';

const FIELDS = [
  { name: 'title', label: 'Project name', required: true, placeholder: 'e.g. Placement Prep Tracker' },
  { name: 'description', label: 'What is it? (2-3 lines)', type: 'textarea', rows: 3 },
  { name: 'role', label: 'Your role', placeholder: 'e.g. Solo developer / Backend lead' },
  { name: 'techStack', label: 'Tech used (comma separated)', placeholder: 'React, Node.js, MongoDB' },
  { name: 'highlights', label: 'Key points (one per line, up to 8)', type: 'textarea', rows: 4, placeholder: 'Built JWT login with per-user data isolation' },
  { name: 'githubUrl', label: 'GitHub link', placeholder: 'https://github.com/you/project' },
  { name: 'liveUrl', label: 'Live demo link', placeholder: 'https://your-app.onrender.com' },
  { name: 'status', label: 'Status', type: 'select', options: ['completed', 'building', 'idea'], default: 'completed' },
  { name: 'featured', label: 'Feature this project (shown first)', type: 'checkbox' },
  { name: 'showPublic', label: 'Allow it on my public progress page (only if I turned that page on)', type: 'checkbox' }
];

export default function Projects() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('recent');
  const [edit, setEdit] = useState(null);       // null | {} (new) | project
  const dq = useDebounced(q, 300);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ q: dq, status, sort }).toString();
    api.get(`/projects?${qs}`).then((r) => { setRows(r); setErr(''); }).catch((e) => setErr(e.message));
  }, [dq, status, sort]);
  useEffect(load, [load]);

  const save = async (form) => {
    const body = { ...form };
    if (edit && edit._id) await api.put(`/projects/${edit._id}`, body); else await api.post('/projects', body);
    toast('Project saved', 'success'); load();
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try { await api.del(`/projects/${p._id}`); toast('Deleted', 'success'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader icon="star" title="My Projects" subtitle="Showcase what you built, with GitHub and live-demo links. These also power project-based questions in Mock Interview.">
        <button className="btn primary" onClick={() => setEdit({})}><Icon name="plus" size={16} /> Add project</button>
      </PageHeader>
      <div className="card pad mb">
        <div className="form-row">
          <div><label htmlFor="pj-q">Search</label><input id="pj-q" placeholder="Name, tech, description" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><label htmlFor="pj-s">Status</label><select id="pj-s" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="completed">Completed</option><option value="building">Building</option><option value="idea">Idea</option></select></div>
          <div><label htmlFor="pj-o">Sort</label><select id="pj-o" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Featured, then recent</option><option value="title">Name A-Z</option></select></div>
        </div>
      </div>
      {err && <div className="notice-bar mb" role="alert">{err} <button className="linklike" onClick={load}>Retry</button></div>}
      {!rows && !err ? <Loading /> : rows && !rows.length ? (
        <Empty icon="star" title={q || status ? 'No projects match' : 'No projects yet'}>{q || status ? 'Try clearing the search or filter.' : 'Add your first project. Recruiters and interviewers ask about projects first.'}</Empty>
      ) : (
        <div className="grid gfill">
          {(rows || []).map((p) => (
            <div key={p._id} className="card pad">
              <div className="row between"><b style={{ fontSize: 17 }}>{p.featured ? '★ ' : ''}{p.title}</b><span className="badge">{p.status}</span></div>
              {p.role && <div className="tiny muted">{p.role}</div>}
              {p.description && <p className="small mt-s">{p.description}</p>}
              {p.techStack && p.techStack.length > 0 && <div className="chips mt-s">{p.techStack.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
              {p.highlights && p.highlights.length > 0 && <ul className="small" style={{ paddingLeft: 18 }}>{p.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
              <div className="row mt" style={{ gap: 6 }}>
                {p.githubUrl && <a className="btn sm ghost" href={p.githubUrl} target="_blank" rel="noopener noreferrer">GitHub <Icon name="external" size={13} /></a>}
                {p.liveUrl && <a className="btn sm ghost" href={p.liveUrl} target="_blank" rel="noopener noreferrer">Live demo <Icon name="external" size={13} /></a>}
                <span className="grow" />
                {p.showPublic && <span className="tiny muted" title="Visible on your public page if sharing is on">public</span>}
                <button className="btn sm ghost" onClick={() => setEdit(p)}>Edit</button>
                <button className="btn sm danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <FormModal title={edit._id ? 'Edit project' : 'Add project'} fields={FIELDS}
        values={{ ...edit, techStack: (edit.techStack || []).join(', '), highlights: (edit.highlights || []).join('\n') }}
        onSubmit={save} onClose={() => setEdit(null)} />}
    </>
  );
}
