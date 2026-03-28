"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostResponse } from "@/lib/api/types";
import { deletePost } from "@/lib/api/posts";
import { voteOnPost } from "@/lib/api/votes";
import { useAuth } from "@/lib/context/AuthProvider";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  post: PostResponse;
};

export function PostDetail({ post }: Props) {
  const { user, token } = useAuth();
  const router = useRouter();
  const isAuthor = !!user && user.username === post.author;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleVote = async (value: -1 | 0 | 1) => {
    if (!token) return;
    await voteOnPost(post.id, { value }, token);
  };

  const handleDelete = async () => {
    if (!token) return;
    setDeleting(true);
    setShowDeleteModal(false);
    try {
      await deletePost(post.id, token);
      router.push("/posts");
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        open={showDeleteModal}
        title="Delete post?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      <div className="flex flex-col gap-3">
        {post.title && (
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {post.title}
          </h1>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <span>{post.author}</span>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
          {post.updated_at !== post.created_at && (
            <>
              <span>·</span>
              <span>edited {formatDate(post.updated_at)}</span>
            </>
          )}
        </div>
        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {post.body}
        </p>
        <div className="flex items-center gap-4">
          <VoteButtons
            score={post.vote_score}
            userVote={post.user_vote}
            onVote={handleVote}
            disabled={!token}
          />
          {isAuthor && token && (
            <div className="flex items-center gap-2">
              <Link
                href={`/posts/${post.id}/edit`}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
