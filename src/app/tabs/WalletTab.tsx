import { useEffect, useState, useRef } from "react";
import { createThirdwebClient } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock } from "react-icons/fa";
import Script from "next/script";

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

declare global {
  interface Window {
    SwapWidget: any;
  }
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
  const uniswapWidgetRef = useRef<HTMLDivElement>(null);
  const [uniswapLoaded, setUniswapLoaded] = useState(false);

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

  // Uniswap Widget initialisieren, wenn Modal geöffnet wird
  useEffect(() => {
    if (showSell && uniswapWidgetRef.current && uniswapLoaded && window.SwapWidget) {
      try {
        const widget = new window.SwapWidget({
          width: "100%",
          theme: {
            primary: "#1c1c1c",
            secondary: "#2c2c2c",
            interactive: "#fbbf24",
            container: "#18181b",
            module: "#27272a",
            accent: "#f59e0b",
            outline: "#3f3f46",
            dialog: "#18181b",
            fontFamily: "Inter"
          },
          defaultInputTokenAddress: "0xEE27258975a2DA946CD5025134D70E5E24F6789F", // DFAITH-Token-Adresse
          defaultInputAmount: 1,
          defaultOutputTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC auf Polygon
          jsonRpcEndpoint: "https://polygon-rpc.com", // Expliziten RPC Endpoint angeben
          tokenList: [
            {
              "name": "DFAITH Token",
              "address": "0xEE27258975a2DA946CD5025134D70E5E24F6789F",
              "symbol": "DFAITH",
              "decimals": 18,
              "chainId": 137,
              "logoURI": "https://placehold.co/200x200/gold/black?text=DF"
            },
            {
              "name": "Wrapped Matic",
              "address": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
              "symbol": "WMATIC",
              "decimals": 18,
              "chainId": 137,
              "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png"
            }
          ]
        });
        
        // Widget zum Container hinzufügen
        const container = uniswapWidgetRef.current;
        container.innerHTML = "";
        widget.render(container);
        
        return () => {
          if (container) container.innerHTML = "";
        };
      } catch (error) {
        console.error("Fehler beim Initialisieren des Uniswap Widgets:", error);
      }
    }
  }, [showSell, uniswapLoaded, account]);

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
    <>
      <Script 
        src="https://unpkg.com/@uniswap/widgets@latest/dist/uniswap-widgets.js" 
        onLoad={() => setUniswapLoaded(true)}
      />
      
      <div className="flex justify-center min-h-[70vh] items-center py-8 bg-black">
        <Card className="w-full max-w-xl bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
          {/* Verbesserte Glanzeffekte */}
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 rounded-t-3xl"></div>
          <div className="absolute top-0 right-0 w-1/3 h-20 bg-amber-400/10 blur-3xl rounded-full"></div>
          
          <CardContent className="p-6 md:p-10 relative z-10">
            {/* Header mit verbessertem Gold-Akzent */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-lg shadow-amber-500/20">
                  <FaCoins className="text-black text-lg md:text-xl" />
                </div>
                <span className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Dawid Faith Wallet
                </span>
              </div>
              <ConnectButton
                client={client}
                connectButton={{ 
                  label: "", 
                  className: "bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
                }}
                connectModal={{ size: "compact" }}
                wallets={wallets}
                chain={{
                  id: 137,
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>

            {/* Wallet Address mit besserem Styling */}
            <div className="flex justify-between items-center bg-zinc-800/70 backdrop-blur-sm rounded-xl p-3 mb-6 border border-zinc-700/80">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 mb-0.5">Wallet Adresse</span>
                <span className="font-mono text-zinc-300 text-sm">{formatAddress(account.address)}</span>
              </div>
              <button
                onClick={copyWalletAddress}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-all duration-200"
                title="Adresse kopieren"
              >
                <FaRegCopy /> Kopieren
              </button>
            </div>

            {/* Token-Karten Grid - DFAITH und D.INVEST nebeneinander */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* DFAITH Token-Karte */}
              <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
                <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">DFAITH</span>
                <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                  {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
                </div>
                
                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent my-3"></div>
                
                <div className="text-xs text-zinc-500">
                  ≈ 0.00 EUR
                </div>
              </div>
              
              {/* D.INVEST Token-Karte */}
              <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
                <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.INVEST</span>
                <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                  {dinvestBalance ? Number(dinvestBalance.displayValue).toFixed(0) : "0"}
                </div>
                
                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent my-3"></div>
                
                <div className="text-xs text-zinc-500">
                  Gestaked: <span className="text-amber-400/80">0</span>
                </div>
              </div>
            </div>

            {/* Action Buttons mit besseren Gradienten - redesigned */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowBuy(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowDown className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Kaufen</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSell(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowUp className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Verkaufen</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSend(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaPaperPlane className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Senden</span>
              </Button>
            </div>
            
            {/* Staking-Button am unteren Rand */}
            <Button 
              onClick={() => setShowStake(true)}
              className="w-full py-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-400 font-medium rounded-xl border border-amber-500/20 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FaLock size={14} />
              <span>D.INVEST Staken & Verdienen</span>
            </Button>
          </CardContent>
        </Card>

        {/* Kauf-Modal mit 3 Buttons */}
        <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Token kaufen">
          <div className="flex flex-col gap-5">
            {/* DFAITH mit POL kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">DFAITH</span>
                </div>
                <span className="text-xs text-zinc-400">mit POL kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2">
                DFAITH kaufen
              </Button>
            </div>
            
            {/* D.INVEST mit € kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaLock className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">D.INVEST</span>
                </div>
                <span className="text-xs text-zinc-400">mit € kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2">
                D.INVEST kaufen
              </Button>
            </div>
            
            {/* POL mit € kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-purple-400">POLYGON</span>
                </div>
                <span className="text-xs text-zinc-400">mit € kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-2">
                POL kaufen
              </Button>
            </div>
          </div>
          
          <Button className="mt-5 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowBuy(false)}>
            Schließen
          </Button>
        </Modal>

        {/* Übrige Modals bleiben unverändert */}
        <Modal open={showSell} onClose={() => setShowSell(false)} title="DFAITH verkaufen">
          <div className="text-zinc-300">
            <div className="mb-3 text-center text-sm text-zinc-400">
              Tausche DFAITH gegen POL mit Uniswap
            </div>
            
            {/* Uniswap Widget Container */}
            <div 
              ref={uniswapWidgetRef} 
              className="w-full min-h-[360px] rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center"
            >
              {!uniswapLoaded && (
                <div className="text-center py-6">
                  <div className="animate-spin w-8 h-8 border-t-2 border-amber-400 border-r-2 rounded-full mx-auto mb-3"></div>
                  <p className="text-zinc-400 text-sm">Widget wird geladen...</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5 mb-1">
                <FaCoins className="text-amber-400" size={12} />
                <span>Swap wird über Uniswap ausgeführt</span>
              </div>
              <p>Die genauen Beträge und Gebühren werden im Widget angezeigt.</p>
            </div>
          </div>
          <Button className="mt-5 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowSell(false)}>
            Schließen
          </Button>
        </Modal>

        <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
          <div className="text-center text-zinc-300">
            Sende-Funktion kommt hier hin.
          </div>
          <Button className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold" onClick={() => setShowSend(false)}>
            Schließen
          </Button>
        </Modal>
        
        <Modal open={showStake} onClose={() => setShowStake(false)} title="D.INVEST staken">
          <div className="flex flex-col gap-5">
            {/* Verfügbare & Gestakte Tokens */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-zinc-400">Verfügbar</span>
                </div>
                <div className="text-xl font-bold text-amber-400">
                  {dinvestBalance ? Number(dinvestBalance.displayValue).toFixed(0) : "0"}
                </div>
              </div>
              
              <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full">
                    <FaLock className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-zinc-400">Gestaked</span>
                </div>
                <div className="text-xl font-bold text-amber-400">0</div>
              </div>
            </div>
            
            {/* Staking-Option */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaLock className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">D.INVEST staken</span>
                </div>
                <button 
                  className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-amber-400"
                  onClick={() => {/* Maximalbetrag setzen */}}
                >
                  MAX
                </button>
              </div>
              
              <div className="relative mb-3">
                <input 
                  type="number"
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-amber-400 focus:border-amber-500 focus:outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  D.INVEST
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2"
                onClick={() => {/* Stake-Logik */}}
              >
                Jetzt staken
              </Button>
            </div>
            
            {/* Unstaking-Option */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-zinc-400 to-zinc-500 rounded-full">
                    <FaLock className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-zinc-400">D.INVEST unstaken</span>
                </div>
                <button 
                  className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400"
                  onClick={() => {/* Maximalbetrag setzen */}}
                >
                  MAX
                </button>
              </div>
              
              <div className="relative mb-3">
                <input 
                  type="number"
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-400 focus:border-zinc-600 focus:outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  D.INVEST
                </div>
              </div>
              
              <Button 
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold py-2"
                onClick={() => {/* Unstake-Logik */}}
              >
                Unstaken
              </Button>
            </div>
            
            {/* Rewards */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">Belohnungen</span>
                </div>
                <span className="text-xs text-zinc-400">Gesammelt: <span className="text-amber-400 font-bold">0 DFAITH</span></span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 opacity-50 cursor-not-allowed"
                disabled={true}
              >
                Belohnungen einfordern
              </Button>
            </div>
            
            {/* Smart Contract Info */}
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaLock className="text-amber-400 text-xs" />
                  <span className="text-xs text-zinc-400">Staking Smart Contract:</span>
                </div>
              </div>
              <div className="font-mono text-xs text-amber-400/70 break-all">
                0x333C4053048D542f039bd3de08f35AB998a6e68E
              </div>
            </div>
          </div>
          
          <Button className="mt-5 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowStake(false)}>
            Schließen
          </Button>
        </Modal>
      </div>
    </>
  );
}