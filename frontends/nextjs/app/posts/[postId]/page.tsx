"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getPost } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import type { PostResponse } from "@/lib/api/types";
import Link from "next/link";
import { PostDetail } from "@/components/posts/PostDetail";
import { CommentTree } from "@/components/comments/CommentTree";
import { useAuth } from "@/lib/context/AuthProvider";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { token, initialized } = useAuth();
  const [post, setPost] = useState<PostResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // Wait for the stored token to resolve before fetching at all.
    //
    // Fetching immediately means requesting once as an anonymous reader and
    // again once the token lands. That is not just a wasted request: the first
    // response renders the vote controls in their signed-out state, and the
    // second can arrive after the reader has already voted and reset the
    // controls to what the server knew before that vote.
    if (!initialized) return;

    let cancelled = false;
    getPost(postId, token)
      .then((loaded) => {
        if (cancelled) return;
        setPost(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load post",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, token, initialized]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
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
