import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Allows Edge runtime / Cloudflare Pages compatibility
  },
  webpack: (config) => {
    // Ensure modules imported from ../src/ resolve packages
    // from webapp/node_modules (not just root node_modules)
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...(config.resolve.modules || ['node_modules']),
    ];
    return config;
  },
};

export default nextConfig;
