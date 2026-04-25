/** @type {import('next').NextConfig} */
const config = {
  allowedDevOrigins: ['192.168.0.113', '192.168.0.*'],
  env: {
    BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:3001',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    }
    return config;
  },
};

export default config;
