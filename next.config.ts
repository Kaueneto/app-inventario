import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permitir acesso via IP e domain customizado
  allowedDevOrigins: ['192.168.1.10', 'localhost', '127.0.0.1'],
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
