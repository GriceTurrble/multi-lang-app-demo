import { describe, it, expect } from "vitest";
import { buildCommentTree } from "@/lib/api/treeUtils";
import type { CommentResponse } from "@/lib/api/types";

function makeComment(overrides: Partial<CommentResponse> & { id: string }): CommentResponse {
  return {
    post_id: "post1",
    author: "user",
    body: "body",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    vote_score: 0,
    user_vote: 0,
    ...overrides,
  };
}

describe("buildCommentTree", () => {
  it("returns [] for an empty array", () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it("returns one root node with replies: [] for a single root comment", () => {
    const comment = makeComment({ id: "c1" });
    const result = buildCommentTree([comment]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
    expect(result[0].replies).toEqual([]);
  });

  it("returns two root nodes in insertion order", () => {
    const c1 = makeComment({ id: "c1" });
    const c2 = makeComment({ id: "c2" });
    const result = buildCommentTree([c1, c2]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
    expect(result[1].id).toBe("c2");
  });

  it("nests one direct reply under its root", () => {
    const root = makeComment({ id: "root" });
    const child = makeComment({ id: "child", parent_comment_id: "root" });
    const result = buildCommentTree([root, child]);
    expect(result).toHaveLength(1);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe("child");
  });

  it("nests grandchild correctly (root → child → grandchild)", () => {
    const root = makeComment({ id: "root" });
    const child = makeComment({ id: "child", parent_comment_id: "root" });
    const grandchild = makeComment({ id: "grandchild", parent_comment_id: "child" });
    const result = buildCommentTree([root, child, grandchild]);
    expect(result).toHaveLength(1);
    expect(result[0].replies[0].replies[0].id).toBe("grandchild");
  });

  it("drops a reply whose parent is not in the list", () => {
    const orphan = makeComment({ id: "orphan", parent_comment_id: "nonexistent" });
    const result = buildCommentTree([orphan]);
    expect(result).toHaveLength(0);
  });

  it("places multiple replies under the same parent as siblings", () => {
    const root = makeComment({ id: "root" });
    const r1 = makeComment({ id: "r1", parent_comment_id: "root" });
    const r2 = makeComment({ id: "r2", parent_comment_id: "root" });
    const r3 = makeComment({ id: "r3", parent_comment_id: "root" });
    const result = buildCommentTree([root, r1, r2, r3]);
    expect(result[0].replies).toHaveLength(3);
  });

  it("child nodes always carry a replies array", () => {
    const root = makeComment({ id: "root" });
    const child = makeComment({ id: "child", parent_comment_id: "root" });
    const result = buildCommentTree([root, child]);
    expect(Array.isArray(result[0].replies[0].replies)).toBe(true);
  });
});
