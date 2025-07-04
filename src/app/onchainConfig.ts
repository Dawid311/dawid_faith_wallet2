import { createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { http } from 'viem';
import { coinbaseWallet } from 'wagmi/connectors';

// OnchainKit-Konfiguration für Base-Netzwerk
export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Dawid Faith Wallet',
      preference: 'smartWalletOnly', // Nutzt Smart Wallets
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});

// Base-Netzwerk Konfiguration
export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';

// Contract-Adressen auf Base (diese müssen Sie entsprechend anpassen)
export const CONTRACTS = {
  // Beispiel-Token-Adresse auf Base - ersetzen Sie diese mit Ihren tatsächlichen Contract-Adressen
  FAITH_TOKEN: '0x0000000000000000000000000000000000000000', // Ersetzen Sie mit echter Adresse
  STAKING_CONTRACT: '0x0000000000000000000000000000000000000000', // Ersetzen Sie mit echter Adresse
};

// OnchainKit-spezifische Konfiguration
export const ONCHAIN_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
  chain: base,
  schemaId: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9' as `0x${string}`, // Base Attestation Schema
};
