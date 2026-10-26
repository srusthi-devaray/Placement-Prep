import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const speechInputSupported = !!SpeechRec;
export const speechOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Voice typing: press once to start, again to stop. Words are appended to whatever is already typed.
// getText/setText connect it to any input. micSeconds() tells how long the user actually spoke (used for pace feedback).
export function useDictation({ getText, setText, lang = 'en-IN', onError }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const msRef = useRef(0);
  const startedRef = useRef(0);
  const getRef = useRef(getText); getRef.current = getText;
  const setRef = useRef(setText); setRef.current = setText;
  const errRef = useRef(onError); errRef.current = onError;

  const stop = useCallback(() => {
    wantRef.current = false;
    if (startedRef.current) { msRef.current += Date.now() - startedRef.current; startedRef.current = 0; }
    setListening(false);
    if (recRef.current) { try { recRef.current.stop(); } catch { /* already stopped */ } recRef.current = null; }
  }, []);

  const start = useCallback(() => {
    if (!SpeechRec || wantRef.current) return;
    const rec = new SpeechRec();
    rec.lang = lang; rec.continuous = true; rec.interimResults = true;
    let base = getRef.current() || '';
    if (base && !/\s$/.test(base)) base += ' ';
    rec.onresult = (ev) => {
      let finalText = '', interim = '';
      for (let i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
      }
      setRef.current(base + finalText + interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { errRef.current && errRef.current('Microphone permission was denied. Allow it in the browser address bar and try again.'); stop(); }
      else if (ev.error === 'network') { errRef.current && errRef.current('Voice typing needs an internet connection.'); stop(); }
      else if (ev.error === 'audio-capture') { errRef.current && errRef.current('No microphone found.'); stop(); }
    };
    rec.onend = () => {
      // Chrome ends the session after a pause; restart while the user still wants to talk.
      if (wantRef.current && recRef.current === rec) {
        let cur = getRef.current() || '';
        if (cur && !/\s$/.test(cur)) cur += ' ';
        base = cur;
        try { rec.start(); } catch { stop(); }
      }
    };
    try {
      rec.start();
      recRef.current = rec; wantRef.current = true; startedRef.current = Date.now(); setListening(true);
    } catch { errRef.current && errRef.current('Could not start the microphone.'); }
  }, [lang, stop]);

  const toggle = useCallback(() => (wantRef.current ? stop() : start()), [start, stop]);
  const micSeconds = useCallback(() => (msRef.current + (startedRef.current ? Date.now() - startedRef.current : 0)) / 1000, []);
  const reset = useCallback(() => { msRef.current = 0; }, []);
  useEffect(() => () => { wantRef.current = false; if (recRef.current) { try { recRef.current.abort(); } catch { /* ignore */ } } }, []);

  return { supported: !!SpeechRec, listening, toggle, stop, micSeconds, reset };
}

// Remove markdown symbols so the voice does not read "asterisk asterisk".
const plain = (t) => String(t || '').replace(/```[\s\S]*?```/g, ' code block. ').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#>]+/g, '').replace(/\s+/g, ' ').trim();

export function speak(text) {
  if (!speechOutputSupported) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text).slice(0, 3000));
  u.rate = 1; u.lang = 'en-IN';
  window.speechSynthesis.speak(u);
}
export function stopSpeaking() { if (speechOutputSupported) window.speechSynthesis.cancel(); }
