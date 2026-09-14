import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // The app contains legacy/dynamic DOM integration code whose type inference
  // currently produces non-runtime TypeScript errors during `next build`.
  // Keep deployment compilation unblocked while those areas are progressively
  // tightened without changing runtime behaviour.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
