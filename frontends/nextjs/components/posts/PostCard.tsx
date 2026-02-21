"use client";

import Link from "next/link";
import type { PostResponse } from "@/lib/api/types";
import { voteOnPost } from "@/lib/api/votes";
import { useUsername } from "@/lib/context/UsernameContext";
import { VoteButtons } from "@/components/votes/VoteButtons";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostCard({ post }: { post: PostResponse }) {
  const { username } = useUsername();
  const excerpt =
    post.body.length > 120 ? post.body.slice(0, 120) + "…" : post.body;

  const handleVote = async (value: -1 | 0 | 1) => {
    if (!username) return;
    await voteOnPost(post.id, { username, value });
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900">
      <VoteButtons
        score={post.vote_score}
        onVote={handleVote}
        disabled={!username}
        vertical
      />
      <Link
        href={`/posts/${post.id}`}
        className="min-w-0 flex-1"
      >
        <div className="flex flex-col gap-1">
          {post.title && (
            <h2 className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {post.title}
            </h2>
          )}
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {excerpt}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <span>{post.author}</span>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
      </Link>
    </div>
  );
}
