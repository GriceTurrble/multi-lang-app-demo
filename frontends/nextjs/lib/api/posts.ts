import { apiFetch } from "./client";
import type { PostListResponse, PostResponse } from "./types";

export const listPosts = (cursor?: string) =>
  apiFetch<PostListResponse>(`/posts${cursor ? `?cursor=${cursor}` : ""}`);

export const getPost = (postId: string) =>
  apiFetch<PostResponse>(`/posts/${postId}`);

export const createPost = (body: {
  title?: string;
  body: string;
  author: string;
}) =>
  apiFetch<PostResponse>("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updatePost = (
  postId: string,
  body: { title?: string; body?: string },
) =>
  apiFetch<PostResponse>(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deletePost = (postId: string) =>
  apiFetch<void>(`/posts/${postId}`, { method: "DELETE" });
