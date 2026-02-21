import type { CommentResponse } from "./types";

export type CommentNode = CommentResponse & { replies: CommentNode[] };

export function buildCommentTree(items: CommentResponse[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, replies: [] });
  }

  for (const node of map.values()) {
    if (!node.parent_comment_id) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_comment_id);
      if (parent) parent.replies.push(node);
    }
  }

  return roots;
}
