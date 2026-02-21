"use client";

import Link from "next/link";
import { PostList } from "@/components/posts/PostList";

export default function PostsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/posts/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Post
        </Link>
      </div>
      <PostList />
    </div>
  );
}
