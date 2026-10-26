import { useCallback, useEffect, useRef, useState } from 'react';
import { api, streamChat } from '../api.js';
import { Icon, Loading, Markdown, useAiStatus, useToast } from '../ui.jsx';
import { speak, speechInputSupported, speechOutputSupported, stopSpeaking, useDictation } from '../lib/speech.js';
import { extractVideoFrames, humanSize, shrinkImage } from '../lib/media.js';
import { useAuth } from '../auth.jsx';

const SUGGESTIONS = [
  { icon: 'file', t: 'Review my resume', s: 'Attach your resume (PDF/DOCX) for feedback', q: 'Please review my resume and tell me the top fixes to pass ATS screening.' },
  { icon: 'code', t: 'Explain a concept', s: 'e.g. ACID properties, indexing, closures', q: 'Explain database indexing with a simple example and the common interview questions on it.' },
  { icon: 'mic', t: 'Mock HR round', s: 'Practise "Tell me about yourself"', q: 'Ask me common HR interview questions one at a time and give feedback on each answer.' },
  { icon: 'target', t: 'Plan my week', s: 'A study plan for 2 weeks to placements', q: 'Make me a 2 week placement preparation plan covering DSA, CS core, aptitude and HR. I can study 3 hours a day.' }
];
const MAX_FILES = 6;

