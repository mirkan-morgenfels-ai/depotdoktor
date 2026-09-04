import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@portfolio/charts", "@portfolio/csv", "@portfolio/legal", "@portfolio/pdf", "@portfolio/ui"],
  poweredByHeader: false,
};

export default nextConfig;
