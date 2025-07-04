import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config, ONCHAIN_CONFIG } from './onchainConfig';
import { base } from 'wagmi/chains';

const queryClient = new QueryClient();

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dawid Faith Wallet - Base",
  description:
    "Dawid Faith Wallet auf dem Base-Netzwerk mit OnchainKit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <OnchainKitProvider
              apiKey={ONCHAIN_CONFIG.apiKey}
              chain={base}
              schemaId={ONCHAIN_CONFIG.schemaId}
            >
              {children}
            </OnchainKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
