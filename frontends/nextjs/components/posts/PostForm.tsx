"use client";

import Link from "next/link";
import Form from "next/form";
import { useState } from "react";

export type PostFormValues = {
  title?: string;
  body: string;
};

type Props = {
  initialValues?: PostFormValues;
  onSubmit: (values: PostFormValues) => Promise<void>;
  submitLabel?: string;
};

export function PostForm({ initialValues, onSubmit, submitLabel = "Submit" }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleForm(formData: FormData) {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await onSubmit({ title: title.trim() || undefined, body: body.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form action={handleForm} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="title"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          name="title"
          type="text"
          value={title}
          placeholder="Post title..."
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="body"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Body <span className="text-red-500">*</span>
        </label>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          required
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <Link
          className="w-fit rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          href="/posts"
        >
          Cancel
        </Link>
      </div>
    </Form>
  );
}
