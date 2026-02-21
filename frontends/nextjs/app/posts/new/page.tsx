"use client";

import { useRouter } from "next/navigation";
import { useUsername } from "@/lib/context/UsernameContext";
import { createPost } from "@/lib/api/posts";
import { PostForm, type PostFormValues } from "@/components/posts/PostForm";

export default function NewPostPage() {
  const { username } = useUsername();
  const router = useRouter();

  if (!username) {
    return (
      <p className="text-sm text-gray-500">
        Set a username in the header before creating a post.
      </p>
    );
  }

  const handleSubmit = async ({ title, body }: PostFormValues) => {
    const post = await createPost({ title, body, author: username });
    router.push(`/posts/${post.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">New Post</h1>
      <PostForm onSubmit={handleSubmit} submitLabel="Create Post" />
    </div>
  );
}
