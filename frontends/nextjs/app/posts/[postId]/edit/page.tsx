"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPost, updatePost } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import { useUsername } from "@/lib/context/UsernameContext";
import { PostForm, type PostFormValues } from "@/components/posts/PostForm";
import type { PostResponse } from "@/lib/api/types";

export default function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const { username } = useUsername();
  const [post, setPost] = useState<PostResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    getPost(postId)
      .then(setPost)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load post");
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

  if (!username || username !== post.author) {
    return (
      <p className="text-sm text-gray-500">
        You can only edit your own posts.
      </p>
    );
  }

  const handleSubmit = async ({ title, body }: PostFormValues) => {
    await updatePost(postId, { title, body });
    router.push(`/posts/${postId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/posts/${postId}`}
        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        ← Back to post
      </Link>
      <h1 className="text-2xl font-bold">Edit Post</h1>
      <PostForm
        initialValues={{ title: post.title, body: post.body }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
