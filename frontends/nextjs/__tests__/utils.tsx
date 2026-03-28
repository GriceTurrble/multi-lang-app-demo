import { type ReactElement } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import type { UserResponse } from "@/lib/api/types";
import { AuthContext } from "@/lib/context/AuthProvider";

type AuthContextValue = {
  user?: UserResponse | null;
  token?: string | null;
  initialized?: boolean;
  login?: (token: string, user: UserResponse) => void;
  logout?: () => Promise<void>;
};

export function renderWithAuth(ui: ReactElement, authValue: AuthContextValue = {}) {
  const defaults = {
    user: null,
    token: null,
    initialized: true,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    ...authValue,
  };
  return render(
    <AuthContext.Provider value={defaults}>
      {ui}
    </AuthContext.Provider>
  );
}

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};
