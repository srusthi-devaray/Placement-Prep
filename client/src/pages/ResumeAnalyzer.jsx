import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, Ring, fmtDate, scoreColor, useResource, useToast } from '../ui.jsx';
import { humanSize } from '../lib/media.js';

export default function ResumeAnalyzer() {
  const toast = useToast();
  const history = useResource('/resume');
  const [roles, setRoles] = useState([]);
  const [mode, setMode] = useState('file');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  useEffect(() => { api.get('/skills/roles').then((r) => { setRoles(r); }).catch(() => {}); }, []);

  const pick = (f) => {
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) { toast('Upload a PDF, DOCX or TXT file', 'error'); return; }
    if (f.size > 15 * 1024 * 1024) { toast('File is larger than 15 MB', 'error'); return; }
    setFile(f);
  };

  const analyze = async () => {
    if (mode === 'file' && !file) { toast('Choose a resume file first', 'error'); return; }
    if (mode === 'text' && text.trim().length < 80) { toast('Paste your full resume text', 'error'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      if (mode === 'file') fd.append('file', file); else fd.append('text', text);
      if (role) fd.append('role', role);
      if (jd.trim()) fd.append('jobDescription', jd);
      const doc = await api.upload('/resume/analyze', fd);
      setResult(doc); history.reload();
      toast('Analysis ready', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const open = async (id) => { try { setResult(await api.get(`/resume/${id}`)); window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { toast(e.message, 'error'); } };
  const r = result && result.result;

  return (
    <>
      <PageHeader icon="file" title="Resume Analyzer" subtitle="ATS-style score, keyword match against a role or job description, and concrete fixes. Your resume is analysed on the server and stored only in your account." />
      <div className="builder-grid">
        <div className="card pad">
          <div className="seg mb">
            <button className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>Upload file</button>
            <button className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>Paste text</button>
          </div>
          {mode === 'file' ? (
            <div className={`drop ${over ? 'over' : ''}`} onClick={() => input.current.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
              <input ref={input} hidden type="file" accept=".pdf,.docx,.txt" onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
              <Icon name="upload" size={30} />
              <div><b>{file ? file.name : 'Drop your resume here or click to browse'}</b></div>
              <div className="muted small">{file ? humanSize(file.size) : 'PDF, DOCX or TXT, up to 15 MB'}</div>
            </div>
          ) : <textarea aria-label="Resume text" style={{ minHeight: 220 }} placeholder="Paste your resume text here..." value={text} onChange={(e) => setText(e.target.value)} />}
          <div className="field mt"><label htmlFor="ra-role">Target role</label>
            <select id="ra-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Use my saved target role</option>{roles.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
          <div className="field"><label htmlFor="ra-jd">Job description (optional, gives a precise keyword match)</label>
            <textarea id="ra-jd" style={{ minHeight: 110 }} placeholder="Paste the job description you are applying for..." value={jd} onChange={(e) => setJd(e.target.value)} /></div>
          <button className="btn primary lg block" onClick={analyze} disabled={busy}>{busy ? 'Analysing...' : 'Analyse my resume'}</button>
        </div>

        <div>
          {r ? <Report doc={result} r={r} /> : (
            <div className="card pad"><Empty icon="file" title="Your report appears here">Upload a resume to see its score, strengths, issues and missing keywords.</Empty></div>
          )}
        </div>
      </div>

      <div className="card pad mt">
        <div className="card-title"><Icon name="clock" size={18} /> Previous analyses</div>
        {!history.items ? <Loading /> : history.items.length ? history.items.map((h) => (
          <div key={h._id} className="list-item">
            <b style={{ color: scoreColor(h.score), minWidth: 44 }}>{h.score}</b>
            <div className="grow"><div className="title">{h.fileName}</div><div className="muted small">{fmtDate(h.createdAt)}{h.hasJD ? ' · with job description' : ''}</div></div>
            <button className="btn sm ghost" onClick={() => open(h._id)}>View</button>
            <button className="btn sm danger" aria-label="Delete" onClick={async () => { if (confirm('Delete this analysis?')) { await history.remove(h._id); if (result && result._id === h._id) setResult(null); } }}><Icon name="x" size={15} /></button>
          </div>
        )) : <p className="muted small">No analyses yet.</p>}
      </div>
    </>
  );
}

function Report({ doc, r }) {
  const p = r.parsed || {};
  return (
    <div className="stack">
      <div className="card pad">
        <div className="row nowrap" style={{ gap: 20 }}>
          <Ring value={r.score} size={116} />
          <div><h2>{r.label}</h2><div className="muted small">{doc.fileName} · {p.wordCount} words · {p.bulletCount} bullets</div>
            <div className="chips mt-s">{p.email && <span className="chip">{p.email}</span>}{p.github && <span className="chip">GitHub</span>}{p.linkedin && <span className="chip">LinkedIn</span>}{p.cgpa && <span className="chip">CGPA {p.cgpa}</span>}</div></div>
        </div>
        <div className="mt">
          {r.breakdown.map((b) => { const pct = Math.round((b.score / b.max) * 100); return (
            <div className="metric" key={b.key}><span style={{ width: 170 }}>{b.label}</span><div className="track"><i style={{ width: `${pct}%`, background: scoreColor(pct) }} /></div><b>{b.score}/{b.max}</b></div>
          ); })}
        </div>
      </div>

      {r.issues.length > 0 && (
        <div className="card pad"><div className="card-title"><Icon name="alert" size={18} /> What to fix</div>
          <div className="stack sm">{r.issues.map((i, k) => <div className="issue" key={k}><span className={`sev ${i.severity}`}>{i.severity}</span><span>{i.text}</span></div>)}</div></div>
      )}
      {r.strengths.length > 0 && (
        <div className="card pad"><div className="card-title"><Icon name="check" size={18} /> Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{r.strengths.map((s, k) => <li key={k} style={{ marginBottom: 4 }}>{s}</li>)}</ul></div>
      )}
      <div className="card pad">
        <div className="card-title"><Icon name="target" size={18} /> Keyword match <span className="muted small" style={{ fontWeight: 400 }}>({r.keywords.source})</span></div>
        <div className="small muted">Found</div>
        <div className="chips mb">{r.keywords.matched.length ? r.keywords.matched.map((k) => <span key={k} className="chip hit">✓ {k}</span>) : <span className="muted small">None found</span>}</div>
        <div className="small muted">Missing</div>
        <div className="chips">{r.keywords.missing.length ? r.keywords.missing.map((k) => <span key={k} className="chip miss">{k}</span>) : <span className="muted small">Nothing missing</span>}</div>
      </div>
      {p.skills && p.skills.length > 0 && (
        <div className="card pad"><div className="card-title"><Icon name="code" size={18} /> Skills detected</div><div className="chips">{p.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
      )}
    </div>
  );
}
