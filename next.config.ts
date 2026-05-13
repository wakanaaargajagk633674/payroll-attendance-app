import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    return [
      // Keep the public admin export URLs while shortening internal route paths
      // to avoid Windows/Turbopack path length issues in this workspace.
      {
        source: "/admin/exports/:yearMonth/export",
        destination: "/x/:yearMonth/s",
      },
      {
        source: "/admin/exports/:yearMonth/accountant-export",
        destination: "/x/:yearMonth/a",
      },
    ];
  },
};

export default nextConfig;
