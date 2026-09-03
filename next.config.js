/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "mongoose"],
  },
};

module.exports = nextConfig;
