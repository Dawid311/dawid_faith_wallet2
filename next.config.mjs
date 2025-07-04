/** @type {import('next').NextConfig} */
const nextConfig = {
  // OnchainKit and Base optimization
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Fix worker and module issues for OnchainKit
    if (!isServer) {
      config.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        use: {
          loader: 'worker-loader',
          options: {
            name: 'static/[hash].worker.js',
            publicPath: '/_next/'
          }
        }
      });

      // Ignore worker files on server side
      config.resolve.alias = {
        ...config.resolve.alias,
        'worker_threads': false,
      };
    }
    
    // Handle ES modules properly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      worker_threads: false,
      child_process: false,
    };

    // Ignore dynamic requires that cause issues
    config.module.rules.push({
      test: /node_modules.*\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  
  // Optimize for deployment
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: ['@coinbase/onchainkit']
  },
  
  // Disable source maps in production to avoid worker issues
  productionBrowserSourceMaps: false,
  
  // Transpile OnchainKit properly
  transpilePackages: ['@coinbase/onchainkit'],
};

export default nextConfig;
