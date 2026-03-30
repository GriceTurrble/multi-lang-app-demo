"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon } from "@heroicons/react/16/solid";
import { useAuth } from "@/lib/context/AuthProvider";
import { LoginModal } from "@/components/ui/LoginModal";
import { RegisterModal } from "@/components/ui/RegisterModal";
import { LogoutModal } from "@/components/ui/LogoutModal";

type AuthModal = "login" | "register" | null;

export function Header() {
  const { user, logout, initialized } = useAuth();
  const router = useRouter();
  const [authModal, setAuthModal] = useState<AuthModal>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    await logout();
    setConfirmLogout(false);
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/posts"
            className="text-lg font-bold tracking-tight transition-opacity hover:opacity-75"
          >
            MLAD Forum
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {!initialized ? (
              <div className="h-7 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            ) : user ? (
              <>
                <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                  <UserIcon className="size-3" />
                  {user.username}
                </span>
                <button
                  onClick={() => setConfirmLogout(true)}
                  className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthModal("login")}
                  className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthModal("register")}
                  className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <LogoutModal
        open={confirmLogout}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
      <LoginModal
        open={authModal === "login"}
        onClose={() => setAuthModal(null)}
        onSwitchToRegister={() => setAuthModal("register")}
      />
      <RegisterModal
        open={authModal === "register"}
        onClose={() => setAuthModal(null)}
        onSwitchToLogin={() => setAuthModal("login")}
      />
    </>
  );
}
