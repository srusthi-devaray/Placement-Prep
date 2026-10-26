import { useLayoutEffect, useRef } from 'react';

// A small dependency-free code editor: line numbers, Tab = 4 spaces, auto-indent after ":" and Ctrl/Cmd+Enter to run.
export default function CodeEditor({ value, onChange, onRun, minRows = 18 }) {
  const ta = useRef(null);
  const gutter = useRef(null);
  const lines = Math.max(minRows, value.split('\n').length + 1);

  const pendingCaret = useRef(null);
  // Put the caret back right after React re-renders the textarea (no timing race with fast typing).
  useLayoutEffect(() => {
    if (pendingCaret.current != null && ta.current) { ta.current.selectionStart = ta.current.selectionEnd = pendingCaret.current; pendingCaret.current = null; }
  });
  const edit = (start, end, text, caret) => {
    pendingCaret.current = caret;
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  const onKeyDown = (e) => {
    const el = e.target;
    const { selectionStart: s, selectionEnd: en } = el;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const ls = value.lastIndexOf('\n', s - 1) + 1;
        if (value.slice(ls, ls + 4) === '    ') edit(ls, ls + 4, '', Math.max(ls, s - 4));
      } else edit(s, en, '    ', s + 4);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); if (onRun) onRun();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const ls = value.lastIndexOf('\n', s - 1) + 1;
      const line = value.slice(ls, s);
      let indent = (line.match(/^\s*/) || [''])[0];
      if (/:\s*$/.test(line)) indent += '    ';
      edit(s, en, '\n' + indent, s + 1 + indent.length);
    }
  };

  return (
    <div className="code-editor">
      <div className="gutter" ref={gutter} aria-hidden="true">{Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}</div>
      <textarea ref={ta} value={value} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Python code editor" wrap="off"
        rows={lines} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.target.scrollTop; }} />
    </div>
  );
}
