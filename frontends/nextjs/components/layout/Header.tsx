"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useUsername } from "@/lib/context/UsernameContext";

export function Header() {
  const { username, setUsername } = useUsername();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync with username when not editing (covers localStorage hydration)
  useEffect(() => {
    if (!editing) setDraft(username);
  }, [username, editing]);

  // Focus the input as soon as editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setDraft(username);
    setEditing(true);
  };

  const commit = () => {
    setUsername(draft.trim());
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(username);
      setEditing(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/posts"
          className="text-lg font-bold tracking-tight transition-opacity hover:opacity-75"
        >
          MLAD Forum
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span
            onClick={!editing ? startEditing : undefined}
            className="cursor-pointer text-gray-500 transition-colors hover:text-white dark:text-gray-400"
          >
            Username:
          </span>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              className="w-40 rounded border border-gray-300 bg-white px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
          ) : (
            <button
              onClick={startEditing}
              className="rounded px-1 py-0.5 text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {username ? (
                username
              ) : (
                <span className="italic text-gray-400">set a username…</span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
