import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@portfolio/csv", "@portfolio/legal", "@portfolio/ui"],
  poweredByHeader: false,
};

export default nextConfig;
