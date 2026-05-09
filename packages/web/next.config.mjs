/** @type {import('next').NextConfig} */
const config = {
  allowedDevOrigins: ['192.168.0.113', '192.168.0.*'],
  env: {
    BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:3001',
  },
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': './src/lib/empty-stub.js',
    },
  },
};

export default config;
