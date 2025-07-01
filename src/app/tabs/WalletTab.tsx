import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock } from "react-icons/fa";

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
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  
  // Modale State
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showStake, setShowStake] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      if (!account?.address) {
        setDfaithBalance(null);
        setDinvestBalance(null);
        return;
      }
      // Hier echte Balance-Logik einbauen!
      setDfaithBalance({ displayValue: "0.00" });
      setDinvestBalance({ displayValue: "0.00" });
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
    <div className="flex justify-center min-h-[70vh] items-center py-8 bg-black">
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
          <div className="flex justify-between items-center bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-4 mb-8 border border-zinc-700">
            <span className="font-mono text-zinc-300 text-base">{formatAddress(account.address)}</span>
            <button
              onClick={copyWalletAddress}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-all duration-200"
              title="Adresse kopieren"
            >
              <FaRegCopy /> Kopieren
            </button>
          </div>

          {/* DFAITH Balance */}
          <div className="flex flex-col items-center mb-8">
            <span className="uppercase text-xs tracking-widest text-zinc-500 mb-2">Kontostand</span>
            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow">
              {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
            </div>
            <span className="text-sm font-semibold text-amber-400/80 mt-1">DFAITH</span>
          </div>

          {/* Action Buttons mit besseren Gradienten - jetzt immer nebeneinander */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowBuy(true)}
            >
              <FaArrowDown className="text-lg md:text-xl text-amber-400" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Kaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowSell(true)}
            >
              <FaArrowUp className="text-lg md:text-xl text-amber-400" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Verkaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-4 md:py-5 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold shadow-xl rounded-xl hover:scale-[1.03] hover:shadow-amber-500/20 transition-all duration-300 border border-zinc-700"
              onClick={() => setShowSend(true)}
            >
              <FaPaperPlane className="text-lg md:text-xl text-amber-400" />
              <span className="text-xs md:text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Senden</span>
            </Button>
          </div>
          
          {/* D.INVEST Balance - jetzt unter den Buttons */}
          <div className="flex flex-col items-center p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 w-full">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-sm text-zinc-400">D.INVEST Token</span>
              <button 
                onClick={() => setShowStake(true)}
                className="text-xs px-3 py-1 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition"
              >
                Staken
              </button>
            </div>
            <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
              {dinvestBalance ? Number(dinvestBalance.displayValue).toFixed(0) : "0"}
            </div>
            <div className="text-xs text-zinc-500 mt-1 w-full overflow-hidden text-ellipsis text-center">
              Contract: 0xa3f0Bf2a9d7f1a0958989Ea4c4DBE8B595117643
            </div>
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
      
      <Modal open={showStake} onClose={() => setShowStake(false)} title="D.INVEST staken">
        <div className="text-zinc-300">
          {/* Oberer Bereich mit Balances */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Verfügbar</p>
              <p className="text-lg font-bold text-amber-400">{dinvestBalance ? Number(dinvestBalance.displayValue).toFixed(0) : "0"}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Gestaked</p>
              <p className="text-lg font-bold text-amber-400">0</p>
            </div>
          </div>
          
          {/* Eingabefeld für Staking */}
          <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-zinc-400">Betrag:</span>
              <button 
                className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-amber-400"
                onClick={() => {/* Maximalbetrag setzen */}}
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input 
                type="number"
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-amber-400 focus:border-amber-500 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                D.INVEST
              </div>
            </div>
          </div>
          
          {/* Aktions-Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button 
              onClick={() => {/* Stake-Logik */}}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-2"
            >
              Staken
            </Button>
            <Button 
              onClick={() => {/* Unstake-Logik */}}
              className="bg-zinc-800 border border-zinc-700 text-amber-400 font-bold py-2 hover:bg-zinc-700"
            >
              Unstaken
            </Button>
          </div>
          
          {/* Rewards-Bereich */}
          <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-zinc-400">Verdiente Belohnungen:</span>
              <span className="text-amber-400 font-bold">0 DFAITH</span>
            </div>
            <Button 
              onClick={() => {/* Claim-Logik */}} 
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
            >
              Belohnungen einfordern
            </Button>
          </div>
          
          {/* Info-Bereich */}
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 text-xs">
            <div className="flex items-center mb-2 gap-2">
              <FaLock className="text-amber-400" />
              <span className="text-zinc-300">Smart Contract:</span>
            </div>
            <div className="font-mono text-amber-400/80 break-all text-xs">
              0x333C4053048D542f039bd3de08f35AB998a6e68E
            </div>
          </div>
        </div>
        <Button className="mt-2 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowStake(false)}>
          Schließen
        </Button>
      </Modal>
    </div>
  );
}