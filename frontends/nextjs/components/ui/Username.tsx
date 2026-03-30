"use client";

import { UserIcon } from "@heroicons/react/16/solid";

type Props = {
  username: string;
  isCurrentUser?: boolean;
};

export function Username({ username, isCurrentUser }: Props) {
  // NOTE your editor will probably not highlight if you have conflicts in Tailwind styles listed here.
  // Use caution, please!
  const sameUserStyle  = "text-blue-600 ring-blue-200 dark:text-blue-400 dark:ring-blue-800";
  const otherUserStyle = "text-gray-700 ring-gray-200 dark:text-gray-300 dark:ring-gray-700";
  return (
    <span
      className={`flex items-center gap-1 font-semibold rounded px-1 ring-1 ${isCurrentUser ? sameUserStyle : otherUserStyle}`}
    >
      <UserIcon className="size-3" />
      {username}
    </span>
  );
}
