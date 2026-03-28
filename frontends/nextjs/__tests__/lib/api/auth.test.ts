import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "@/lib/api/client";
import { register, login, logout, getMe } from "@/lib/api/auth";

vi.mock("@/lib/api/client");

beforeEach(() => {
  vi.mocked(client.apiFetch).mockResolvedValue(undefined as never);
});

describe("register", () => {
  it("posts to /auth/register with credentials", () => {
    register("a@b.com", "alice", "pass123");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email: "a@b.com", username: "alice", password: "pass123" }) },
    );
  });
});

describe("login", () => {
  it("posts to /auth/login with credentials", () => {
    login("a@b.com", "pass123");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "pass123" }) },
    );
  });
});

describe("logout", () => {
  it("posts to /auth/logout with token", () => {
    logout("tok");
    expect(client.apiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" }, "tok");
  });
});

describe("getMe", () => {
  it("fetches /auth/me with token", () => {
    getMe("tok");
    expect(client.apiFetch).toHaveBeenCalledWith("/auth/me", {}, "tok");
  });
});
