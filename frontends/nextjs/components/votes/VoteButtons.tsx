"use client";

import { useState } from "react";

type Props = {
  score: number;
  userVote?: -1 | 0 | 1;
  onVote: (value: -1 | 0 | 1) => Promise<void>;
  disabled?: boolean;
  vertical?: boolean;
};

export function VoteButtons({ score, userVote = 0, onVote, disabled, vertical }: Props) {
  const [pending, setPending] = useState(false);
  const [localDelta, setLocalDelta] = useState(0);
  const [currentVote, setCurrentVote] = useState(userVote);

  const handleVote = async (value: -1 | 1) => {
    if (pending || disabled) return;
    // Clicking the same direction toggles off (unvote)
    const next: -1 | 0 | 1 = currentVote === value ? 0 : value;
    const delta = next - currentVote;
    const prevVote = currentVote;
    const prevDelta = localDelta;

    // Optimistic update
    setCurrentVote(next);
    setLocalDelta((d) => d + delta);
    setPending(true);

    try {
      await onVote(next);
    } catch {
      // Revert on failure
      setCurrentVote(prevVote);
      setLocalDelta(prevDelta);
    } finally {
      setPending(false);
    }
  };

  const displayScore = score + localDelta;

  return (
    <div className={`flex items-center gap-1 ${vertical ? "flex-col" : ""}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={pending || disabled}
        aria-label="Upvote"
        className={`rounded px-1.5 py-0.5 text-sm transition-colors disabled:opacity-50 ${
          currentVote === 1
            ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        }`}
      >
        ▲
      </button>
      <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
        {displayScore > 0 ? "+" : ""}
        {displayScore}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={pending || disabled}
        aria-label="Downvote"
        className={`rounded px-1.5 py-0.5 text-sm transition-colors disabled:opacity-50 ${
          currentVote === -1
            ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        }`}
      >
        ▼
      </button>
    </div>
  );
}
