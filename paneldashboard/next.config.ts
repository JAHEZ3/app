import type { NextConfig } from "next";

const AUTH_TARGET = process.env.API_AUTH_TARGET || "http://localhost:3004";
const RESTAURANT_TARGET = process.env.API_RESTAURANT_TARGET || "http://localhost:3003";
const DELIVERY_TARGET = process.env.API_DELIVERY_TARGET || "http://localhost:3002";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${AUTH_TARGET}/api/auth/:path*` },
      { source: "/api/restaurant/:path*", destination: `${RESTAURANT_TARGET}/api/restaurant/:path*` },
      { source: "/api/delivery/:path*", destination: `${DELIVERY_TARGET}/api/delivery/:path*` },
    ];
  },
};

export default nextConfig;
