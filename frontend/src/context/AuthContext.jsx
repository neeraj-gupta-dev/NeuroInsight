// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("ni_token");
    const storedUser  = localStorage.getItem("ni_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await API.post("/api/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("ni_token", data.token);
    localStorage.setItem("ni_user",  JSON.stringify(data.user));
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await API.post("/api/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("ni_token", data.token);
    localStorage.setItem("ni_user",  JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("ni_token");
    localStorage.removeItem("ni_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
