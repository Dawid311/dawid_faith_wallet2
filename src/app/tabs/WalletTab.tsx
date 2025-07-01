import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

// Modal wie gehabt
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

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();

  const [maticBalance, setMaticBalance] = useState<{ displayValue: string } | null>(null);
  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);

  // Modale State
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
          {/* Header mit MATIC, History und Wallet-Connect */}
          <div className="flex justify-between items-center mb-6">
            {/* MATIC Badge */}
            <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm font-bold text-purple-600 flex items-center gap-2">
              MATIC: {maticBalance ? Number(maticBalance.displayValue).toFixed(4) : "0.00"}
            </div>
            <div className="flex items-center gap-2">
              {/* History Button */}
              <Button
                className="bg-zinc-100 border border-zinc-300 hover:bg-zinc-200 text-black px-3 py-2 rounded-lg text-sm font-medium"
                onClick={() => setShowHistory(true)}
                title="Transaktionshistorie"
              >
                <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historie
              </Button>
              {/* Thirdweb ConnectButton */}
              <ConnectButton
                client={client}
                connectButton={{ label: "" }}
                connectModal={{ size: "compact" }}
                wallets={wallets}
                chain={{
                  id: 137,
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>
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
          <div className="flex flex-row gap-4 justify-center">
            <Button className="flex-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white font-bold shadow-lg" onClick={() => setShowBuy(true)}>
              Kaufen
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold shadow-lg" onClick={() => setShowSell(true)}>
              Verkaufen
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg" onClick={() => setShowSend(true)}>
              Senden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modale */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="DFAITH kaufen">
        <div className="text-center">Kauf-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowBuy(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSell} onClose={() => setShowSell(false)} title="DFAITH verkaufen">
        <div className="text-center">Verkauf-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowSell(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
        <div className="text-center">Sende-Funktion kommt hier hin.</div>
        <Button className="mt-4 w-full" onClick={() => setShowSend(false)}>Schließen</Button>
      </Modal>
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Transaktionshistorie">
        <div className="text-center">Hier könnte deine Transaktionshistorie stehen.</div>
        <Button className="mt-4 w-full" onClick={() => setShowHistory(false)}>Schließen</Button>
      </Modal>
    </div>
  );
}