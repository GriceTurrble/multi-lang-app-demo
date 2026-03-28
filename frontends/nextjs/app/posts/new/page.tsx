"use client";

import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/context/AuthProvider";
import { createPost } from "@/lib/api/posts";
import { PostForm, type PostFormValues } from "@/components/posts/PostForm";

export default function NewPostPage() {
  const { user, token, initialized } = useRequireAuth();
  const router = useRouter();

  if (!initialized || !user || !token) {
    return null;
  }

  const handleSubmit = async ({ title, body }: PostFormValues) => {
    const post = await createPost({ title, body }, token);
    router.push(`/posts/${post.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">New Post</h1>
      <PostForm onSubmit={handleSubmit} submitLabel="Create Post" />
    </div>
  );
}
