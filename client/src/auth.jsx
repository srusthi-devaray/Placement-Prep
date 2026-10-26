import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAuth, getStoredUser, getToken, setAuth } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(!!getToken());

  // On first load, confirm the stored token is still valid and refresh the profile.
  useEffect(() => {
    let alive = true;
    if (!getToken()) { setLoading(false); return undefined; }
    api.get('/auth/me')
      .then((d) => { if (alive) { setUser(d.user); setAuth(getToken(), d.user); } })
      .catch(() => { /* a 401 already triggers pp-logout; network errors keep the cached user */ })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('pp-logout', onLogout);
    return () => window.removeEventListener('pp-logout', onLogout);
  }, []);

  const authenticate = useCallback(async (mode, body) => {
    const d = await api.post(`/auth/${mode}`, body);
    setAuth(d.token, d.user);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => { clearAuth(); setUser(null); }, []);
  const updateUser = useCallback((u) => { setUser(u); setAuth(getToken(), u); }, []);

  const value = useMemo(() => ({ user, loading, authenticate, logout, updateUser }), [user, loading, authenticate, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
