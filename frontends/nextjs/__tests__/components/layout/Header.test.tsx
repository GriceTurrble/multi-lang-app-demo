import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { Header } from "@/components/layout/Header";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

describe("Header", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("shows skeleton placeholder when not yet initialized", () => {
    renderWithAuth(<Header />, { initialized: false, user: null });
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register" })).not.toBeInTheDocument();
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("shows Login and Register buttons when initialized with no user", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("shows username and Logout button when initialized with a user", () => {
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
    });
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
  });

  it("clicking Login button opens the login modal", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("clicking Register button opens the register modal", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
  });

  it("clicking Logout button opens the logout confirmation modal", () => {
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to log out?")).toBeInTheDocument();
  });

  it("calls logout() then router.push('/') when logout is confirmed", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
      logout,
    });
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("dismisses logout modal without calling logout() when Cancel is clicked", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
      logout,
    });
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("clicking Register inside the login modal switches to the register form", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Register" }));
    expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument();
  });

  it("clicking Login inside the register modal switches to the login form", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Login" }));
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Register" })).not.toBeInTheDocument();
  });

  it("MLAD Forum link points to /posts", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    const link = screen.getByRole("link", { name: "MLAD Forum" });
    expect(link).toHaveAttribute("href", "/posts");
  });
});
