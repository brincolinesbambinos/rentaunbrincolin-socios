import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
