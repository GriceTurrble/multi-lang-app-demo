"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/lib/api/posts";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleDelete = async () => {
    setDeleting(true);
    setError(undefined);
    try {
      await deletePost(postId);
      router.push("/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Delete post?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
    >
      Delete
    </button>
  );
}
