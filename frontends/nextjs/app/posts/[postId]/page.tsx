"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getPost } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import type { PostResponse } from "@/lib/api/types";
import Link from "next/link";
import { PostDetail } from "@/components/posts/PostDetail";
import { CommentTree } from "@/components/comments/CommentTree";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    getPost(postId)
      .then(setPost)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load post",
        );
      })
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!post) {
    return <p className="text-sm text-gray-500">Post not found.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/posts"
        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        ← Return to all posts
      </Link>
      <PostDetail post={post} />
      <CommentTree postId={postId} />
    </div>
  );
}
