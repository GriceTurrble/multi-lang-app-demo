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
  const [username, setUsername] = useState("");

  useEffect(() => {
    // On first render, hydrate username state from localStorage if it exists
    const stored = localStorage.getItem("mlad_username");
    if (stored && stored !== username) {
      setUsername(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Persist username to localStorage whenever it changes
    localStorage.setItem("mlad_username", username);
  }, [username]);

  return (
    <UsernameContext.Provider value={{ username, setUsername }}>
      {children}
    </UsernameContext.Provider>
  );
}

export const useUsername = () => useContext(UsernameContext);
