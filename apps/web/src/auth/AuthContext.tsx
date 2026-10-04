import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { api } from "../api/mock";

interface AuthState {
  token: string | null;
  login(user: string, password: string, totp: string): Promise<void>;
  logout(): void;
}

const Ctx = createContext<AuthState>({ token: null, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("monolith_token"));
  const login = useCallback(async (u: string, p: string, t: string) => {
    const r = await api.login(u, p, t);
    sessionStorage.setItem("monolith_token", r.token);
    setToken(r.token);
  }, []);
  const logout = useCallback(() => {
    sessionStorage.removeItem("monolith_token");
    setToken(null);
  }, []);
  return <Ctx.Provider value={{ token, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
