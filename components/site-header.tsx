"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { usePreferences } from "@/lib/preferences";
import type { AppRole } from "@/lib/auth";

function PreferencesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="9" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

function AccountPreferencesPanel() {
  const { preferences, setPreference } = usePreferences();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Preferences
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Control how supporting information is displayed in the agent.
        </p>
      </div>
      <label className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <span>
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Show transcript titles
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            Display the source transcript title on each supporting moment.
          </span>
        </span>
        <input
          type="checkbox"
          checked={preferences.showTranscriptTitles}
          onChange={(e) =>
            setPreference("showTranscriptTitles", e.target.checked)
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
        />
      </label>
    </div>
  );
}

export function SiteHeader({
  authEnabled,
  role,
}: {
  authEnabled: boolean;
  role: AppRole | null;
}) {
  // When auth is disabled (local/dev) `role` is "admin"; signed-out users are null.
  const isAdmin = role === "admin";
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Patient Voice Agent
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {isAdmin && (
          <Link
            href="/admin"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Admin
          </Link>
        )}
        <Link
          href="/agent"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Agent
        </Link>
        {authEnabled && (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl="/">
                <button className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton>
                <UserButton.UserProfilePage
                  label="Preferences"
                  labelIcon={<PreferencesIcon />}
                  url="preferences"
                >
                  <AccountPreferencesPanel />
                </UserButton.UserProfilePage>
              </UserButton>
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
