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
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("mlad_username") || "";
  });

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    localStorage.setItem("mlad_username", username);
  }, [username]);

  return (
    <UsernameContext.Provider value={{ username, setUsername }}>
      {children}
    </UsernameContext.Provider>
  );
}

export const useUsername = () => useContext(UsernameContext);
