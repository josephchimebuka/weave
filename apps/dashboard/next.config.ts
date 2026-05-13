import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tells webpack to transpile the shared workspace package (raw TypeScript source)
  // instead of expecting pre-compiled JS. Required for pnpm workspace: monorepos.
  transpilePackages: ['@weave/shared', '@weave-sdk/widget'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
