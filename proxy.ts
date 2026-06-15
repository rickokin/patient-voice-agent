import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next.js Proxy (formerly "middleware"). Enforces authentication on protected
 * routes; authorization (the allowlist) is enforced server-side in route
 * handlers and the admin/agent layouts.
 *
 * Auth is only enforced when Clerk keys are present, so the app still boots
 * (home page) before credentials are configured.
 */
const authEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/agent(.*)",
  "/api/agent(.*)",
  "/api/transcripts(.*)",
  "/api/moments(.*)",
  "/api/embeddings(.*)",
  "/api/query-logs(.*)",
]);

export default authEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
