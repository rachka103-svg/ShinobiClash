import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out, object = logged in
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // set only when the server was unreachable/slow — not on a clean "not logged in"

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status && status < 500) {
        // server responded with a definitive auth decision (e.g. 401) — genuinely logged out
        setUser(false);
      } else {
        // no response at all, a timeout, or a 5xx/gateway error — don't assume
        // logged out, offer a graceful retry instead
        setAuthError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setUser(false);
  };

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/game/profile");
      setUser(data);
      return data;
    } catch (e) {
      // background refresh failing shouldn't crash the UI — keep the last known profile
      console.error("Profile refresh failed:", e);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, authError, retryAuth: fetchMe, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
