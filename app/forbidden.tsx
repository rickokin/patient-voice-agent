import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <main className="w-full max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          403 - Forbidden
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          You don&apos;t have access
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Your account is signed in but isn&apos;t on the allowlist for this
          area. Ask an administrator to grant your email access.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
