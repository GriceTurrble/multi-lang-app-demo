"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthProvider";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
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
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-700 dark:text-gray-300">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
