// OnchainKit client configuration für Base
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Dawid Faith Wallet',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})

// Export für Kompatibilität mit bestehenden Imports
export const client = config;
