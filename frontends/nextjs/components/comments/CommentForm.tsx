"use client";

import { useState } from "react";
import { createComment } from "@/lib/api/comments";
import { useUsername } from "@/lib/context/UsernameContext";
import type { CommentResponse } from "@/lib/api/types";

type Props = {
  postId: string;
  parentCommentId?: string;
  onCommentAdded: (comment: CommentResponse) => void;
  onCancel?: () => void;
};

export function CommentForm({
  postId,
  parentCommentId,
  onCommentAdded,
  onCancel,
}: Props) {
  const { username } = useUsername();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!username) {
    return (
      <p className="text-sm text-gray-500">
        Set a username in the header to comment.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const comment = await createComment(postId, {
        author: username,
        body: body.trim(),
        ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
      });
      setBody("");
      onCommentAdded(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentCommentId ? "Write a reply…" : "Write a comment…"}
        rows={3}
        required
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
