import type { NextConfig } from "next";

const NODE_ENV = process.env.NODE_ENV!;

const config = (!NODE_ENV || NODE_ENV === "development")
  ? {}
  : {
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
  }

const nextConfig: NextConfig = {
  ...config
};

export default nextConfig;