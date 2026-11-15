import type { NextConfig } from "next";
import { BACKEND_API_URL } from "./src/lib/backend";

const DEFAULT_DIST_DIR = ".next";
const distDir = process.env.NEXT_DIST_DIR || DEFAULT_DIST_DIR;

const nextConfig: NextConfig = {
  distDir,
  typescript: {
    tsconfigPath: distDir === DEFAULT_DIST_DIR ? "tsconfig.json" : "tsconfig.staging.json",
  },
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
          destination: `${BACKEND_API_URL}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