export default function Chat() {
  const toast = useToast();
  const ai = useAiStatus();
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const inputRef = useRef(''); inputRef.current = input;
  const [files, setFiles] = useState([]); // { file, name, size, kind, preview, frames? }
  const [streaming, setStreaming] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const abortRef = useRef(null);
  const lastTextRef = useRef('');
  const scrollRef = useRef(null);
  const fileInput = useRef(null);
  const dict = useDictation({ getText: () => inputRef.current, setText: setInput, onError: (m) => toast(m, 'error') });

  const loadThreads = useCallback(() => api.get('/chat/threads').then(setThreads).catch(() => setThreads([])), []);
  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => () => { stopSpeaking(); if (abortRef.current) abortRef.current.abort(); }, []);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);

  const openThread = async (id) => {
    setShowThreads(false); setLoadingThread(true); stopSpeaking();
    try {
      const t = await api.get(`/chat/threads/${id}`);
      setThreadId(t._id); setMessages(t.messages.map((m) => ({ role: m.role, content: m.content, attachments: m.attachments || [], sources: m.sources || [], mode: m.mode || '' })));
    } catch (e) { toast(e.message, 'error'); }
    setLoadingThread(false);
  };
  const newChat = () => { if (streaming) return; setThreadId(null); setMessages([]); setFiles([]); setInput(''); setShowThreads(false); stopSpeaking(); };
  const deleteThread = async (id) => {
    if (!confirm('Delete this chat?')) return;
    try { await api.del(`/chat/threads/${id}`); if (id === threadId) newChat(); loadThreads(); } catch (e) { toast(e.message, 'error'); }
  };

  const clearAll = async () => {
    if (!threads || !threads.length || !confirm(`Delete all ${threads.length} saved chats? This cannot be undone.`)) return;
    try { await api.del('/chat/threads'); newChat(); loadThreads(); toast('All chats deleted', 'success'); } catch (e) { toast(e.message, 'error'); }
  };

  const addFiles = async (list) => {
    const incoming = [...list];
    if (files.length + incoming.length > MAX_FILES) toast(`You can attach up to ${MAX_FILES} files per message`, 'error');
    for (const f of incoming.slice(0, Math.max(0, MAX_FILES - files.length))) {
      try {
        if (f.type.startsWith('image/')) {
          const small = await shrinkImage(f);
          setFiles((s) => [...s, { file: small, name: f.name, size: small.size, kind: 'image', preview: URL.createObjectURL(small) }]);
        } else if (f.type.startsWith('video/')) {
          toast('Reading video frames...', 'info');
          const frames = await extractVideoFrames(f, 4);
          setFiles((s) => [...s, { file: null, frames, name: f.name, size: f.size, kind: 'video', preview: URL.createObjectURL(frames[0]) }]);
        } else if (/\.(pdf|docx|txt|md|csv)$/i.test(f.name) || /^(application\/pdf|text\/)/.test(f.type)) {
          if (f.size > 15 * 1024 * 1024) { toast(`${f.name} is larger than 15 MB`, 'error'); continue; }
          setFiles((s) => [...s, { file: f, name: f.name, size: f.size, kind: 'doc' }]);
        } else toast(`${f.name}: use images, video, PDF, DOCX or text files`, 'error');
      } catch (e) { toast(`${f.name}: ${e.message || 'could not be read'}`, 'error'); }
    }
  };
  const removeFile = (i) => setFiles((s) => { if (s[i].preview) URL.revokeObjectURL(s[i].preview); return s.filter((_, j) => j !== i); });

  const send = async (override) => {
    const text = (typeof override === 'string' ? override : input).trim();
    if (streaming || (!text && !files.length)) return;
    dict.stop(); stopSpeaking();
    lastTextRef.current = text;
    const fd = new FormData();
    fd.append('message', text);
    if (threadId) fd.append('threadId', threadId);
    let n = 0;
    for (const f of files) {
      if (f.kind === 'video') f.frames.forEach((fr, i) => { if (n < MAX_FILES) { fd.append('files', fr, `${f.name}-frame${i + 1}.jpg`); n += 1; } });
      else if (n < MAX_FILES) { fd.append('files', f.file, f.name); n += 1; }
    }
    const atts = files.map((f) => ({ name: f.name, kind: f.kind, size: f.size, preview: f.preview }));
    setMessages((m) => [...m, { role: 'user', content: text, attachments: atts }, { role: 'assistant', content: '', sources: [], pending: true }]);
    setInput(''); setFiles([]); setStreaming(true);
    const ac = new AbortController(); abortRef.current = ac;
    let reply = '';
    const patch = (fn) => setMessages((m) => { const c = [...m]; c[c.length - 1] = fn(c[c.length - 1]); return c; });
    try {
      await streamChat(fd, (ev) => {
        if (ev.t) { reply += ev.t; patch((x) => ({ ...x, content: reply })); }
        if (ev.mode) patch((x) => ({ ...x, mode: ev.mode, grounded: ev.grounded }));
        if (ev.notice) toast(ev.notice, 'info');
        if (ev.error) patch((x) => ({ ...x, content: `${reply}\n\n**Error:** ${ev.error}`, pending: false, failed: true, partial: !!ev.partial }));
        if (ev.done) { if (ev.threadId) setThreadId(ev.threadId); patch((x) => ({ ...x, sources: ev.sources || [], mode: ev.mode || x.mode, pending: false })); loadThreads(); }
      }, ac.signal);
      if (readAloud && reply) speak(reply.replace(/[#*`>_-]/g, ' '));
    } catch (e) {
      if (e.name !== 'AbortError') patch((x) => ({ ...x, content: reply || `**Error:** ${e.message}`, failed: true }));
    }
    patch((x) => ({ ...x, pending: false }));
    setStreaming(false); abortRef.current = null;
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const initial = (user && user.username ? user.username[0] : 'U').toUpperCase();

  return (
    <div className="chat-layout">
      <div className={`card threads ${showThreads ? 'show' : ''}`}>
        <button className="btn primary block" onClick={newChat}><Icon name="plus" size={16} /> New chat</button>
        {threads && threads.length > 1 && <button className="btn sm ghost block" style={{ marginTop: 6 }} onClick={clearAll}>Delete all chats</button>}
        {!threads ? <Loading /> : threads.length ? threads.map((t) => (
          <div key={t._id} className={`thread ${t._id === threadId ? 'active' : ''}`} onClick={() => openThread(t._id)}>
            <Icon name="chat" size={15} /><span className="t">{t.title}</span>
            <button className="x" aria-label="Delete chat" onClick={(e) => { e.stopPropagation(); deleteThread(t._id); }}><Icon name="x" size={14} /></button>
          </div>
        )) : <p className="muted small center mt">Your chats will appear here.</p>}
      </div>

      <div className="card chat-main">
        <div className="chat-head">
          <button className="btn sm ghost mobile-only" onClick={() => setShowThreads(!showThreads)}><Icon name="menu" size={16} /> Chats</button>
          <b style={{ fontSize: 17 }}>PlaceBot</b>
          {ai && <span className={`mode-pill ${ai.enabled ? 'ai' : 'basic'}`}>{ai.enabled ? 'AI mode' : 'Basic mode'}</span>}
          <span className="grow" />
          {speechOutputSupported && <label className="row small muted" style={{ gap: 6, margin: 0 }}><input type="checkbox" checked={readAloud} onChange={(e) => { setReadAloud(e.target.checked); if (!e.target.checked) stopSpeaking(); }} /> Read replies aloud</label>}
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {loadingThread ? <Loading /> : messages.length === 0 ? (
            <div style={{ margin: 'auto 0' }}>
              <div className="center mb"><h2>Hi{user ? `, ${user.username}` : ''}! What are we preparing today?</h2>
                <p className="muted">Ask by typing or voice. Attach a resume, a screenshot of a question, or a short video.</p>
                {ai && !ai.enabled && <p className="small muted">Basic mode answers from the built-in knowledge base and your notes. Add an AI key on the server for full answers and image understanding.</p>}</div>
              <div className="suggest-grid">{SUGGESTIONS.map((s) => (
                <button key={s.t} className="suggest" onClick={() => send(s.q)}><span className="ico-chip tone-indigo"><Icon name={s.icon} size={18} /></span><span><b>{s.t}</b><span className="sub">{s.s}</span></span></button>
              ))}</div>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'bot'}`}>
              <div className="av">{m.role === 'user' ? initial : <Icon name="sparkles" size={17} />}</div>
              <div className="bubble">
                {m.attachments && m.attachments.length > 0 && (
                  <div className="attach-row">{m.attachments.map((a, j) => <span key={j} className="attach-chip">{a.preview ? <img src={a.preview} alt="" /> : <Icon name="file" size={15} />}{a.name}</span>)}</div>
                )}
                {m.role === 'user' ? <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div> : (
                  <>
                    {m.content ? <Markdown text={m.content} /> : null}
                    {m.pending && <span className="cursor" />}
                    {!m.pending && m.content && (
                      <>
                      <div className="msg-tools">
                        <button className="tool-btn" onClick={() => navigator.clipboard && navigator.clipboard.writeText(m.content).then(() => toast('Copied', 'success'))}><Icon name="copy" size={13} /> Copy</button>
                        {speechOutputSupported && <button className="tool-btn" onClick={() => speak(m.content.replace(/[#*`>_-]/g, ' '))}><Icon name="volume" size={13} /> Listen</button>}
                        {m.failed && i === messages.length - 1 && !streaming && <button className="tool-btn" onClick={() => send(lastTextRef.current)}><Icon name="refresh" size={13} /> Retry</button>}
                        {m.mode && <span className={`mode-pill ${m.mode === 'ai' ? 'ai' : 'basic'}`} title={m.mode === 'ai' ? 'Generated by an AI model. It can be wrong - verify important facts.' : 'Built-in knowledge base answer (no AI model was used).'}>{m.mode === 'ai' ? 'AI answer' : m.mode === 'basic-fallback' ? 'Basic (AI unavailable)' : 'Basic answer'}</span>}
                      </div>
                      {m.sources && m.sources.length > 0 && <div className="msg-tools" aria-label="Sources used"><span className="tiny muted">Sources:</span>{m.sources.map((s) => <span key={s} className="chip">{s}</span>)}</div>}
                      {m.mode === 'ai' && <div className="tiny muted mt-s">AI-generated. Check facts, numbers and code before relying on them.</div>}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="composer">
          {files.length > 0 && (
            <div className="attach-row" style={{ maxWidth: 880, margin: '0 auto 8px' }}>
              {files.map((f, i) => (
                <span key={i} className="attach-chip">{f.preview ? <img src={f.preview} alt="" /> : <Icon name="file" size={15} />}{f.name} <span className="muted">{f.kind === 'video' ? '4 frames' : humanSize(f.size)}</span>
                  <button className="x" aria-label={`Remove ${f.name}`} onClick={() => removeFile(i)}><Icon name="x" size={13} /></button></span>
              ))}
            </div>
          )}
          <div className="composer-box">
            <input ref={fileInput} type="file" multiple hidden accept="image/*,video/*,.pdf,.docx,.txt,.md,.csv" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <button className="round-btn" aria-label="Attach files" title="Attach image, video, PDF, DOCX" onClick={() => fileInput.current.click()}><Icon name="paperclip" size={19} /></button>
            <textarea rows={1} aria-label="Message" placeholder={dict.listening ? 'Listening... speak now' : 'Ask anything about placements, or attach a file...'} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} />
            {speechInputSupported && <button className={`round-btn ${dict.listening ? 'rec' : ''}`} aria-label={dict.listening ? 'Stop dictation' : 'Speak your question'} onClick={dict.toggle}><Icon name={dict.listening ? 'stop' : 'mic'} size={19} /></button>}
            {streaming
              ? <button className="round-btn send" aria-label="Stop" onClick={() => abortRef.current && abortRef.current.abort()}><Icon name="stop" size={18} /></button>
              : <button className="round-btn send" aria-label="Send" disabled={!input.trim() && !files.length} onClick={() => send()}><Icon name="send" size={18} /></button>}
          </div>
          <div className="tiny muted center mt-s">PlaceBot can make mistakes - verify important facts. Videos are read as 4 still frames only (no audio, no motion). Attached documents are treated as data, not instructions.</div>
        </div>
      </div>
    </div>
  );
}
