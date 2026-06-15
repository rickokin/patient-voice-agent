import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUserId, isAuthEnabled } from "@/lib/auth";

/**
 * Server-side gate for the `/agent` area. Authentication (a Clerk session) is
 * enforced by `middleware.ts`; this adds the allowlist authorization check so
 * signed-in-but-unknown users get a 403 (`app/forbidden.tsx`). The agent API
 * routes enforce the same check, so this is primarily a fast UX gate.
 */
export default async function AgentLayout({
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
