import { apiFetch } from "./client";
import type { CommentResponse, CommentTreeResponse } from "./types";

export const listComments = (
  postId: string,
  params?: { cursor?: string; max_depth?: number; replies_per_page?: number },
) => {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.max_depth !== undefined)
    qs.set("max_depth", String(params.max_depth));
  if (params?.replies_per_page !== undefined)
    qs.set("replies_per_page", String(params.replies_per_page));
  const query = qs.size ? `?${qs}` : "";
  return apiFetch<CommentTreeResponse>(`/posts/${postId}/comments${query}`);
};

export const createComment = (
  postId: string,
  body: { author: string; body: string; parent_comment_id?: string },
) =>
  apiFetch<CommentResponse>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateComment = (
  postId: string,
  commentId: string,
  body: { body?: string },
) =>
  apiFetch<CommentResponse>(`/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteComment = (postId: string, commentId: string) =>
  apiFetch<void>(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });

export const listReplies = (
  postId: string,
  commentId: string,
  params?: { cursor?: string; max_depth?: number; replies_per_page?: number },
) => {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.max_depth !== undefined)
    qs.set("max_depth", String(params.max_depth));
  if (params?.replies_per_page !== undefined)
    qs.set("replies_per_page", String(params.replies_per_page));
  const query = qs.size ? `?${qs}` : "";
  return apiFetch<CommentTreeResponse>(
    `/posts/${postId}/comments/${commentId}/replies${query}`,
  );
};
