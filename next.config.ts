import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/besc/id-card-generate",
  async rewrites() {
    return [
      {
        source: "/besc/id-card-generate/:path*",
        destination: "/:path*",
      },
      {
        source: "/besc/id-card-generate/api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

export default nextConfig;