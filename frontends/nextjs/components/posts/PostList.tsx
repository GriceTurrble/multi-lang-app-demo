"use client";

import { useState, useEffect } from "react";
import { listPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import type { PostResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/context/AuthProvider";
import { PostCard } from "./PostCard";

export function PostList() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    listPosts(undefined, token)
      .then(({ items, next_cursor }) => {
        if (cancelled) return;
        setPosts(items);
        setNextCursor(next_cursor);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load posts",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { items, next_cursor } = await listPosts(nextCursor, token);
      setPosts((prev) => [...prev, ...items]);
      setNextCursor(next_cursor);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load more posts",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading posts...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-gray-500">No posts yet. Be the first!</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-2 rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
