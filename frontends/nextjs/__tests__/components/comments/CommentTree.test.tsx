import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { CommentTree } from "@/components/comments/CommentTree";
import type { CommentResponse } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/form", () => ({
  default: ({ action, children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { action: (fd: FormData) => void }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action(new FormData(e.currentTarget));
      }}
      {...props}
    >
      {children}
    </form>
  ),
}));

vi.mock("@/lib/api/votes", () => ({
  voteOnComment: vi.fn().mockResolvedValue({ object_id: "c1", object_type: "comment", vote_score: 1 }),
}));

const mockListComments = vi.fn();
const mockCreateComment = vi.fn();
vi.mock("@/lib/api/comments", () => ({
  listComments: (...args: unknown[]) => mockListComments(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  listReplies: vi.fn(),
}));

function makeComment(id: string, overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id,
    post_id: "p1",
    author: "alice",
    body: `Comment ${id}`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    vote_score: 0,
    user_vote: 0,
    ...overrides,
  };
}

describe("CommentTree", () => {
  beforeEach(() => {
    mockListComments.mockReset();
    mockCreateComment.mockReset();
  });

  it("shows loading state initially", () => {
    mockListComments.mockReturnValue(new Promise(() => {}));
    renderWithAuth(<CommentTree postId="p1" />);
    expect(screen.getByText("Loading comments...")).toBeInTheDocument();
  });

  it("renders root comment nodes after load", async () => {
    mockListComments.mockResolvedValue({
      items: [makeComment("c1"), makeComment("c2")],
      next_cursor: undefined,
    });
    renderWithAuth(<CommentTree postId="p1" />);
    await waitFor(() => expect(screen.queryByText("Loading comments...")).not.toBeInTheDocument());
    expect(screen.getByText("Comment c1")).toBeInTheDocument();
    expect(screen.getByText("Comment c2")).toBeInTheDocument();
  });

  it("shows empty state when there are no comments", async () => {
    mockListComments.mockResolvedValue({ items: [], next_cursor: undefined });
    renderWithAuth(<CommentTree postId="p1" />);
    await waitFor(() => expect(screen.getByText(/No comments yet/)).toBeInTheDocument());
  });

  it("shows error message on API failure", async () => {
    mockListComments.mockRejectedValue(new Error("Failed to fetch"));
    renderWithAuth(<CommentTree postId="p1" />);
    await waitFor(() => expect(screen.getByText("Failed to fetch")).toBeInTheDocument());
  });

  it("shows 'Load more comments' button when next_cursor is present", async () => {
    mockListComments.mockResolvedValue({
      items: [makeComment("c1")],
      next_cursor: "cur1",
    });
    renderWithAuth(<CommentTree postId="p1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Load more comments" })).toBeInTheDocument()
    );
  });

  it("appends new root nodes when Load more is clicked", async () => {
    mockListComments
      .mockResolvedValueOnce({ items: [makeComment("c1")], next_cursor: "cur1" })
      .mockResolvedValueOnce({ items: [makeComment("c2")], next_cursor: undefined });
    renderWithAuth(<CommentTree postId="p1" />);
    await waitFor(() => screen.getByRole("button", { name: "Load more comments" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more comments" }));
    await waitFor(() => expect(screen.getByText("Comment c2")).toBeInTheDocument());
    expect(screen.getByText("Comment c1")).toBeInTheDocument();
  });

  it("adds a new top-level comment via CommentForm", async () => {
    mockListComments.mockResolvedValue({ items: [], next_cursor: undefined });
    const newComment = makeComment("c-new", { body: "Fresh comment" });
    mockCreateComment.mockResolvedValue(newComment);
    renderWithAuth(<CommentTree postId="p1" />, { token: "tok" });
    await waitFor(() => expect(screen.getByRole("textbox")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Fresh comment" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() => expect(screen.getByText("Fresh comment")).toBeInTheDocument());
  });
});
