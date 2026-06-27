"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { logout as apiLogout, getMe } from "@/lib/api/auth";
import type { UserResponse } from "@/lib/api/types";

type AuthContextType = {
  user: UserResponse | null;
  token: string | null;
  initialized: boolean;
  login: (token: string, user: UserResponse) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  initialized: false,
  // No-op stubs - default context value, never called directly.
  /* v8 ignore next 2 */
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("mlad_token");

    (storedToken
      ? getMe(storedToken)
        .then((u) => {
          setToken(storedToken);
          setUser(u);
        })
        .catch(() => {
          localStorage.removeItem("mlad_token");
        })
      : Promise.resolve()
    ).finally(() => setInitialized(true));
  }, []);

  const login = (newToken: string, newUser: UserResponse) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("mlad_token", newToken);
  };

  const logout = async () => {
    if (token) {
      try {
        await apiLogout(token);
      } catch {
        // ignore errors on logout
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("mlad_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function useRequireAuth() {
  const { user, token, initialized } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.replace("/auth/login");
    }
  }, [initialized, user, router]);

  return { user, token, initialized };
}
