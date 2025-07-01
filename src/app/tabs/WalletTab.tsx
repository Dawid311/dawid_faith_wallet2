import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane } from "react-icons/fa";

// Modal wie gehabt
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 min-w-[340px] shadow-2xl relative border border-zinc-200">
        <button className="absolute top-3 right-4 text-2xl text-zinc-400 hover:text-zinc-600" onClick={onClose}>&times;</button>
        <h3 className="font-bold mb-6 text-center text-xl text-zinc-800">{title}</h3>
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

  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);

  // Modale State
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      if (!account?.address) {
        setDfaithBalance(null);
        return;
      }
      // Hier echte Balance-Logik einbauen!
      setDfaithBalance({ displayValue: "0.00" });
    }
    fetchBalances();
  }, [account?.address]);

  const copyWalletAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      // Optional: Snackbar statt alert für bessere UX
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (status !== "connected" || !account?.address) {
    return (
      <div className="flex flex-col items-center min-h-[60vh] justify-center">
        <Card className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-zinc-700">
          <h2 className="text-2xl font-extrabold text-white mb-8 text-center tracking-tight">
            Dawid Faith Wallet
          </h2>
          <ConnectButton
            client={client}
            connectButton={{ label: "Wallet verbinden" }}
            connectModal={{ size: "compact" }}
            wallets={wallets}
            chain={{
              id: 137,
              rpc: "https://polygon-rpc.com",
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-[70vh] items-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200 py-8">
      <Card className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl border border-zinc-200 relative">
        <CardContent className="p-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <FaCoins className="text-yellow-400 text-2xl" />
              <span className="text-lg font-bold text-zinc-700">Dawid Faith Wallet</span>
            </div>
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

          {/* Wallet Address */}
          <div className="flex justify-between items-center bg-zinc-100 rounded-xl p-4 mb-8 border border-zinc-200">
            <span className="font-mono text-zinc-700 text-base">{formatAddress(account.address)}</span>
            <button
              onClick={() => {
                copyWalletAddress();
              }}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-sm font-medium transition"
              title="Adresse kopieren"
            >
              <FaRegCopy /> Kopieren
            </button>
          </div>

          {/* Balance */}
          <div className="flex flex-col items-center mb-10">
            <span className="uppercase text-xs tracking-widest text-zinc-400 mb-1">Kontostand</span>
            <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 drop-shadow">
              {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"} <span className="text-lg font-bold">DFAITH</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              className="flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white font-bold shadow-lg rounded-xl hover:scale-[1.03] transition"
              onClick={() => setShowBuy(true)}
            >
              <FaArrowDown className="text-xl" />
              <span>Kaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold shadow-lg rounded-xl hover:scale-[1.03] transition"
              onClick={() => setShowSell(true)}
            >
              <FaArrowUp className="text-xl" />
              <span>Verkaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg rounded-xl hover:scale-[1.03] transition"
              onClick={() => setShowSend(true)}
            >
              <FaPaperPlane className="text-xl" />
              <span>Senden</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modale */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="DFAITH kaufen">
        <div className="text-center text-zinc-700">Kauf-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full" onClick={() => setShowBuy(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSell} onClose={() => setShowSell(false)} title="DFAITH verkaufen">
        <div className="text-center text-zinc-700">Verkauf-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full" onClick={() => setShowSell(false)}>Schließen</Button>
      </Modal>
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
        <div className="text-center text-zinc-700">Sende-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full" onClick={() => setShowSend(false)}>Schließen</Button>
      </Modal>
    </div>
  );
}