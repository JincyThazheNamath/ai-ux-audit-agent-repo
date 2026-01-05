/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Chromium from server-side bundling
      config.externals = config.externals || [];
      config.externals.push('@sparticuz/chromium');
    }
    return config;
  },
};

module.exports = nextConfig;


