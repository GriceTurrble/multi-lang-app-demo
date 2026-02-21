"use client";

import { useState } from "react";
import { listReplies } from "@/lib/api/comments";
import type { CommentResponse } from "@/lib/api/types";

type Props = {
  postId: string;
  commentId: string;
  cursor: string;
  onLoaded: (items: CommentResponse[], nextCursor?: string) => void;
};

export function LoadMoreReplies({ postId, commentId, cursor, onLoaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleLoad = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { items, next_cursor } = await listReplies(postId, commentId, {
        cursor,
      });
      onLoaded(items, next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load replies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleLoad}
        disabled={loading}
        className="w-fit text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
      >
        {loading ? "Loading…" : "Load more replies"}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
