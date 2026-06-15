/**
 * Diagnose why an allowlisted user can't get in: compares the emails on the
 * allowlist against the emails on your Clerk accounts and reports how many
 * overlap. Prints COUNTS ONLY (no emails, no secrets).
 *
 *   npm run allowlist:diagnose
 *
 * Reads DATABASE_URL + CLERK_SECRET_KEY from .env.local.
 */
export {};

function norm(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on process.env
  }

  const { db } = await import("@/db/client");
  const { allowedEmails, users } = await import("@/db/schema");

  const usersTotal = (await db.select({ id: users.id }).from(users)).length;
  console.log(`users_total=${usersTotal}`);

  const allow = new Set(
    (await db.select({ email: allowedEmails.email }).from(allowedEmails)).map(
      (r) => norm(r.email),
    ),
  );

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set in .env.local");

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({ secretKey });
  const res = await clerk.users.getUserList({ limit: 100 });
  const clerkUserList = Array.isArray(res) ? res : (res.data ?? []);

  const clerkEmails = new Set<string>();
  for (const u of clerkUserList) {
    for (const e of u.emailAddresses ?? []) {
      if (e?.emailAddress) clerkEmails.add(norm(e.emailAddress));
    }
  }

  let matches = 0;
  for (const e of allow) if (clerkEmails.has(e)) matches++;

  console.log(`allowlist_emails=${allow.size}`);
  console.log(`clerk_users=${clerkUserList.length}`);
  console.log(`clerk_distinct_emails=${clerkEmails.size}`);
  console.log(`overlap_allowlist_vs_clerk=${matches}`);
  if (matches === 0) {
    console.log(
      "\nNo overlap: the allowlisted email does not match any email on your Clerk account(s).",
    );
    console.log(
      "Fix: npm run allowlist -- add <the-exact-email-you-log-in-with>",
    );
  } else {
    console.log(
      "\nOverlap found: an allowlisted email matches a Clerk account.",
    );
    console.log(
      "Sign out and back in (or refresh) — the users row is created automatically on the next authorized request.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
