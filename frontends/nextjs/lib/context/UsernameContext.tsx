"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type UsernameContextType = {
  username: string;
  setUsername: (name: string) => void;
};

const UsernameContext = createContext<UsernameContextType>({
  username: "",
  setUsername: () => {},
});

export function UsernameProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState("");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem("mlad_username") ?? "";
    setUsernameState(stored);
  }, []);

  const setUsername = (name: string) => {
    setUsernameState(name);
    localStorage.setItem("mlad_username", name);
  };

  return (
    <UsernameContext.Provider value={{ username, setUsername }}>
      {children}
    </UsernameContext.Provider>
  );
}

export const useUsername = () => useContext(UsernameContext);
