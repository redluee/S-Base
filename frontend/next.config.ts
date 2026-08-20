import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.0.*",
    "100.100.219.10",
    "100.100.219.10:3000",
    "100.100.219.10:3002",
    "100.64.29.110",
    "*.ts.net",
    "base.stevenheijn.nl",
  ],
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:3001/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
