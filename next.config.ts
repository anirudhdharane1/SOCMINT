import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        serverExternalPackages: ['@xenova/transformers'],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
