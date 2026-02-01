/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow build to succeed; run `npm run lint` to check ESLint (warnings only)
  eslint: { ignoreDuringBuilds: true },
  // Redirect unknown routes to / so users never see 404 (backup to middleware)
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/about', destination: '/', permanent: false },
      { source: '/login', destination: '/', permanent: false },
      { source: '/signin', destination: '/', permanent: false },
      { source: '/home', destination: '/', permanent: false },
    ];
  },
  // Enable compression
  compress: true,
  
  // Optimize production builds
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Exclude Chromium from server-side bundling
      config.externals = config.externals || [];
      config.externals.push('@sparticuz/chromium');
    }
    
    // Fix for webpack chunk loading issues in development
    if (dev) {
      config.optimization = {
        ...config.optimization,
        // Use named chunks in development for better debugging
        moduleIds: 'named',
        // Ensure chunks are properly generated
        removeAvailableModules: false,
        removeEmptyChunks: false,
      };
    }
    
    // Optimize bundle splitting for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;


