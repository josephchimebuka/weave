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
  // Docs moved to the standalone site at docs.paywithweave.com. Forward the old
  // in-app /docs (and any sub-path) there so existing links/bookmarks land right.
  async redirects() {
    return [
      { source: '/docs', destination: 'https://docs.paywithweave.com', permanent: true },
      { source: '/docs/:path*', destination: 'https://docs.paywithweave.com/:path*', permanent: true },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      'utf-8-validate': false,
      'bufferutil': false,
      'fsevents': false,
      'net': false,
      'tls': false,
    };
    return config;
  },
};

export default nextConfig;
