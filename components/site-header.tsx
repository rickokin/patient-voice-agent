"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function SiteHeader({ authEnabled }: { authEnabled: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Patient Voice Agent
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link
          href="/admin"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Admin
        </Link>
        <Link
          href="/agent"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Agent
        </Link>
        {authEnabled && (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
