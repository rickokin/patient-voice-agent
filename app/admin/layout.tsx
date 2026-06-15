import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUserId, isAuthEnabled } from "@/lib/auth";

/**
 * Server-side gate for the entire `/admin` area. Authentication (having a Clerk
 * session) is enforced by `middleware.ts`; this adds authorization by requiring
 * the signed-in user to be on the allowlist. Unknown users get a 403
 * (`app/forbidden.tsx`). The protected API routes enforce the same check, so
 * this is primarily a fast UX gate, not the only line of defense.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isAuthEnabled()) {
    const userId = await getCurrentUserId();
    if (!userId) forbidden();
  }

  return <>{children}</>;
}
