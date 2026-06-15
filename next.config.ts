import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the PDF/Word text-extraction libraries out of the server bundle so they
  // load their native/worker assets correctly at runtime.
  serverExternalPackages: ["mammoth", "unpdf"],
  experimental: {
    // Enables the `forbidden()` / `unauthorized()` auth interrupts used to gate
    // the admin area for users who are signed in but not on the allowlist.
    authInterrupts: true,
  },
};

export default nextConfig;
