import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output:'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        
      },
    ],
  },
};

export default nextConfig;
