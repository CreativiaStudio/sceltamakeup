import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "diegodallapalma.com",
      },
      {
        protocol: "https",
        hostname: "*.diegodallapalma.com",
      },
      {
        protocol: "https",
        hostname: "cipriamakeup.it",
      },
      {
        protocol: "https",
        hostname: "*.cipriamakeup.it",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default nextConfig;
