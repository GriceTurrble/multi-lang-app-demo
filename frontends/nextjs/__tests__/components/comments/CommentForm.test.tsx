import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { CommentForm } from "@/components/comments/CommentForm";
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

const mockCreateComment = vi.fn();
vi.mock("@/lib/api/comments", () => ({
  createComment: (...args: unknown[]) => mockCreateComment(...args),
}));

const baseComment: CommentResponse = {
  id: "c1",
  post_id: "p1",
  author: "alice",
  body: "hello",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  vote_score: 0,
  user_vote: 0,
};

describe("CommentForm", () => {
  beforeEach(() => {
    mockCreateComment.mockReset();
  });

  it("shows log in prompt when there is no token", () => {
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: null });
    expect(screen.getByText("Log in", { exact: false })).toBeInTheDocument();
  });

  it("shows textarea and submit button with a token", () => {
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("placeholder is 'Write a comment...' without parentCommentId", () => {
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    expect(screen.getByPlaceholderText("Write a comment...")).toBeInTheDocument();
  });

  it("placeholder is 'Write a reply...' when parentCommentId is set", () => {
    renderWithAuth(
      <CommentForm postId="p1" parentCommentId="c0" onCommentAdded={vi.fn()} />,
      { token: "tok" }
    );
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
  });

  it("submit button is disabled when textarea is empty", () => {
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("calls createComment with correct postId, body, and token on submit", async () => {
    mockCreateComment.mockResolvedValue(baseComment);
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() =>
      expect(mockCreateComment).toHaveBeenCalledWith("p1", { body: "hello" }, "tok")
    );
  });

  it("includes parent_comment_id in the API call when provided", async () => {
    mockCreateComment.mockResolvedValue(baseComment);
    renderWithAuth(
      <CommentForm postId="p1" parentCommentId="c0" onCommentAdded={vi.fn()} />,
      { token: "tok" }
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "reply" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() =>
      expect(mockCreateComment).toHaveBeenCalledWith(
        "p1",
        { body: "reply", parent_comment_id: "c0" },
        "tok"
      )
    );
  });

  it("calls onCommentAdded and clears textarea after successful submit", async () => {
    mockCreateComment.mockResolvedValue(baseComment);
    const onCommentAdded = vi.fn();
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={onCommentAdded} />, { token: "tok" });
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.submit(textarea.closest("form")!);
    await waitFor(() => expect(onCommentAdded).toHaveBeenCalledWith(baseComment));
    expect(textarea).toHaveValue("");
  });

  it("shows an error message when API call fails", async () => {
    mockCreateComment.mockRejectedValue(new Error("Failed"));
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() => expect(screen.getByText("Failed")).toBeInTheDocument());
  });

  it("shows 'Failed to post comment' when createComment throws a non-Error value", async () => {
    mockCreateComment.mockRejectedValue("plain string error");
    renderWithAuth(<CommentForm postId="p1" onCommentAdded={vi.fn()} />, { token: "tok" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await waitFor(() =>
      expect(screen.getByText("Failed to post comment")).toBeInTheDocument()
    );
  });

  it("shows Cancel button when onCancel prop is provided", () => {
    renderWithAuth(
      <CommentForm postId="p1" onCommentAdded={vi.fn()} onCancel={vi.fn()} />,
      { token: "tok" }
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    renderWithAuth(
      <CommentForm postId="p1" onCommentAdded={vi.fn()} onCancel={onCancel} />,
      { token: "tok" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
