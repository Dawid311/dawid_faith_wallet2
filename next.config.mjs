/** @type {import('next').NextConfig} */
const nextConfig = {
  // fixes wallet connect dependency issue https://docs.walletconnect.com/web3modal/nextjs/about#extra-configuration
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  
  // Content Security Policy Headers für Thirdweb BuyWidget
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.thirdweb.com https://*.transak.com https://*.google.com https://*.verygoodvault.com https://*.checkout.com https://*.cdn-apple.com https://*.onfido.com https://*.sardine.ai https://*.ckotech.co https://*.newrelic.com https://*.plaid.com https://*.googleapis.com https://*.gstatic.com https://*.logr-ingest.com https://cdn.lrkt-in.com blob:",
              "style-src 'self' 'unsafe-inline' https://*.thirdweb.com https://*.transak.com https://*.google.com https://*.gstatic.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://*.gstatic.com https://*.googleapis.com",
              "connect-src 'self' https: wss: ws:",
              "frame-src 'self' https://*.thirdweb.com https://*.transak.com https://*.google.com https://*.checkout.com https://*.onfido.com https://*.sardine.ai https://*.plaid.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "media-src 'self' blob: data:",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;
