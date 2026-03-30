import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { RegisterModal } from "@/components/ui/RegisterModal";
import type { UserResponse } from "@/lib/api/types";
import * as authApi from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  register: vi.fn(),
}));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSwitchToLogin: vi.fn(),
};

const mockUser: UserResponse = { id: "u1", email: "a@b.com", username: "alice" };

describe("RegisterModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = renderWithAuth(
      <RegisterModal {...baseProps} open={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders email, username, password fields and submit button when open", () => {
    renderWithAuth(<RegisterModal {...baseProps} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("calls api register then onSwitchToLogin on success", async () => {
    const mockRegister = vi.mocked(authApi.register).mockResolvedValue(mockUser);
    const onSwitchToLogin = vi.fn();
    renderWithAuth(<RegisterModal {...baseProps} onSwitchToLogin={onSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "alice", "secret"),
    );
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when registration fails", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      Object.assign(new Error("Email already taken"), { name: "ApiError" }),
    );
    renderWithAuth(<RegisterModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await waitFor(() =>
      expect(screen.getByText("Registration failed")).toBeInTheDocument(),
    );
  });

  it("disables submit button and shows Registering... while submitting", async () => {
    let resolve: (value: UserResponse) => void;
    vi.mocked(authApi.register).mockReturnValue(
      new Promise((res) => { resolve = res; }),
    );
    renderWithAuth(<RegisterModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registering..." })).toBeDisabled(),
    );
    await act(async () => { resolve!(mockUser); });
  });

  it("calls onSwitchToLogin when the Login link-button is clicked", () => {
    const onSwitchToLogin = vi.fn();
    renderWithAuth(<RegisterModal {...baseProps} onSwitchToLogin={onSwitchToLogin} />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });
});
