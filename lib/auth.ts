import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { allowedEmails, users } from "@/db/schema";
import { NotAuthorizedError } from "@/lib/http";

const authEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export function isAuthEnabled(): boolean {
  return authEnabled;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Look up an email on the allowlist (case-insensitive). */
async function lookupAllowlist(
  email: string,
): Promise<{ allowed: boolean; role?: string }> {
  const [row] = await db
    .select({ role: allowedEmails.role })
    .from(allowedEmails)
    .where(eq(allowedEmails.email, normalizeEmail(email)));
  return row ? { allowed: true, role: row.role } : { allowed: false };
}

/**
 * Resolve the internal user id for the current Clerk session.
 *
 * Access is restricted to known users: a Clerk identity is only provisioned
 * into `users` when its primary email is on the `allowed_emails` allowlist, and
 * the allowlist is re-checked on every call so access can be revoked by removing
 * the email (no auto-trust of arbitrary Clerk accounts).
 *
 * Returns null when auth is disabled, there is no session, or the current user
 * is not (or no longer) allowlisted. Protected route handlers should call
 * `requireUserId()` instead so unauthorized callers get a 403.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!authEnabled) return null;

  // Imported lazily so the module is usable when Clerk is not configured.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));

  if (existing) {
    // Re-enforce the allowlist using the stored email (no Clerk API round-trip).
    if (!existing.email) return null;
    const { allowed } = await lookupAllowlist(existing.email);
    return allowed ? existing.id : null;
  }

  // First sign-in: provision only if the Clerk primary email is allowlisted.
  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) return null;

  const { allowed, role } = await lookupAllowlist(email);
  if (!allowed) return null;

  const normalized = normalizeEmail(email);
  const [created] = await db
    .insert(users)
    .values({ clerkUserId, email: normalized, role: role ?? "curator" })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning({ id: users.id });
  if (created) return created.id;

  const [again] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return again?.id ?? null;
}

/**
 * Like `getCurrentUserId`, but throws `NotAuthorizedError` (mapped to HTTP 403)
 * when auth is enabled and the caller is not an allowlisted user. Returns null
 * only when auth is disabled (local/dev). Use in protected route handlers.
 */
export async function requireUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  const userId = await getCurrentUserId();
  if (!userId) throw new NotAuthorizedError();
  return userId;
}
