import { apiFetch } from "./client";
import type { VoteRequest, VoteResponse } from "./types";

export const voteOnPost = (postId: string, body: VoteRequest) =>
  apiFetch<VoteResponse>(`/posts/${postId}/vote`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const voteOnComment = (
  postId: string,
  commentId: string,
  body: VoteRequest,
) =>
  apiFetch<VoteResponse>(`/posts/${postId}/comments/${commentId}/vote`, {
    method: "POST",
    body: JSON.stringify(body),
  });
