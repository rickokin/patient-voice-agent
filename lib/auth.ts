import { eq, inArray } from "drizzle-orm";
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

/**
 * Find the first of the given emails that is on the allowlist (case-insensitive).
 * Accepts multiple addresses so a Clerk account is matched on ANY of its emails,
 * not just the one Clerk happens to mark "primary".
 */
async function findAllowlistMatch(
  emails: Array<string | null | undefined>,
): Promise<{ email: string; role: string } | null> {
  const normalized = [
    ...new Set(
      emails
        .filter((e): e is string => !!e)
        .map(normalizeEmail)
        .filter(Boolean),
    ),
  ];
  if (normalized.length === 0) return null;

  const [row] = await db
    .select({ email: allowedEmails.email, role: allowedEmails.role })
    .from(allowedEmails)
    .where(inArray(allowedEmails.email, normalized));
  return row ?? null;
}

/** Application-level roles derived from the allowlist role. */
export type AppRole = "admin" | "user";

/**
 * Whether an allowlist role grants admin (full) access. `curator` is treated as
 * admin so existing curators keep their access; everything else is a standard
 * user with agent-only access.
 */
export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "curator";
}

/**
 * Resolve the internal user id AND live allowlist role for the current Clerk
 * session.
 *
 * Access is restricted to known users: a Clerk identity is only provisioned
 * into `users` when its primary email is on the `allowed_emails` allowlist, and
 * the allowlist is re-checked on every call so access can be revoked by removing
 * the email (no auto-trust of arbitrary Clerk accounts). The returned `role` is
 * the live allowlist role (source of truth), so role changes take effect without
 * touching the `users` row.
 *
 * Returns null when auth is disabled, there is no session, or the current user
 * is not (or no longer) allowlisted.
 */
export async function getCurrentUser(): Promise<{
  id: string;
  role: string;
} | null> {
  if (!authEnabled) return null;

  // Imported lazily so the module is usable when Clerk is not configured.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));

  // Fast path: a provisioned row with a stored email -> re-check the allowlist
  // cheaply (no Clerk API round-trip) so access can be revoked.
  if (existing?.email) {
    const match = await findAllowlistMatch([existing.email]);
    return match ? { id: existing.id, role: match.role } : null;
  }

  // Otherwise we need the Clerk email(s): a first sign-in, or a legacy row
  // provisioned before the email column existed. Match against ALL addresses on
  // the account so a non-primary (but verified) allowlisted email still works.
  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const candidateEmails = [
    clerkUser.primaryEmailAddress?.emailAddress,
    ...clerkUser.emailAddresses.map((e) => e.emailAddress),
  ];
  const match = await findAllowlistMatch(candidateEmails);
  if (!match) return null;

  // Backfill the matched email onto a legacy row.
  if (existing) {
    await db
      .update(users)
      .set({ email: match.email })
      .where(eq(users.id, existing.id));
    return { id: existing.id, role: match.role };
  }

  const [created] = await db
    .insert(users)
    .values({ clerkUserId, email: match.email, role: match.role })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning({ id: users.id });
  if (created) return { id: created.id, role: match.role };

  const [again] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return again ? { id: again.id, role: match.role } : null;
}

/**
 * Resolve just the internal user id for the current Clerk session. Returns null
 * when auth is disabled, there is no session, or the user is not allowlisted.
 * Protected route handlers should call `requireUserId()` so unauthorized callers
 * get a 403.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Resolve the current user's application role. Returns "admin" when auth is
 * disabled (local/dev), null when signed-out or not allowlisted, otherwise maps
 * the live allowlist role via `isAdminRole`.
 */
export async function getCurrentRole(): Promise<AppRole | null> {
  if (!authEnabled) return "admin";
  const user = await getCurrentUser();
  if (!user) return null;
  return isAdminRole(user.role) ? "admin" : "user";
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

/**
 * Like `requireUserId`, but additionally requires the user to have an admin role
 * (`admin`/`curator`). Throws `NotAuthorizedError` (HTTP 403) otherwise. Returns
 * null only when auth is disabled (local/dev). Use in admin-only route handlers.
 */
export async function requireAdmin(): Promise<string | null> {
  if (!authEnabled) return null;
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) throw new NotAuthorizedError();
  return user.id;
}
