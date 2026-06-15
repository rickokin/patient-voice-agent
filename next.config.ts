import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables the `forbidden()` / `unauthorized()` auth interrupts used to gate
    // the admin area for users who are signed in but not on the allowlist.
    authInterrupts: true,
  },
};

export default nextConfig;
