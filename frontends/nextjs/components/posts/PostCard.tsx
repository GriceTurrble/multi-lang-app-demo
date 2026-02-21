import Link from "next/link";
import type { PostResponse } from "@/lib/api/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostCard({ post }: { post: PostResponse }) {
  const excerpt =
    post.body.length > 120 ? post.body.slice(0, 120) + "…" : post.body;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {post.title && (
            <h2 className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {post.title}
            </h2>
          )}
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {excerpt}
          </p>
        </div>
        <div className="shrink-0 text-sm font-medium tabular-nums text-gray-500 dark:text-gray-400">
          {post.vote_score > 0 ? "+" : ""}
          {post.vote_score}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
        <span>{post.author}</span>
        <span>·</span>
        <span>{formatDate(post.created_at)}</span>
      </div>
    </Link>
  );
}
