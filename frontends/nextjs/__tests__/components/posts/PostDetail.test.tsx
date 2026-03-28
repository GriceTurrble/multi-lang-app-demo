import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { PostDetail } from "@/components/posts/PostDetail";
import type { PostResponse } from "@/lib/api/types";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/",
}));

const mockDeletePost = vi.fn();
vi.mock("@/lib/api/posts", () => ({
  deletePost: (...args: unknown[]) => mockDeletePost(...args),
}));

vi.mock("@/lib/api/votes", () => ({
  voteOnPost: vi.fn().mockResolvedValue({ object_id: "p1", object_type: "post", vote_score: 1 }),
}));

function makePost(overrides: Partial<PostResponse> = {}): PostResponse {
  return {
    id: "p1",
    body: "Post body here",
    author: "alice",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    vote_score: 3,
    user_vote: 0,
    ...overrides,
  };
}

const aliceUser = { id: "u1", email: "a@b.com", username: "alice" };

describe("PostDetail", () => {
  beforeEach(() => {
    mockDeletePost.mockReset();
    mockPush.mockReset();
  });

  it("renders the post title", () => {
    renderWithAuth(<PostDetail post={makePost({ title: "My Post" })} />);
    expect(screen.getByRole("heading", { level: 1, name: "My Post" })).toBeInTheDocument();
  });

  it("does not render h1 when title is absent", () => {
    renderWithAuth(<PostDetail post={makePost()} />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("renders post body", () => {
    renderWithAuth(<PostDetail post={makePost()} />);
    expect(screen.getByText("Post body here")).toBeInTheDocument();
  });

  it("shows author and formatted date", () => {
    renderWithAuth(<PostDetail post={makePost()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows 'edited' label when updated_at differs from created_at", () => {
    renderWithAuth(
      <PostDetail post={makePost({ updated_at: "2024-02-01T00:00:00Z" })} />
    );
    expect(screen.getByText(/edited/)).toBeInTheDocument();
  });

  it("does not show 'edited' label when updated_at equals created_at", () => {
    renderWithAuth(<PostDetail post={makePost()} />);
    expect(screen.queryByText(/edited/)).not.toBeInTheDocument();
  });

  it("shows Edit link and Delete button when user is the author with a token", () => {
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show Edit/Delete when user is not the author", () => {
    renderWithAuth(<PostDetail post={makePost()} />, {
      user: { id: "u2", email: "b@c.com", username: "bob" },
      token: "tok",
    });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("disables VoteButtons when there is no token", () => {
    renderWithAuth(<PostDetail post={makePost()} />, { token: null });
    expect(screen.getByRole("button", { name: "Upvote" })).toBeDisabled();
  });

  it("does not show ConfirmModal on initial render", () => {
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    expect(screen.queryByText("Delete post?")).not.toBeInTheDocument();
  });

  it("opens ConfirmModal when Delete button is clicked", () => {
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete post?")).toBeInTheDocument();
  });

  it("closes ConfirmModal when Cancel is clicked in the modal", () => {
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete post?")).not.toBeInTheDocument();
  });

  it("calls deletePost and navigates to /posts on confirm", async () => {
    mockDeletePost.mockResolvedValue(undefined);
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockDeletePost).toHaveBeenCalledWith("p1", "tok"));
    expect(mockPush).toHaveBeenCalledWith("/posts");
  });

  it("re-enables Delete button when deletePost fails", async () => {
    mockDeletePost.mockRejectedValue(new Error("Oops"));
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete" })).not.toBeDisabled()
    );
  });

  it("disables Delete button while delete is in flight", async () => {
    let resolve!: () => void;
    mockDeletePost.mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    renderWithAuth(<PostDetail post={makePost()} />, { user: aliceUser, token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("Deleting...")).toBeInTheDocument()
    );
    resolve();
  });
});
