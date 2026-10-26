import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon, Loading, PageHeader, scoreColor, useToast } from '../ui.jsx';
import { useDictation } from '../lib/speech.js';
import { useAuth } from '../auth.jsx';

const EMPTY = {
  name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', summary: '',
  education: [{ school: '', degree: '', period: '', score: '' }],
  skills: '',
  projects: [{ name: '', tech: '', link: '', bullets: '' }],
  experience: [{ company: '', role: '', period: '', bullets: '' }],
  achievements: ''
};
const BLANKS = {
  education: { school: '', degree: '', period: '', score: '' },
  projects: { name: '', tech: '', link: '', bullets: '' },
  experience: { company: '', role: '', period: '', bullets: '' }
};
const lines = (s) => (s || '').split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

export function resumeToText(d) {
  const out = [d.name, d.title, [d.email, d.phone, d.location, d.linkedin, d.github].filter(Boolean).join(' | ')];
  if (d.summary) out.push('SUMMARY', d.summary);
  if (d.education.some((e) => e.school)) out.push('EDUCATION', ...d.education.filter((e) => e.school).map((e) => `${e.school} - ${e.degree} ${e.period} ${e.score}`));
  if (d.skills) out.push('SKILLS', d.skills);
  if (d.projects.some((p) => p.name)) out.push('PROJECTS', ...d.projects.filter((p) => p.name).flatMap((p) => [`${p.name} (${p.tech})`, ...lines(p.bullets).map((b) => `- ${b}`)]));
  if (d.experience.some((e) => e.company)) out.push('EXPERIENCE', ...d.experience.filter((e) => e.company).flatMap((e) => [`${e.role}, ${e.company} ${e.period}`, ...lines(e.bullets).map((b) => `- ${b}`)]));
  if (d.achievements) out.push('ACHIEVEMENTS', ...lines(d.achievements).map((b) => `- ${b}`));
  return out.filter(Boolean).join('\n');
}

