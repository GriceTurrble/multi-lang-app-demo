import { apiFetch } from "./client";
import type { PostListResponse, PostResponse } from "./types";

export const listPosts = (cursor?: string, token?: string | null) =>
  apiFetch<PostListResponse>(`/posts${cursor ? `?cursor=${cursor}` : ""}`, {}, token ?? undefined);

export const getPost = (postId: string, token?: string | null) =>
  apiFetch<PostResponse>(`/posts/${postId}`, {}, token ?? undefined);

export const createPost = (
  body: { title?: string; body: string },
  token: string,
) =>
  apiFetch<PostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  }, token);

export const updatePost = (
  postId: string,
  body: { title?: string; body?: string },
  token: string,
) =>
  apiFetch<PostResponse>(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }, token);

export const deletePost = (postId: string, token: string) =>
  apiFetch<void>(`/posts/${postId}`, { method: "DELETE" }, token);
