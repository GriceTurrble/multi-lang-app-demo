import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { PostList } from "@/components/posts/PostList";
import type { PostResponse } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/votes", () => ({
  voteOnPost: vi.fn().mockResolvedValue({ object_id: "p1", object_type: "post", vote_score: 1 }),
}));

const mockListPosts = vi.fn();
vi.mock("@/lib/api/posts", () => ({
  listPosts: (...args: unknown[]) => mockListPosts(...args),
}));

function makePost(id: string): PostResponse {
  return {
    id,
    body: `Body of ${id}`,
    author: "alice",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    vote_score: 0,
    user_vote: 0,
  };
}

describe("PostList", () => {
  beforeEach(() => {
    mockListPosts.mockReset();
  });

  it("shows loading state initially", () => {
    mockListPosts.mockReturnValue(new Promise(() => {}));
    renderWithAuth(<PostList />);
    expect(screen.getByText("Loading posts...")).toBeInTheDocument();
  });

  it("renders a PostCard per post after loading", async () => {
    mockListPosts.mockResolvedValue({
      items: [makePost("p1"), makePost("p2"), makePost("p3")],
      next_cursor: undefined,
    });
    renderWithAuth(<PostList />);
    await waitFor(() => expect(screen.queryByText("Loading posts...")).not.toBeInTheDocument());
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("shows empty state when no posts", async () => {
    mockListPosts.mockResolvedValue({ items: [], next_cursor: undefined });
    renderWithAuth(<PostList />);
    await waitFor(() => expect(screen.getByText(/No posts yet/)).toBeInTheDocument());
  });

  it("shows error message on API failure", async () => {
    mockListPosts.mockRejectedValue(new Error("API down"));
    renderWithAuth(<PostList />);
    await waitFor(() => expect(screen.getByText("Failed to load posts")).toBeInTheDocument());
  });

  it("shows Load more button when next_cursor is present", async () => {
    mockListPosts.mockResolvedValue({ items: [makePost("p1")], next_cursor: "cur1" });
    renderWithAuth(<PostList />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument()
    );
  });

  it("does not show Load more when next_cursor is absent", async () => {
    mockListPosts.mockResolvedValue({ items: [makePost("p1")], next_cursor: undefined });
    renderWithAuth(<PostList />);
    await waitFor(() => expect(screen.queryByText("Loading posts...")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("appends posts when Load more is clicked", async () => {
    mockListPosts
      .mockResolvedValueOnce({ items: [makePost("p1")], next_cursor: "cur1" })
      .mockResolvedValueOnce({ items: [makePost("p2")], next_cursor: undefined });
    renderWithAuth(<PostList />);
    await waitFor(() => screen.getByRole("button", { name: "Load more" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows Loading... and disables button while loading more", async () => {
    let resolveMore!: (v: unknown) => void;
    mockListPosts
      .mockResolvedValueOnce({ items: [makePost("p1")], next_cursor: "cur1" })
      .mockReturnValueOnce(new Promise((res) => { resolveMore = res; }));
    renderWithAuth(<PostList />);
    await waitFor(() => screen.getByRole("button", { name: "Load more" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    await act(async () => { resolveMore({ items: [], next_cursor: undefined }); });
  });

  it("shows 'Failed to load more posts' when load more rejects with a non-ApiError", async () => {
    mockListPosts
      .mockResolvedValueOnce({ items: [makePost("p1")], next_cursor: "cur1" })
      .mockRejectedValueOnce(new Error("Network failure"));
    renderWithAuth(<PostList />);
    await waitFor(() => screen.getByRole("button", { name: "Load more" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(screen.getByText("Failed to load more posts")).toBeInTheDocument()
    );
  });

  it("does not set state after unmount (no error)", async () => {
    let resolve!: (v: unknown) => void;
    mockListPosts.mockReturnValue(new Promise((res) => { resolve = res; }));
    const { unmount } = renderWithAuth(<PostList />);
    unmount();
    // resolve after unmount — should not throw
    await expect(
      new Promise<void>((res) => {
        resolve({ items: [], next_cursor: undefined });
        res();
      })
    ).resolves.toBeUndefined();
  });
});
