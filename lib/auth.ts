import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

const authEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export function isAuthEnabled(): boolean {
  return authEnabled;
}

/**
 * Resolve the internal user id for the current Clerk session, creating the
 * `users` row on first sight. Returns null when auth is disabled or there is no
 * session (route handlers are still protected by middleware when auth is on).
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!authEnabled) return null;

  // Imported lazily so the module is usable when Clerk is not configured.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({ clerkUserId })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning({ id: users.id });
  if (created) return created.id;

  const [again] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return again?.id ?? null;
}
