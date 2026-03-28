import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth, useRequireAuth } from "@/lib/context/AuthProvider";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => "/",
}));

const mockGetMe = vi.fn();
const mockApiLogout = vi.fn();
vi.mock("@/lib/api/auth", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  logout: (...args: unknown[]) => mockApiLogout(...args),
}));

function AuthDisplay() {
  const { user, token, initialized } = useAuth();
  return (
    <div>
      <span data-testid="initialized">{String(initialized)}</span>
      <span data-testid="user">{user?.username ?? "null"}</span>
      <span data-testid="token">{token ?? "null"}</span>
    </div>
  );
}

function LoginButton({ token, user }: { token: string; user: { id: string; email: string; username: string } }) {
  const { login } = useAuth();
  return <button onClick={() => login(token, user)}>Login</button>;
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Logout</button>;
}

function RequireAuthDisplay() {
  useRequireAuth();
  return <span>protected</span>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetMe.mockReset();
    mockApiLogout.mockReset();
    mockReplace.mockReset();
  });

  it("initializes with user=null when no stored token", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("initialized")).toHaveTextContent("true"));
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });

  it("sets user and token when stored token and getMe succeed", async () => {
    localStorage.setItem("mlad_token", "stored-tok");
    mockGetMe.mockResolvedValue({ id: "u1", email: "a@b.com", username: "alice" });
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
    expect(screen.getByTestId("token")).toHaveTextContent("stored-tok");
  });

  it("removes token from localStorage when getMe fails", async () => {
    localStorage.setItem("mlad_token", "bad-tok");
    mockGetMe.mockRejectedValue(new Error("Unauthorized"));
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("initialized")).toHaveTextContent("true"));
    expect(localStorage.getItem("mlad_token")).toBeNull();
  });

  it("login() stores token in localStorage and exposes user", async () => {
    const user = { id: "u1", email: "a@b.com", username: "alice" };
    render(
      <AuthProvider>
        <LoginButton token="new-tok" user={user} />
        <AuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("initialized")).toHaveTextContent("true"));
    act(() => { screen.getByRole("button", { name: "Login" }).click(); });
    expect(localStorage.getItem("mlad_token")).toBe("new-tok");
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
  });

  it("logout() calls apiLogout, clears user/token/localStorage", async () => {
    localStorage.setItem("mlad_token", "tok");
    mockGetMe.mockResolvedValue({ id: "u1", email: "a@b.com", username: "alice" });
    mockApiLogout.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <LogoutButton />
        <AuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
    await act(async () => { screen.getByRole("button", { name: "Logout" }).click(); });
    expect(mockApiLogout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("mlad_token")).toBeNull();
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });

  it("logout() with no token skips apiLogout", async () => {
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );
    await waitFor(() => {}); // let init settle
    await act(async () => { screen.getByRole("button", { name: "Logout" }).click(); });
    expect(mockApiLogout).not.toHaveBeenCalled();
  });

  it("useRequireAuth redirects to /auth/login when initialized and no user", async () => {
    render(
      <AuthProvider>
        <RequireAuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/auth/login"));
  });

  it("useRequireAuth does not redirect when initialized with a user", async () => {
    localStorage.setItem("mlad_token", "tok");
    mockGetMe.mockResolvedValue({ id: "u1", email: "a@b.com", username: "alice" });
    render(
      <AuthProvider>
        <RequireAuthDisplay />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("protected")).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("useRequireAuth does not redirect before initialization", async () => {
    // Simulate slow getMe — initialization not yet complete
    let resolve!: (v: unknown) => void;
    mockGetMe.mockReturnValue(new Promise((res) => { resolve = res; }));
    localStorage.setItem("mlad_token", "tok");
    render(
      <AuthProvider>
        <RequireAuthDisplay />
      </AuthProvider>
    );
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { resolve({ id: "u1", email: "a@b.com", username: "alice" }); });
  });
});
