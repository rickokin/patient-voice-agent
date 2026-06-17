import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth";

export default async function Home() {
  // Standard users only have agent access; send them straight there. Admins and
  // signed-out visitors see the landing page below.
  if ((await getCurrentRole()) === "user") redirect("/agent");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <main className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          Under the Sisterhood
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Patient Voice Agent
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Curate lived-experience patient stories and explore them through an
          evidence-grounded conversational agent. Answers are retrieved from
          approved story moments, never invented.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin"
            className="group rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Admin / Curation
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Upload transcripts, extract and review story moments, approve them,
              and generate embeddings.
            </p>
          </Link>

          <Link
            href="/agent"
            className="group rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Demo Agent
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Ask questions, choose an audience mode, and get answers grounded in
              supporting story moments.
            </p>
          </Link>

          <Link
            href="/studio"
            className="group rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Insight Studio
              </h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                New
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              An exploration workspace: story moment cards, suggested follow-ups,
              find-similar search, and audience translations.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
