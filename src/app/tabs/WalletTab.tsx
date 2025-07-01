import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useActiveWallet } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
// Update the import path if the components are located elsewhere, e.g.:
// Placeholder components for Card and CardContent
export function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}
export function CardContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}
// Placeholder-Komponente für Button
export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="px-4 py-2 rounded border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-black text-sm font-medium transition"
      {...props}
    >
      {children}
    </button>
  );
}

const client = createThirdwebClient({
  clientId: "....", // <-- Deine Client-ID
});

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "email",
        "x",
        "passkey",
        "phone",
        "facebook",
        "apple",
        "coinbase",
        "twitch",
        "steam",
        "github",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

// Polygon Mainnet Chain-ID: 137
const DFAITH_CONTRACT = "0xEE27258975a2DA946CD5025134D70E5E24F6789F";
const WMATIC_CONTRACT = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

export default function WalletTab() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const status = useActiveWalletConnectionStatus();

  // Balances (Replace with your own logic or a supported hook)
  const [maticBalance, setMaticBalance] = useState<{ displayValue: string } | null>(null);
  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);

  useEffect(() => {
    async function fetchBalances() {
      if (!account?.address) {
        setMaticBalance(null);
        setDfaithBalance(null);
        return;
      }
      // Replace this with actual balance fetching logic using thirdweb SDK or ethers.js
      // Example using ethers.js (make sure to install ethers):
      // import { ethers } from "ethers";
      // const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      // const matic = await provider.getBalance(account.address);
      // setMaticBalance({ displayValue: ethers.formatEther(matic) });

      // Placeholder: set dummy values
      setMaticBalance({ displayValue: "0.00" });
      setDfaithBalance({ displayValue: "0.00" });
    }
    fetchBalances();
  }, [account?.address]);

  // Kopieren der Adresse
  const copyWalletAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      alert("✅ Adresse wurde kopiert!");
    }
  };

  // Formatierte Adresse
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (status !== "connected" || !account?.address) {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-zinc-900 rounded-xl shadow-lg p-8 flex flex-col items-center w-full max-w-xs border border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Dawid Faith Wallet
          </h2>
          <ConnectButton
            client={client}
            connectButton={{ label: "Login" }}
            connectModal={{ size: "compact" }}
            wallets={wallets}
            chain={{ chainId: 137 }} // Polygon
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl bg-white text-black shadow-2xl">
        <CardContent className="p-8">
          {/* MATIC Badge */}
          <div className="absolute top-4 left-4 bg-gray-100 rounded-2xl px-3 py-2 text-sm font-bold text-purple-600 flex items-center gap-2">
            MATIC: {maticBalance ? Number(maticBalance.displayValue).toFixed(4) : "0.00"}
          </div>

          <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Dawid Faith Wallet
          </h2>

          {/* Wallet Address */}
          <div className="flex justify-between items-center bg-gray-100 rounded-xl p-4 mb-6">
            <span className="font-mono">{formatAddress(account.address)}</span>
            <Button onClick={copyWalletAddress}>
              Adresse kopieren
            </Button>
          </div>

          {/* Balance */}
          <div className="text-center mb-8">
            <div className="text-lg font-semibold">DFAITH: {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}</div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Hier kannst du Buttons für Kaufen, Senden, etc. ergänzen */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}