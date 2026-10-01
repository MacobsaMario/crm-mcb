import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  ...(process.env.MACOBSA_RUNTIME === "node"
    ? {
        turbopack: {
          resolveAlias: {
            "cloudflare:workers": "./lib/node-platform-env.ts",
            "@macobsa-db": "./db/index.pg.ts",
            "@macobsa-schema": "./db/schema.pg.ts",
          },
        },
      }
    : {}),
};

export default nextConfig;
