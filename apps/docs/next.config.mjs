import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Transpile the raw-TypeScript workspace widget (module → src/index.tsx) so the
  // live Widget Playground renders the real @weave-sdk/widget, same as the dashboard.
  transpilePackages: ['@weave-sdk/widget'],
  typescript: { ignoreBuildErrors: true },
  webpack: (cfg) => {
    // The widget pulls in wagmi/viem, which reference node/native modules the
    // browser bundle doesn't need. Mirror the dashboard's fallbacks.
    cfg.resolve.fallback = {
      ...cfg.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      'utf-8-validate': false,
      'bufferutil': false,
      'fsevents': false,
      'net': false,
      'tls': false,
    };
    return cfg;
  },
};

export default withMDX(config);
