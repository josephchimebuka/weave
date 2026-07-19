/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optional/native deps probed by wallet SDKs (MetaMask via wagmi) that don't
  // exist in a web bundle — stub them so webpack stops warning. Mirrors the
  // dashboard's next.config, which renders the same widget.
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
