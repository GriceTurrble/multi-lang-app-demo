import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { Header } from "@/components/layout/Header";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Header", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("shows skeleton placeholder when not yet initialized", () => {
    renderWithAuth(<Header />, { initialized: false, user: null });
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Register" })).not.toBeInTheDocument();
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("shows Login and Register links when initialized with no user", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    const loginLink = screen.getByRole("link", { name: "Login" });
    const registerLink = screen.getByRole("link", { name: "Register" });
    expect(loginLink).toHaveAttribute("href", "/auth/login");
    expect(registerLink).toHaveAttribute("href", "/auth/register");
  });

  it("shows username and Logout button when initialized with a user", () => {
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
    });
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("calls logout() then router.push('/') when Logout is clicked", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<Header />, {
      initialized: true,
      user: { id: "u1", email: "a@b.com", username: "alice" },
      logout,
    });
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("MLAD Forum link points to /posts", () => {
    renderWithAuth(<Header />, { initialized: true, user: null });
    const link = screen.getByRole("link", { name: "MLAD Forum" });
    expect(link).toHaveAttribute("href", "/posts");
  });
});
