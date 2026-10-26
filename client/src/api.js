// Tiny fetch wrapper that talks to the Express API and attaches the login token.
const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '/api';
const TOKEN_KEY = 'pp_token';
const USER_KEY = 'pp_user';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const getStoredUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
export const setAuth = (token, user) => { try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* storage blocked */ } };
export const clearAuth = () => { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ } };

const authHeader = () => (getToken() ? { Authorization: `Bearer ${getToken()}` } : {});

function handleUnauthorized(path) {
  if (!path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    clearAuth();
    window.dispatchEvent(new Event('pp-logout'));
  }
}

async function request(method, path, body) {
  const headers = { ...authHeader() };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try { res = await fetch(BASE + path, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Is the backend running?'); }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path);
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p, b) => request('DELETE', p, b),
  upload: (p, formData) => request('POST', p, formData)
};

// Sends a chat message (with optional files) and reads the server-sent-events reply piece by piece.
// onEvent receives: { t: "text piece" } | { notice } | { error } | { done, threadId, title, sources }
export async function streamChat(formData, onEvent, signal) {
  let res;
  try { res = await fetch(`${BASE}/chat`, { method: 'POST', headers: authHeader(), body: formData, signal }); }
  catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Cannot reach the server. Is the backend running?'); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) handleUnauthorized('/chat');
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const line = block.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed event */ }
    }
  }
}
