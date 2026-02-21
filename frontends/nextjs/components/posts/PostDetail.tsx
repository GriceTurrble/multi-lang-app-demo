"use client";

import Link from "next/link";
import type { PostResponse } from "@/lib/api/types";
import { voteOnPost } from "@/lib/api/votes";
import { useUsername } from "@/lib/context/UsernameContext";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { DeletePostButton } from "./DeletePostButton";

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
  const { username } = useUsername();
  const isAuthor = !!username && username === post.author;

  const handleVote = async (value: -1 | 0 | 1) => {
    if (!username) return;
    await voteOnPost(post.id, { username, value });
  };

  return (
    <div className="flex flex-col gap-6">
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
            onVote={handleVote}
            disabled={!username}
          />
          {isAuthor && (
            <div className="flex items-center gap-2">
              <Link
                href={`/posts/${post.id}/edit`}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Edit
              </Link>
              <DeletePostButton postId={post.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
