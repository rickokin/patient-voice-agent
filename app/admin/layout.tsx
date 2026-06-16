import { forbidden, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentRole, isAuthEnabled } from "@/lib/auth";

/**
 * Server-side gate for the entire `/admin` area. Admins (allowlist role
 * `admin`/`curator`) render; standard users are sent to the agent; signed-in
 * users who aren't on the allowlist get a 403 (`app/forbidden.tsx`). The
 * protected API routes enforce the same check, so this is primarily a fast UX
 * gate, not the only line of defense.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isAuthEnabled()) {
    const role = await getCurrentRole();
    if (role === "user") redirect("/agent");
    if (role !== "admin") forbidden();
  }

  return <>{children}</>;
}
