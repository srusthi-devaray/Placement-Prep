import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/* ---------------- Icons (simple stroke icons, 24x24) ---------------- */
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const ICONS = {
  alert: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  code: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
  external: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14L21 3'],
  map: ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z', 'M8 2v16', 'M16 6v16'],
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  calendar: ['M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  mic: ['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v4', 'M8 23h8'],
  edit: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  target: [circle(12, 12, 10), circle(12, 12, 6), circle(12, 12, 2)],
  bot: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  briefcase: ['M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z', 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75', circle(9, 7, 4)],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', circle(12, 7, 4)],
  search: [circle(11, 11, 8), 'M21 21l-4.35-4.35'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6', 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  paperclip: ['M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'],
  image: ['M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z', 'M21 15l-5-5L5 21', circle(8.5, 8.5, 1.5)],
  video: ['M23 7l-7 5 7 5V7z', 'M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
  volume: ['M11 5L6 9H2v6h4l5 4V5z', 'M19.07 4.93a10 10 0 0 1 0 14.14', 'M15.54 8.46a5 5 0 0 1 0 7.07'],
  stop: ['M6 6h12v12H6z'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
  sun: [circle(12, 12, 5), 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  award: [circle(12, 8, 7), 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
  clock: [circle(12, 12, 10), 'M12 6v6l4 2'],
  flame: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z'],
  trending: ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  copy: ['M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  zap: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  compass: [circle(12, 12, 10), 'M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'],
  clipboard: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'],
  bars: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  chevron: ['M9 18l6-6-6-6'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 6l-10 7L2 6'],
  play: ['M5 3l14 9-14 9V3z'],
  printer: ['M6 9V2h12v7', 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 14h12v8H6z'],
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z'],
  refresh: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']
};

export function Icon({ name, size = 18, className = '', style }) {
  const paths = ICONS[name] || ICONS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* ---------------- Small helpers ---------------- */
export const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const fmtDate = (d) => {
  if (!d) return '-';
  const x = new Date(String(d).length === 10 ? `${d}T00:00:00` : d);
  return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
export const scoreColor = (n) => (n >= 70 ? '#10b981' : n >= 45 ? '#f59e0b' : '#ef4444');
export function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/* ---------------- Toasts ---------------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((message, type = '') => {
    const id = ++idRef.current;
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}</div>
    </ToastContext.Provider>
  );
}

/* ---------------- Modal + form modal ---------------- */
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// fields: [{ name, label, type: text|textarea|select|date|number|checkbox, options, required, placeholder, rows }]
export function FormModal({ title, fields, values = {}, submitLabel = 'Save', onSubmit, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.name, values[f.name] ?? f.default ?? (f.type === 'checkbox' ? false : '')])));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(form); onClose(); } catch (err) { toast(err.message, 'error'); setBusy(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {fields.map((f, i) => {
          const common = { id: `f_${f.name}`, name: f.name, required: f.required, placeholder: f.placeholder, autoFocus: i === 0 };
          if (f.type === 'checkbox') {
            return (
              <div className="field check" key={f.name}>
                <input type="checkbox" {...common} checked={!!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                <label htmlFor={common.id}>{f.label}</label>
              </div>
            );
          }
          return (
            <div className="field" key={f.name}>
              <label htmlFor={common.id}>{f.label}</label>
              {f.type === 'textarea' ? <textarea {...common} rows={f.rows || 4} value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} />
                : f.type === 'select' ? <select {...common} value={form[f.name]} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                  : <input {...common} type={f.type || 'text'} step={f.type === 'number' ? '0.5' : undefined} min={f.type === 'number' ? '0' : undefined} value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} />}
            </div>
          );
        })}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving...' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Display components ---------------- */
export function PageHeader({ icon, title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{icon && <span className="ico-chip tone-indigo"><Icon name={icon} size={22} /></span>}{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function StatCard({ icon, tone = 'indigo', label, value, hint }) {
  return (
    <div className="card stat">
      <span className={`ico-chip tone-${tone}`}><Icon name={icon} size={20} /></span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export const Badge = ({ tone = 'slate', children }) => <span className={`badge tone-${tone}`}>{children}</span>;

export function Empty({ icon = 'star', title, children }) {
  return (
    <div className="empty">
      <div className="ico-chip tone-indigo"><Icon name={icon} size={24} /></div>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export const Loading = () => <div className="loading"><span className="spinner" /></div>;

export function Ring({ value, size = 96, label, color }) {
  const c = color || scoreColor(value);
  return (
    <div className="ring" style={{ '--p': Math.max(0, Math.min(100, value)), '--c': c, width: size, height: size }}>
      <span style={{ width: size - 16, height: size - 16, fontSize: size / 3.6 }}>{label ?? value}</span>
    </div>
  );
}

export function BarChart({ data, unit = '' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-col" key={d.label}>
          <span>{d.value ? `${+d.value.toFixed(1)}${unit}` : ''}</span>
          <i className={d.value ? '' : 'zero'} style={{ height: `${(d.value / max) * 100}%` }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Data hook for simple lists ---------------- */
export function useResource(path) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setItems(await api.get(path)); setError(''); } catch (e) { setError(e.message); setItems((cur) => cur || []); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return {
    items, error, reload: load,
    create: async (body) => { const d = await api.post(path, body); await load(); return d; },
    update: async (id, body) => { const d = await api.put(`${path}/${id}`, body); await load(); return d; },
    remove: async (id) => { await api.del(`${path}/${id}`); setItems((l) => (l || []).filter((x) => x._id !== id)); }
  };
}

/* ---------------- Tiny, safe markdown renderer (no HTML injection) ---------------- */
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;
function inline(text, keyBase) {
  const out = [];
  let last = 0, m, i = 0;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0], key = `${keyBase}-${i++}`;
    if (m[1]) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else out.push(<a key={key} href={m[5]} target="_blank" rel="noreferrer noopener">{tok.slice(1, tok.indexOf(']'))}</a>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++}><code>{code.join('\n')}</code></pre>);
    } else if (/^#{1,4}\s/.test(line)) {
      blocks.push(<h3 key={key++}>{inline(line.replace(/^#{1,4}\s+/, ''), `h${key}`)}</h3>); i++;
    } else if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key++}>{inline(q.join(' '), `q${key}`)}</blockquote>);
    } else if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      blocks.push(<ul key={key++}>{items.map((t, j) => <li key={j}>{inline(t, `u${key}-${j}`)}</li>)}</ul>);
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push(<ol key={key++}>{items.map((t, j) => <li key={j}>{inline(t, `o${key}-${j}`)}</li>)}</ol>);
    } else if (!line.trim()) {
      i++;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>\s?|\s*[-*•]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
      blocks.push(<p key={key++}>{inline(para.join(' '), `p${key}`)}</p>);
    }
  }
  return <div className="md">{blocks}</div>;
}

/* ---------------- AI status (shared) ---------------- */
let aiStatusPromise = null;
export function useAiStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let alive = true;
    aiStatusPromise = aiStatusPromise || api.get('/ai/status').catch(() => ({ enabled: false }));
    aiStatusPromise.then((s) => alive && setStatus(s));
    return () => { alive = false; };
  }, []);
  return status;
}