export default function ResumeBuilder() {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [template, setTemplate] = useState('modern');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ats, setAts] = useState(null);
  const [improving, setImproving] = useState('');
  const [versions, setVersions] = useState(null);
  const [showVer, setShowVer] = useState(false);
  const [importing, setImporting] = useState(false);
  const dataRef = useRef(null); dataRef.current = data;
  const dict = useDictation({
    getText: () => (dataRef.current ? dataRef.current.summary : ''),
    setText: (v) => { setData((d) => ({ ...d, summary: v })); setDirty(true); },
    onError: (m) => toast(m, 'error')
  });

  useEffect(() => {
    api.get('/builder').then((r) => {
      if (r.data) { setData({ ...EMPTY, ...r.data }); setTemplate(r.template || 'modern'); }
      else setData({ ...EMPTY, name: (user && user.username) || '', email: (user && user.email) || '' });
    }).catch((e) => { toast(e.message, 'error'); setData({ ...EMPTY }); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // "Download PDF" opens the browser's print dialog; choose "Save as PDF". The file name comes from the page title.
  const printPdf = () => {
    const old = document.title;
    document.title = `${(data.name || 'Resume').replace(/[^\w .-]/g, '')} - Resume`;
    const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };
  const loadVersions = () => api.get('/builder/versions').then(setVersions).catch((e) => toast(e.message, 'error'));
  const saveVersion = async () => {
    const name = window.prompt('Name this version (e.g. "SDE resume - Amazon")', '');
    if (name === null) return;
    try { await api.post('/builder/versions', { name, template, data: dataRef.current }); toast('Version saved', 'success'); loadVersions(); } catch (e) { toast(e.message, 'error'); }
  };
  const restoreVersion = async (v) => {
    if (dirty && !window.confirm('You have unsaved changes. Restoring replaces your current resume. Continue?')) return;
    try { const r = await api.post(`/builder/versions/${v.id}/restore`); setData({ ...EMPTY, ...r.data }); setTemplate(r.template); setDirty(false); toast(`Restored "${v.name}"`, 'success'); } catch (e) { toast(e.message, 'error'); }
  };
  const renameVersion = async (v) => {
    const name = window.prompt('New name', v.name); if (!name) return;
    try { await api.put(`/builder/versions/${v.id}`, { name }); loadVersions(); } catch (e) { toast(e.message, 'error'); }
  };
  const deleteVersion = async (v) => {
    if (!window.confirm(`Delete version "${v.name}"?`)) return;
    try { await api.del(`/builder/versions/${v.id}`); loadVersions(); } catch (e) { toast(e.message, 'error'); }
  };
  const importProjects = async () => {
    setImporting(true);
    try {
      const ps = await api.get('/projects');
      if (!ps.length) { toast('You have no saved projects yet. Add some in My Projects.', 'info'); setImporting(false); return; }
      const have = new Set(data.projects.map((p) => p.name.trim().toLowerCase()));
      const add = ps.filter((p) => !have.has(p.title.trim().toLowerCase())).map((p) => ({ name: p.title, tech: (p.techStack || []).join(', '), link: p.liveUrl || p.githubUrl || '', bullets: (p.highlights && p.highlights.length ? p.highlights : p.description ? [p.description] : []).join('\n') }));
      if (!add.length) toast('All your saved projects are already in the resume', 'info');
      else { const base = data.projects.filter((p) => p.name || p.tech || p.bullets); set('projects', [...base, ...add]); toast(`Added ${add.length} project${add.length > 1 ? 's' : ''}. Review the text, then save.`, 'success'); }
    } catch (e) { toast(e.message, 'error'); }
    setImporting(false);
  };

  if (!data) return <Loading />;
  const set = (k, v) => { setData((d) => ({ ...d, [k]: v })); setDirty(true); };
  const setItem = (k, i, f, v) => set(k, data[k].map((x, j) => (j === i ? { ...x, [f]: v } : x)));
  const addItem = (k) => set(k, [...data[k], { ...BLANKS[k] }]);
  const delItem = (k, i) => set(k, data[k].length > 1 ? data[k].filter((_, j) => j !== i) : [{ ...BLANKS[k] }]);

  const save = async () => {
    setSaving(true);
    try { await api.put('/builder', { template, data }); setDirty(false); toast('Resume saved', 'success'); } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  const improve = async (kind, text, apply, key) => {
    if (!text || text.trim().length < 5) { toast('Write a few words first', 'error'); return; }
    setImproving(key);
    try {
      const r = await api.post('/ai/improve', { text, kind, target: data.title });
      apply(r.text);
      toast(r.ai ? 'Improved with AI' : 'Basic clean-up applied. Add an AI key for full rewrites.', 'success');
      if (!r.ai && r.tips && r.tips.length) toast(r.tips[0], 'info');
    } catch (e) { toast(e.message, 'error'); }
    setImproving('');
  };
  const checkAts = async () => {
    const text = resumeToText(data);
    if (text.length < 80) { toast('Fill in more of your resume first', 'error'); return; }
    try { const r = await api.post('/resume/analyze', { text }); setAts(r.result); } catch (e) { toast(e.message, 'error'); }
  };

  const Imp = ({ k, kind, text, apply }) => (
    <button type="button" className="btn sm ghost" disabled={improving === k} onClick={() => improve(kind, text, apply, k)}><Icon name="sparkles" size={13} /> {improving === k ? 'Working...' : 'Improve'}</button>
  );

  return (
    <>
      <PageHeader icon="file" title="Resume Builder" subtitle="Fill in your details, watch the live preview, then Download PDF (choose 'Save as PDF' in the print window).">
        <div className="seg"><button className={template === 'modern' ? 'on' : ''} onClick={() => { setTemplate('modern'); setDirty(true); }}>Modern</button><button className={template === 'classic' ? 'on' : ''} onClick={() => { setTemplate('classic'); setDirty(true); }}>Classic</button></div>
        <button className="btn ghost" onClick={() => { setShowVer(!showVer); if (!versions) loadVersions(); }}>Versions</button>
        <button className="btn ghost" onClick={checkAts}>Check ATS score</button>
        <button className="btn ghost" onClick={save} disabled={saving}>{saving ? 'Saving...' : dirty ? 'Save *' : 'Saved'}</button>
        <button className="btn primary" onClick={printPdf}><Icon name="download" size={16} /> Download PDF</button>
      </PageHeader>

      {showVer && (
        <div className="card pad mb">
          <div className="row between"><b>Saved versions</b><span className="row" style={{ gap: 6 }}><button className="btn sm primary" onClick={saveVersion}>Save current as new version</button><button className="btn sm ghost" onClick={() => setShowVer(false)}>Close</button></span></div>
          <p className="tiny muted">A version is a snapshot. Restoring one replaces the working resume (save a version of the current one first if you want to keep it).</p>
          {!versions ? <Loading /> : !versions.length ? <p className="muted small">No versions yet.</p> : versions.map((v) => (
            <div key={v.id} className="list-item"><div className="grow"><b>{v.name}</b><div className="tiny muted">{new Date(v.createdAt).toLocaleString()} · {v.template}{v.title ? ` · ${v.title}` : ''}</div></div>
              <button className="btn sm ghost" onClick={() => restoreVersion(v)}>Restore</button><button className="btn sm ghost" onClick={() => renameVersion(v)}>Rename</button><button className="btn sm danger" onClick={() => deleteVersion(v)}>Delete</button></div>
          ))}
        </div>
      )}

      {ats && (
        <div className="card pad mb">
          <div className="row between"><b>ATS score for this resume: <span style={{ color: scoreColor(ats.score) }}>{ats.score}/100 ({ats.label})</span></b><button className="btn sm ghost" onClick={() => setAts(null)}>Close</button></div>
          <ul className="tips">{ats.issues.slice(0, 5).map((i, k) => <li key={k} className="warn">{i.text}</li>)}</ul>
        </div>
      )}

      <div className="builder-grid">
        <div className="stack">
          <div className="card pad">
            <div className="card-title">Basics</div>
            <div className="form-row">
              <div><label htmlFor="b-n">Full name</label><input id="b-n" value={data.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label htmlFor="b-t">Headline / target role</label><input id="b-t" placeholder="e.g. Full Stack Developer" value={data.title} onChange={(e) => set('title', e.target.value)} /></div>
            </div>
            <div className="form-row mt-s">
              <div><label htmlFor="b-e">Email</label><input id="b-e" type="email" value={data.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div><label htmlFor="b-p">Phone</label><input id="b-p" value={data.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              <div><label htmlFor="b-l">Location</label><input id="b-l" value={data.location} onChange={(e) => set('location', e.target.value)} /></div>
            </div>
            <div className="form-row mt-s">
              <div><label htmlFor="b-li">LinkedIn</label><input id="b-li" placeholder="linkedin.com/in/you" value={data.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></div>
              <div><label htmlFor="b-gh">GitHub</label><input id="b-gh" placeholder="github.com/you" value={data.github} onChange={(e) => set('github', e.target.value)} /></div>
            </div>
          </div>

          <div className="card pad">
            <div className="row between"><div className="card-title" style={{ margin: 0 }}>Summary</div>
              <span className="row" style={{ gap: 6 }}>{dict.supported && <button type="button" className={`btn sm ${dict.listening ? 'solid-danger' : 'ghost'}`} onClick={dict.toggle}><Icon name={dict.listening ? 'stop' : 'mic'} size={13} /> {dict.listening ? 'Stop' : 'Dictate'}</button>}
                <Imp k="sum" kind="summary" text={data.summary} apply={(t) => set('summary', t)} /></span></div>
            <textarea aria-label="Summary" className="mt-s" placeholder="2-3 lines about you, your strongest skills and what you want." value={data.summary} onChange={(e) => set('summary', e.target.value)} />
          </div>

          <div className="card pad">
            <div className="row between"><div className="card-title" style={{ margin: 0 }}>Education</div><button className="btn sm ghost" onClick={() => addItem('education')}><Icon name="plus" size={13} /> Add</button></div>
            {data.education.map((e, i) => (
              <div key={i} className="repeat-card">
                <div className="form-row"><div><label>College / school</label><input value={e.school} onChange={(x) => setItem('education', i, 'school', x.target.value)} /></div><div><label>Degree</label><input value={e.degree} onChange={(x) => setItem('education', i, 'degree', x.target.value)} /></div></div>
                <div className="form-row mt-s"><div><label>Period</label><input placeholder="2022 - 2026" value={e.period} onChange={(x) => setItem('education', i, 'period', x.target.value)} /></div><div><label>CGPA / %</label><input value={e.score} onChange={(x) => setItem('education', i, 'score', x.target.value)} /></div>
                  <button className="btn sm danger" onClick={() => delItem('education', i)}>Remove</button></div>
              </div>
            ))}
          </div>

          <div className="card pad">
            <div className="card-title">Skills</div>
            <textarea aria-label="Skills" style={{ minHeight: 80 }} placeholder="Languages: JavaScript, Python, Java&#10;Frameworks: React, Node.js, Express&#10;Databases: MongoDB, MySQL" value={data.skills} onChange={(e) => set('skills', e.target.value)} />
          </div>

          <div className="card pad">
            <div className="row between"><div className="card-title" style={{ margin: 0 }}>Projects</div><span className="row" style={{ gap: 6 }}><button className="btn sm ghost" disabled={importing} onClick={importProjects}>Import from My Projects</button><button className="btn sm ghost" onClick={() => addItem('projects')}><Icon name="plus" size={13} /> Add</button></span></div>
            {data.projects.map((p, i) => (
              <div key={i} className="repeat-card">
                <div className="form-row"><div><label>Project name</label><input value={p.name} onChange={(x) => setItem('projects', i, 'name', x.target.value)} /></div><div><label>Tech used</label><input placeholder="React, Node, MongoDB" value={p.tech} onChange={(x) => setItem('projects', i, 'tech', x.target.value)} /></div></div>
                <div className="field mt-s"><label>Link</label><input value={p.link} onChange={(x) => setItem('projects', i, 'link', x.target.value)} /></div>
                <div className="field"><label>What you did (one point per line)</label><textarea value={p.bullets} onChange={(x) => setItem('projects', i, 'bullets', x.target.value)} /></div>
                <div className="row"><Imp k={`p${i}`} kind="project" text={p.bullets} apply={(t) => setItem('projects', i, 'bullets', t.replace(/^- /gm, ''))} /><span className="grow" /><button className="btn sm danger" onClick={() => delItem('projects', i)}>Remove</button></div>
              </div>
            ))}
          </div>

          <div className="card pad">
            <div className="row between"><div className="card-title" style={{ margin: 0 }}>Experience / internships</div><button className="btn sm ghost" onClick={() => addItem('experience')}><Icon name="plus" size={13} /> Add</button></div>
            {data.experience.map((e, i) => (
              <div key={i} className="repeat-card">
                <div className="form-row"><div><label>Company</label><input value={e.company} onChange={(x) => setItem('experience', i, 'company', x.target.value)} /></div><div><label>Role</label><input value={e.role} onChange={(x) => setItem('experience', i, 'role', x.target.value)} /></div><div><label>Period</label><input value={e.period} onChange={(x) => setItem('experience', i, 'period', x.target.value)} /></div></div>
                <div className="field mt-s"><label>What you did (one point per line)</label><textarea value={e.bullets} onChange={(x) => setItem('experience', i, 'bullets', x.target.value)} /></div>
                <div className="row"><Imp k={`e${i}`} kind="project" text={e.bullets} apply={(t) => setItem('experience', i, 'bullets', t.replace(/^- /gm, ''))} /><span className="grow" /><button className="btn sm danger" onClick={() => delItem('experience', i)}>Remove</button></div>
              </div>
            ))}
          </div>

          <div className="card pad">
            <div className="card-title">Achievements & certifications</div>
            <textarea aria-label="Achievements" placeholder="One per line" value={data.achievements} onChange={(e) => set('achievements', e.target.value)} />
          </div>
        </div>

        <div className="builder-preview"><Sheet d={data} template={template} /></div>
      </div>
    </>
  );
}

function Sheet({ d, template }) {
  const contact = [d.email, d.phone, d.location, d.linkedin, d.github].filter(Boolean);
  const edu = d.education.filter((e) => e.school);
  const proj = d.projects.filter((p) => p.name);
  const exp = d.experience.filter((e) => e.company);
  const skillLines = lines(d.skills);
  return (
    <div className={`sheet ${template === 'classic' ? 'classic' : ''}`}>
      <h1>{d.name || <span className="empty-hint">Your Name</span>}</h1>
      {d.title && <div className="sub">{d.title}</div>}
      {contact.length > 0 && <div className="contact">{contact.map((c) => <span key={c}>{c}</span>)}</div>}
      {d.summary && <><h2>Summary</h2><div>{d.summary}</div></>}
      {edu.length > 0 && <><h2>Education</h2>{edu.map((e, i) => <div className="item" key={i}><div className="item-head"><span>{e.school}</span><span>{e.period}</span></div><div className="item-sub">{e.degree}{e.score ? ` - ${e.score}` : ''}</div></div>)}</>}
      {skillLines.length > 0 && <><h2>Skills</h2>{skillLines.map((s, i) => <div key={i}>{s}</div>)}</>}
      {proj.length > 0 && <><h2>Projects</h2>{proj.map((p, i) => <div className="item" key={i}><div className="item-head"><span>{p.name}</span><span>{p.link}</span></div>{p.tech && <div className="item-sub">{p.tech}</div>}<ul>{lines(p.bullets).map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</>}
      {exp.length > 0 && <><h2>Experience</h2>{exp.map((e, i) => <div className="item" key={i}><div className="item-head"><span>{e.role}{e.role && e.company ? ', ' : ''}{e.company}</span><span>{e.period}</span></div><ul>{lines(e.bullets).map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</>}
      {lines(d.achievements).length > 0 && <><h2>Achievements</h2><ul>{lines(d.achievements).map((a, i) => <li key={i}>{a}</li>)}</ul></>}
      {!d.name && !d.summary && !edu.length && !proj.length && <p className="empty-hint">Your resume preview appears here as you type.</p>}
    </div>
  );
}
