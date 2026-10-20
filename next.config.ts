import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The API routes read guide JSON from disk at request time; make sure those files ship with the functions.
  outputFileTracingIncludes: {
    "/api/ask": ["./data/guides/**/*"],
    "/api/generate": ["./data/guides/**/*"],
  },
};

export default nextConfig;
