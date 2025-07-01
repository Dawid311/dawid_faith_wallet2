import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane } from "react-icons/fa";

// Modal mit dunklem Farbschema
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 rounded-2xl p-8 min-w-[340px] shadow-2xl relative border border-zinc-700">
        <button className="absolute top-3 right-4 text-2xl text-zinc-500 hover:text-zinc-300" onClick={onClose}>&times;</button>
        <h3 className="font-bold mb-6 text-center text-xl text-amber-400">{title}</h3>
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
        "email", // Email als erste Option für einfachen Zugang
        "google",
        "facebook",
        "apple",
        "x", // Twitter
        "phone",
        // Optionale weitere Optionen
        "discord",
        "telegram",
        "passkey",
        "coinbase",
        // Weniger häufig genutzte Optionen weiter unten
        "twitch",
        "steam",
        "github",
      ],
    },
  }),
  // Gängige Web3 Wallets zuerst
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  // Weitere Wallets
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
      <div className="flex flex-col items-center min-h-[70vh] justify-center bg-black py-8">
        <Card className="w-full max-w-sm bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
          {/* Glanzeffekt/Highlight oben */}
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-t-3xl"></div>
          
          <CardContent className="p-8 relative z-10">
            {/* Logo/Header */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-xl" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                Dawid Faith Wallet
              </h2>
            </div>
            
            <p className="text-zinc-400 text-center mb-8">
              Verbinde dich, um auf deine Token zuzugreifen
            </p>
            
            {/* Angepasster Connect Button mit begrenzten Optionen - jetzt zentriert */}
            <div className="flex justify-center w-full">
              <ConnectButton
                client={client}
                connectButton={{ 
                  label: "Wallet verbinden",
                  className: "w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
                }}
                connectModal={{
                  size: "compact",
                  title: "Wallet verbinden", 
                  welcomeScreen: {
                    title: "Dawid Faith Wallet",
                    subtitle: "Wähle deine bevorzugte Anmeldemethode",
                    img: {
                      src: "https://placehold.co/400x200/gold/black?text=DFAITH",
                      width: 400,
                      height: 200
                    }
                  },
                }}
                wallets={[
                  inAppWallet({
                    auth: {
                      options: [
                        "email", 
                        "google",
                        "facebook",
                      ],
                    },
                  }),
                  createWallet("io.metamask"),
                  createWallet("com.coinbase.wallet"),
                ]}
                chain={{
                  id: 137,
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-[70vh] items-center py-8 bg-black"> {/* Hier geändert von bg-zinc-100 zu bg-black */}
      <Card className="w-full max-w-xl bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
        {/* Glanzeffekt/Highlight oben */}
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-t-3xl"></div>
        
        <CardContent className="p-10 relative z-10">
          {/* Header mit Gold-Akzent */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-xl" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                Dawid Faith Wallet
              </span>
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

          {/* Wallet Address mit besserem Styling */}
          <div className="flex justify-between items-center bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-4 mb-10 border border-zinc-700">
            <span className="font-mono text-zinc-300 text-base">{formatAddress(account.address)}</span>
            <button
              onClick={copyWalletAddress}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-all duration-200"
              title="Adresse kopieren"
            >
              <FaRegCopy /> Kopieren
            </button>
          </div>

          {/* Balance mit Gold/Gradient Style */}
          <div className="flex flex-col items-center mb-12">
            <span className="uppercase text-xs tracking-widest text-zinc-500 mb-2">Kontostand</span>
            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow">
              {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
            </div>
            <span className="text-sm font-semibold text-amber-400/80 mt-1">DFAITH</span>
          </div>

          {/* Action Buttons mit besseren Gradienten - jetzt immer nebeneinander */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowBuy(true)}
            >
              <FaArrowDown className="text-lg md:text-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Kaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowSell(true)}
            >
              <FaArrowUp className="text-lg md:text-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Verkaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowSend(true)}
            >
              <FaPaperPlane className="text-lg md:text-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Senden</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modale mit angepasstem Inhalt */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="DFAITH kaufen">
        <div className="text-center text-zinc-300">Kauf-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold" onClick={() => setShowBuy(false)}>
          Schließen
        </Button>
      </Modal>

      <Modal open={showSell} onClose={() => setShowSell(false)} title="DFAITH verkaufen">
        <div className="text-center text-zinc-300">Verkauf-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold" onClick={() => setShowSell(false)}>
          Schließen
        </Button>
      </Modal>

      <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
        <div className="text-center text-zinc-300">Sende-Funktion kommt hier hin.</div>
        <Button className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold" onClick={() => setShowSend(false)}>
          Schließen
        </Button>
      </Modal>
    </div>
  );
}