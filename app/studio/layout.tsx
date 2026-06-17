import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUserId, isAuthEnabled } from "@/lib/auth";

/**
 * Server-side gate for the `/studio` (Insight Studio) area. Mirrors the
 * `/agent` gate: authentication is enforced by `middleware.ts`; this adds the
 * allowlist authorization check so signed-in-but-unknown users get a 403. The
 * insight API routes enforce the same check, so this is primarily a UX gate.
 */
export default async function StudioLayout({
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
