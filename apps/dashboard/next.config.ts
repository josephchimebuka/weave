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
