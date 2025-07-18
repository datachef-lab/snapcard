import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    // basePath: "/besc/id-card-generate",
    async rewrites() {
        return [
            {
                source: "/besc/id-card-generate/:path*",
                destination: "/:path*",
            },
        ];
    },
};

export default nextConfig;
