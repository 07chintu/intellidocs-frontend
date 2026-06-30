/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable Next.js telemetry in production builds
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
