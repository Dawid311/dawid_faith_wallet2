import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

// Placeholder-Komponenten für Card und CardContent
export function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}
export function CardContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}
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

// Einfache Modal-Komponente
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 min-w-[300px] shadow-xl relative">
        <button className="absolute top-2 right-3 text-xl" onClick={onClose}>&times;</button>
        <h3 className="font-bold mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID!,
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

const DFAITH_CONTRACT = "0xEE27258975a2DA946CD5025134D70E5E24F6789F";
const WMATIC_CONTRACT = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();

  const [maticBalance, setMaticBalance] = useState<{ displayValue: string } | null>(null);
  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);

  // Modale State
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      if (!account?.address) {
        setMaticBalance(null);
        setDfaithBalance(null);
        return;
      }
      // Hier echte Balance-Logik einbauen!
      setMaticBalance({ displayValue: "0.00" });
      setDfaithBalance({ displayValue: "0.00" });
    }
    fetchBalances();
  }, [account?.address]);

  const copyWalletAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      alert("✅ Adresse wurde kopiert!");
    }
  };

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
            chain={{
              id: 137,
              rpc: "https://polygon-rpc.com",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl bg-white text-black shadow-2xl relative">
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
            <div className="text-lg font-semibold">
              DFAITH: {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="flex-1" onClick={() => setShowBuy(true)}>
              Kaufen
            </Button>
            <Button className="flex-1" onClick={() => setShowSell(true)}>
              Verkaufen
            </Button>
            <Button className="flex-1" onClick={() => setShowSend(true)}>
              Senden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modale */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="DFAITH kaufen">
        {/* Hier Kauf-Formular */}
        <div className="text-center">Kauf-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowBuy(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSell} onClose={() => setShowSell(false)} title="DFAITH verkaufen">
        {/* Hier Verkauf-Formular */}
        <div className="text-center">Verkauf-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowSell(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
        {/* Hier Sende-Formular */}
        <div className="text-center">Sende-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowSend(false)}>Schließen</Button>
      </Modal>
    </div>
  );
}