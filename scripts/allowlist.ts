/**
 * Manage the user allowlist (the `allowed_emails` table).
 *
 * Only emails on this list can sign in and be provisioned into `users`.
 * Use it to bootstrap the first admins (there is no in-app UI for it yet).
 *
 * Roles:
 *   - "admin" or "curator" -> full access (admin area + agent)
 *   - any other value (e.g. "user") -> standard user, agent access only
 *
 *   npm run allowlist -- list
 *   npm run allowlist -- add <email> [role]      # role defaults to "curator" (admin)
 *   npm run allowlist -- add <email> user        # standard, agent-only user
 *   npm run allowlist -- remove <email>
 *
 * Reads DATABASE_URL from .env.local.
 */
export {};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on process.env (e.g. in CI)
  }

  const { db } = await import("@/db/client");
  const { allowedEmails } = await import("@/db/schema");
  const { asc, eq } = await import("drizzle-orm");

  const [command, emailArg, roleArg] = process.argv.slice(2);

  switch (command) {
    case "list": {
      const rows = await db
        .select()
        .from(allowedEmails)
        .orderBy(asc(allowedEmails.email));
      if (rows.length === 0) {
        console.log("Allowlist is empty.");
      } else {
        console.log(`Allowlist (${rows.length}):`);
        for (const r of rows) {
          console.log(`  ${r.email}  [${r.role}]`);
        }
      }
      break;
    }

    case "add": {
      if (!emailArg) throw new Error("Usage: allowlist add <email> [role]");
      const email = normalizeEmail(emailArg);
      const role = roleArg ?? "curator";
      await db
        .insert(allowedEmails)
        .values({ email, role })
        .onConflictDoUpdate({ target: allowedEmails.email, set: { role } });
      console.log(`Allowed: ${email} [${role}]`);
      break;
    }

    case "remove": {
      if (!emailArg) throw new Error("Usage: allowlist remove <email>");
      const email = normalizeEmail(emailArg);
      const deleted = await db
        .delete(allowedEmails)
        .where(eq(allowedEmails.email, email))
        .returning({ email: allowedEmails.email });
      console.log(
        deleted.length > 0
          ? `Removed: ${email} (existing sessions lose access on next request)`
          : `Not found: ${email}`,
      );
      break;
    }

    default:
      console.log(
        "Usage:\n  allowlist list\n  allowlist add <email> [role]\n  allowlist remove <email>",
      );
      process.exit(command ? 1 : 0);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
