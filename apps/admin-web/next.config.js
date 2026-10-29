const fs = require('fs');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tractor-repair/shared'],
  webpack: (config, { isServer }) => {
    const pagesDir = path.join(__dirname, '.next', 'server', 'pages');
    if (!fs.existsSync(pagesDir)) {
      try {
        fs.mkdirSync(pagesDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
};

module.exports = nextConfig;
