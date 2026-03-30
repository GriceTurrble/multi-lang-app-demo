import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { LoginModal } from "@/components/ui/LoginModal";
import type { TokenResponse } from "@/lib/api/types";
import * as authApi from "@/lib/api/auth";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockRefresh }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
}));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSwitchToRegister: vi.fn(),
};

const mockTokenResponse: TokenResponse = {
  access_token: "tok123",
  token_type: "bearer",
  user: { id: "u1", email: "a@b.com", username: "alice" },
};

describe("LoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = renderWithAuth(
      <LoginModal {...baseProps} open={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders email, password fields and submit button when open", () => {
    renderWithAuth(<LoginModal {...baseProps} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("calls api login, then context login, onClose and router.refresh on success", async () => {
    const mockLogin = vi.mocked(authApi.login).mockResolvedValue(mockTokenResponse);
    const contextLogin = vi.fn();
    const onClose = vi.fn();
    renderWithAuth(
      <LoginModal {...baseProps} onClose={onClose} />,
      { login: contextLogin },
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("a@b.com", "secret"));
    expect(contextLogin).toHaveBeenCalledWith("tok123", {
      id: "u1",
      email: "a@b.com",
      username: "alice",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when login fails", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      Object.assign(new Error("Invalid credentials"), { name: "ApiError" }),
    );
    renderWithAuth(<LoginModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() =>
      expect(screen.getByText("Login failed")).toBeInTheDocument(),
    );
  });

  it("disables submit button and shows Logging in... while submitting", async () => {
    let resolve: (value: TokenResponse) => void;
    vi.mocked(authApi.login).mockReturnValue(
      new Promise((res) => { resolve = res; }),
    );
    renderWithAuth(<LoginModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled(),
    );
    await act(async () => { resolve!(mockTokenResponse); });
  });

  it("calls onSwitchToRegister when the Register link-button is clicked", () => {
    const onSwitchToRegister = vi.fn();
    renderWithAuth(<LoginModal {...baseProps} onSwitchToRegister={onSwitchToRegister} />);
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(onSwitchToRegister).toHaveBeenCalledTimes(1);
  });
});
