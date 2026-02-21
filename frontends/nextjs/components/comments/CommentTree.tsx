"use client";

import { useState, useEffect } from "react";
import { listComments } from "@/lib/api/comments";
import { buildCommentTree } from "@/lib/api/treeUtils";
import type { CommentNode } from "@/lib/api/treeUtils";
import type { CommentResponse } from "@/lib/api/types";
import { CommentNode as CommentNodeComponent } from "./CommentNode";
import { CommentForm } from "./CommentForm";

type Props = {
  postId: string;
};

export function CommentTree({ postId }: Props) {
  const [roots, setRoots] = useState<CommentNode[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    listComments(postId)
      .then(({ items, next_cursor }) => {
        setRoots(buildCommentTree(items));
        setNextCursor(next_cursor);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load comments");
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { items, next_cursor } = await listComments(postId, {
        cursor: nextCursor,
      });
      setRoots((prev) => [...prev, ...buildCommentTree(items)]);
      setNextCursor(next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more comments");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCommentAdded = (comment: CommentResponse) => {
    setRoots((prev) => [...prev, { ...comment, replies: [] }]);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Comments
      </h2>

      <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />

      {loading && (
        <p className="text-sm text-gray-500">Loading comments…</p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && roots.length === 0 && (
        <p className="text-sm text-gray-500">No comments yet. Be the first!</p>
      )}

      {roots.length > 0 && (
        <div className="flex flex-col gap-4">
          {roots.map((comment) => (
            <CommentNodeComponent
              key={comment.id}
              postId={postId}
              comment={comment}
            />
          ))}
        </div>
      )}

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-fit rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}
    </div>
  );
}
