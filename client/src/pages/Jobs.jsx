import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, Ring, fmtDate, todayStr, useDebounced, useResource, useToast } from '../ui.jsx';

const BOARDS = [
  ['Internshala', 'https://internshala.com/internships'], ['LinkedIn Jobs', 'https://www.linkedin.com/jobs'], ['Naukri', 'https://www.naukri.com'],
  ['Unstop', 'https://unstop.com/jobs'], ['Wellfound', 'https://wellfound.com/jobs'], ['Infosys Springboard', 'https://infyspringboard.onwingspan.com']
];

export default function Jobs() {
  const toast = useToast();
  const saved = useResource('/opportunities');
  const companies = useResource('/companies');
  const [f, setF] = useState({ title: '', company: '', link: '', jd: '' });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('feed');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const check = async () => {
    setBusy(true);
    try { setRes(await api.post('/opportunities/analyze', { jd: f.jd })); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const save = async () => {
    if (!f.title.trim()) { toast('Add a job title to save it', 'error'); return; }
    try {
      await saved.create({ title: f.title, company: f.company, link: f.link, jd: f.jd, matchPercent: res ? res.percent : 0, matchedSkills: res ? res.matched : [], missingSkills: res ? res.missing : [] });
      toast('Saved', 'success'); setF({ title: '', company: '', link: '', jd: '' }); setRes(null);
    } catch (e) { toast(e.message, 'error'); }
  };
  const toTracker = async (o) => {
    if (!confirm(`Add "${o.title}" to your company tracker as Applied? Only do this if you have actually applied.`)) return;
    try { await companies.create({ name: o.company || o.title, role: o.title, status: 'Applied', date: todayStr(), notes: o.link ? `Link: ${o.link}${o.source ? ` (source: ${o.source})` : ''}` : '' }); await saved.update(o._id, { status: 'Applied' }); toast('Added to your company tracker', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader icon="briefcase" title="Jobs & Internships" subtitle="Browse listings from official job APIs, or paste any description to see how well your skills match. Save jobs and move them to your tracker." />
      <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'feed'} className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}><Icon name="globe" size={15} /> Live listings</button><button role="tab" aria-selected={tab === 'paste'} className={tab === 'paste' ? 'on' : ''} onClick={() => setTab('paste')}><Icon name="edit" size={15} /> Paste a description</button></div>
      {tab === 'feed' && <Feed saved={saved} />}
      {tab === 'paste' && <div className="builder-grid">
        <div className="card pad">
          <div className="form-row">
            <div><label htmlFor="j-t">Job title</label><input id="j-t" placeholder="e.g. Software Engineer Intern" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
            <div><label htmlFor="j-c">Company</label><input id="j-c" value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
          </div>
          <div className="field mt"><label htmlFor="j-l">Link (optional)</label><input id="j-l" type="url" placeholder="https://..." value={f.link} onChange={(e) => set('link', e.target.value)} /></div>
          <div className="field"><label htmlFor="j-d">Job description</label><textarea id="j-d" style={{ minHeight: 200 }} placeholder="Paste the full description, including the requirements..." value={f.jd} onChange={(e) => set('jd', e.target.value)} /></div>
          <div className="row"><button className="btn primary" onClick={check} disabled={busy}>{busy ? 'Checking...' : 'Check my match'}</button><button className="btn ghost" onClick={save}>Save</button></div>
          <div className="mt"><div className="small muted mb">Find openings on</div><div className="chips">{BOARDS.map(([n, u]) => <a key={n} className="chip" href={u} target="_blank" rel="noopener noreferrer">{n} ↗</a>)}</div></div>
        </div>
        <div className="card pad">
          {res ? (
            <div className="stack">
              <div className="row nowrap" style={{ gap: 18 }}><Ring value={res.percent} size={100} /><div><h3>{res.percent >= 75 ? 'Strong match' : res.percent >= 40 ? 'Decent match' : 'Stretch role'}</h3><p className="muted small">{res.matched.length} of {res.required.length} required skills matched</p></div></div>
              <div><div className="small muted">You have</div><div className="chips">{res.matched.length ? res.matched.map((s) => <span key={s} className="chip hit">✓ {s}</span>) : <span className="muted small">None</span>}</div></div>
              <div><div className="small muted">Missing</div><div className="chips">{res.missing.length ? res.missing.map((s) => <span key={s} className="chip miss">{s}</span>) : <span className="muted small">None</span>}</div></div>
              <ul className="tips">{res.advice.map((a, i) => <li key={i} className="warn">{a}</li>)}</ul>
            </div>
          ) : <Empty icon="briefcase" title="Check your fit">Paste a description and press "Check my match".</Empty>}
        </div>
      </div>}

      <div className="card pad mt">
        <div className="row between"><div className="card-title" style={{ margin: 0 }}><Icon name="bookmark" size={18} /> Saved opportunities</div>
          {saved.items && saved.items.some((o) => o.source) && <button className="btn sm ghost" onClick={async () => { try { await api.post('/jobs/check-saved'); saved.reload(); toast('Listings re-checked', 'success'); } catch (e) { toast(e.message, 'error'); } }}>Re-check listings</button>}</div>
        {!saved.items ? <Loading /> : saved.items.length ? saved.items.map((o) => (
          <div key={o._id} className="list-item">
            <b style={{ minWidth: 48 }}>{o.matchPercent}%</b>
            <div className="grow">
              <div className="title">{o.title}{o.company && <span className="muted"> · {o.company}</span>}</div>
              <div className="muted small">{fmtDate(o.createdAt)} · {o.status}{o.location ? ` · ${o.location}` : ''}{o.missingSkills.length ? ` · missing: ${o.missingSkills.slice(0, 4).join(', ')}` : ''}</div>
              {o.source && <div className="tiny muted">External listing from <b>{o.source}</b>{o.fetchedAt ? `, data fetched ${fmtDate(o.fetchedAt)}` : ''}.{o.listingCheck ? ` ${o.listingCheck}` : ''}</div>}
            </div>
            {o.link && <a className="btn sm ghost" href={o.link} target="_blank" rel="noopener noreferrer">Open original ↗</a>}
            {o.status !== 'Applied' && <button className="btn sm primary" onClick={() => toTracker(o)} title="Adds it to your company tracker as Applied">I applied</button>}
            <button className="btn sm danger" aria-label="Delete" onClick={async () => { if (confirm('Remove this opportunity?')) await saved.remove(o._id); }}><Icon name="x" size={15} /></button>
          </div>
        )) : <p className="muted small">Nothing saved yet.</p>}
      </div>
    </>
  );
}

/* ---------------- live feed ---------------- */
const TYPES = [['all', 'All types'], ['internship', 'Internship'], ['full-time', 'Full-time'], ['part-time', 'Part-time'], ['contract', 'Contract']];
const EXPS = [['all', 'Any experience'], ['fresher', 'Fresher / entry level'], ['junior', '1-3 years'], ['experienced', '3+ years']];

function Feed({ saved }) {
  const toast = useToast();
  const [f, setF] = useState({ q: '', location: '', skills: '', type: 'all', exp: 'all', source: 'all', sort: 'match' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const dq = useDebounced(f.q, 400), dl = useDebounced(f.location, 400), ds = useDebounced(f.skills, 400);
  const set = (k, v) => { setPage(1); setF((s) => ({ ...s, [k]: v })); };

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ q: dq, location: dl, skills: ds, type: f.type, exp: f.exp, source: f.source, sort: f.sort, page });
    try { setErr(''); setData(await api.get(`/jobs/feed?${qs}`)); } catch (e) { setErr(e.message); setData({ items: [], sources: [], total: 0, pages: 1 }); }
  }, [dq, dl, ds, f.type, f.exp, f.source, f.sort, page]);
  useEffect(() => { load(); }, [load]);

  const save = async (j) => {
    try { await api.post('/jobs/save', { source: j.source, externalId: j.externalId }); toast('Saved', 'success'); saved.reload(); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const src = data ? data.sources : [];

  return (
    <div className="stack">
      <div className="notice-bar" role="note"><span>Listings come from <b>official job APIs</b> (not scraped from websites) and are shown as the provider supplies them. We cannot confirm a job is still open - always check the original page before applying. Application deadlines are shown only when the source provides one (these sources do not).</span></div>
      <div className="toolbar">
        <input placeholder="Search title or company" aria-label="Search title or company" value={f.q} onChange={(e) => set('q', e.target.value)} />
        <input placeholder="Location (e.g. India, remote)" aria-label="Location" value={f.location} onChange={(e) => set('location', e.target.value)} />
        <input placeholder="Skills, comma separated (e.g. React, Node.js)" aria-label="Skills" value={f.skills} onChange={(e) => set('skills', e.target.value)} />
        <select aria-label="Job type" value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Experience level" value={f.exp} onChange={(e) => set('exp', e.target.value)}>{EXPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Sort" value={f.sort} onChange={(e) => set('sort', e.target.value)}><option value="match">Best match first</option><option value="new">Newest first</option></select>
      </div>
      {!data ? <Loading /> : (
        <>
          <div className="small muted">
            {src.map((s) => <div key={s.id}>{s.enabled ? (s.ok ? <>Source <b>{s.label}</b>: {s.count} listings{s.fetchedAt ? `, last updated ${new Date(s.fetchedAt).toLocaleString()}` : ''}. {s.note}</> : <>Source <b>{s.label}</b> is not responding right now{s.fetchedAt ? ` (showing data from ${new Date(s.fetchedAt).toLocaleString()})` : ''}.</>) : <>{s.label}: {s.note}</>}</div>)}
          </div>
          {err && <div className="error-text" role="alert">{err}</div>}
          {!data.hasProfileSkills && <div className="small muted">Tip: analyse your resume or add skills in your profile so match percentages reflect your real skills.</div>}
          {data.items.length ? data.items.map((j) => (
            <div key={`${j.source}-${j.externalId}`} className="card pad">
              <div className="row between nowrap" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}><b style={{ fontSize: 17 }}>{j.title}</b><span className="badge tone-violet">{j.jobType === 'unknown' ? 'type not stated' : j.jobType}</span>{j.remote && <span className="badge tone-cyan">remote</span>}</div>
                  <div className="muted">{j.company} · {j.location}{j.salary ? ` · ${j.salary}` : ''}</div>
                </div>
                {j.matchPercent !== null ? <div className="center"><Ring value={j.matchPercent} size={64} /><div className="tiny muted">skill match</div></div> : <span className="tiny muted" title="No technical skills could be detected in this listing">match n/a</span>}
              </div>
              <div className="grid g2 mt-s small">
                <div><span className="muted">Experience:</span> {j.experience}</div>
                <div><span className="muted">Eligibility:</span> {j.eligibility}</div>
                <div><span className="muted">Application deadline:</span> not provided by source</div>
                <div><span className="muted">Posted:</span> {j.postedAt ? `${fmtDate(j.postedAt)}${j.ageDays !== null ? ` (${j.ageDays} days ago)` : ''}` : 'unknown'}{j.ageDays > 60 && <span className="badge tone-amber" style={{ marginLeft: 6 }}>old posting - may be closed</span>}</div>
              </div>
              {j.skills.length > 0 && <div className="chips mt-s">{j.skills.slice(0, 12).map((s) => <span key={s} className={`chip ${j.matchedSkills.includes(s) ? 'hit' : 'miss'}`}>{j.matchedSkills.includes(s) ? '✓ ' : ''}{s}</span>)}</div>}
              <details className="small mt-s"><summary style={{ cursor: 'pointer' }}>Description (as provided by the source)</summary><div style={{ whiteSpace: 'pre-wrap' }} className="muted mt-s">{j.description}</div></details>
              <div className="row between mt">
                <span className="tiny muted">External listing · Source: <b>{j.source}</b> · fetched {new Date(j.fetchedAt).toLocaleString()}</span>
                <div className="row"><a className="btn sm primary" href={j.url} target="_blank" rel="noopener noreferrer">View & apply on {j.source} ↗</a><button className="btn sm ghost" disabled={j.saved} onClick={() => save(j)}>{j.saved ? 'Saved' : 'Save'}</button></div>
              </div>
            </div>
          )) : <Empty icon="briefcase" title="No listings match">Try fewer filters. The free sources are mostly remote tech jobs, so India on-site internships may not appear - use the board links in "Paste a description" for those.</Empty>}
          {data.pages > 1 && <div className="row center" style={{ justifyContent: 'center' }}><button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="small muted">Page {page} of {data.pages} ({data.total} results)</span><button className="btn sm ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
        </>
      )}
    </div>
  );
}
