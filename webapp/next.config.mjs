/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Allows Edge runtime / Cloudflare Pages compatibility
  },
};

export default nextConfig;
