import Link from "next/link";

const sections = [
  {
    href: "/admin/transcripts",
    title: "Transcripts",
    description: "Upload or paste raw transcripts and normalize them.",
  },
  {
    href: "/admin/moments",
    title: "Story Moments",
    description: "Review, edit, approve, and embed extracted moments.",
  },
  {
    href: "/admin/query-logs",
    title: "Query Logs",
    description: "Inspect agent questions, answers, and cited moments.",
  },
];

export default function AdminHome() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Curation Dashboard
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Manage the full pipeline from transcript intake to approved, embedded
        story moments.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {s.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
