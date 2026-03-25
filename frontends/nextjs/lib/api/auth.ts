import { apiFetch } from "./client";
import type { TokenResponse, UserResponse } from "./types";

export const register = (email: string, username: string, password: string) =>
  apiFetch<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });

export const login = (email: string, password: string) =>
  apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = (token: string) =>
  apiFetch<void>("/auth/logout", { method: "POST" }, token);

export const getMe = (token: string) =>
  apiFetch<UserResponse>("/auth/me", {}, token);
