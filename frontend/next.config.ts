import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
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
