import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { PostCard } from "@/components/posts/PostCard";
import type { PostResponse } from "@/lib/api/types";
import { voteOnPost } from "@/lib/api/votes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/votes", () => ({
  voteOnPost: vi.fn().mockResolvedValue({ object_id: "p1", object_type: "post", vote_score: 1 }),
}));

const mockVoteOnPost = voteOnPost as ReturnType<typeof vi.fn>;

function makePost(overrides: Partial<PostResponse> = {}): PostResponse {
  return {
    id: "p1",
    body: "This is the post body",
    author: "alice",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    vote_score: 0,
    user_vote: 0,
    ...overrides,
  };
}

describe("PostCard", () => {
  it("renders the post title when present", () => {
    renderWithAuth(<PostCard post={makePost({ title: "Hello World" })} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("does not render h2 when title is absent", () => {
    renderWithAuth(<PostCard post={makePost()} />);
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("truncates body at 120 chars with ellipsis", () => {
    const longBody = "a".repeat(130);
    renderWithAuth(<PostCard post={makePost({ body: longBody })} />);
    expect(screen.getByText("a".repeat(120) + "...")).toBeInTheDocument();
  });

  it("shows short body in full without truncation", () => {
    renderWithAuth(<PostCard post={makePost({ body: "Short body" })} />);
    expect(screen.getByText("Short body")).toBeInTheDocument();
  });

  it("shows author and formatted date", () => {
    renderWithAuth(<PostCard post={makePost()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    // Jan 15, 2024 (locale-dependent, but some form will appear)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("links to /posts/<id>", () => {
    renderWithAuth(<PostCard post={makePost({ id: "p42" })} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/posts/p42");
  });

  it("passes disabled=true to VoteButtons when there is no token", () => {
    renderWithAuth(<PostCard post={makePost()} />, { token: null });
    const upvoteBtn = screen.getByRole("button", { name: "Upvote" });
    expect(upvoteBtn).toBeDisabled();
  });

  it("passes disabled=false to VoteButtons when token is present", () => {
    renderWithAuth(<PostCard post={makePost()} />, { token: "tok" });
    const upvoteBtn = screen.getByRole("button", { name: "Upvote" });
    expect(upvoteBtn).not.toBeDisabled();
  });

  it("calls voteOnPost when Upvote is clicked with a token", async () => {
    mockVoteOnPost.mockClear();
    renderWithAuth(<PostCard post={makePost()} />, { token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() => expect(mockVoteOnPost).toHaveBeenCalledWith("p1", { value: 1 }, "tok"));
  });
});
