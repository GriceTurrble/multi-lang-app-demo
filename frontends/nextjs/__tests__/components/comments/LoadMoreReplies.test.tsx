import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoadMoreReplies } from "@/components/comments/LoadMoreReplies";
import type { CommentResponse } from "@/lib/api/types";

const mockListReplies = vi.fn();
vi.mock("@/lib/api/comments", () => ({
  listReplies: (...args: unknown[]) => mockListReplies(...args),
}));

const baseReply: CommentResponse = {
  id: "r1",
  post_id: "p1",
  parent_comment_id: "c1",
  author: "bob",
  body: "a reply",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  vote_score: 0,
  user_vote: 0,
};

describe("LoadMoreReplies", () => {
  beforeEach(() => {
    mockListReplies.mockReset();
  });

  it("shows 'Load more replies' button", () => {
    render(
      <LoadMoreReplies
        postId="p1"
        commentId="c1"
        cursor="cursor1"
        onLoaded={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Load more replies" })).toBeInTheDocument();
  });

  it("calls listReplies with correct args when button is clicked", async () => {
    mockListReplies.mockResolvedValue({ items: [], next_cursor: undefined });
    const onLoaded = vi.fn();
    render(
      <LoadMoreReplies
        postId="p1"
        commentId="c1"
        cursor="cursor1"
        token="tok"
        onLoaded={onLoaded}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Load more replies" }));
    await waitFor(() =>
      expect(mockListReplies).toHaveBeenCalledWith("p1", "c1", { cursor: "cursor1" }, "tok")
    );
  });

  it("calls onLoaded with items and next_cursor after successful load", async () => {
    mockListReplies.mockResolvedValue({ items: [baseReply], next_cursor: "cursor2" });
    const onLoaded = vi.fn();
    render(
      <LoadMoreReplies postId="p1" commentId="c1" cursor="cursor1" onLoaded={onLoaded} />
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(onLoaded).toHaveBeenCalledWith([baseReply], "cursor2")
    );
  });

  it("shows Loading... and disables button while loading", async () => {
    let resolve!: () => void;
    mockListReplies.mockReturnValue(
      new Promise((res) => { resolve = res; })
    );
    render(
      <LoadMoreReplies postId="p1" commentId="c1" cursor="cursor1" onLoaded={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
    await act(async () => { resolve({ items: [], next_cursor: undefined }); });
  });

  it("shows error message when API fails", async () => {
    mockListReplies.mockRejectedValue(new Error("Network error"));
    render(
      <LoadMoreReplies postId="p1" commentId="c1" cursor="cursor1" onLoaded={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
  });
});
