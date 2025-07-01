import { useEffect, useState, useRef } from "react";
import { createThirdwebClient, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc20";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaExchangeAlt } from "react-icons/fa";
import Script from "next/script";
import axios from "axios";

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

  // Neue States für den Swap
  const [swapAmount, setSwapAmount] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("paraswap"); // "paraswap" oder "openocean"
  const [exchangeRate, setExchangeRate] = useState("0");
  const [slippage, setSlippage] = useState("1"); // Default 1%
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0xB83D1B711BdB57B47e10BC9D5B874B4Fd99C23d6", // D.FAITH Token-Contract
    decimals: 18,
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0xa3f0Bf2a9d7f1a0958989Ea4c4DBE8B595117643", // D.INVEST Token-Contract
    decimals: 18,
    symbol: "D.INVEST"
  };

  const STAKING_CONTRACT = {
    address: "0x333C4053048D542f039bd3de08f35AB998a6e68E", // D.INVEST Staking Contract
    name: "D.INVEST Staking"
  };

  const POL_TOKEN = {
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    decimals: 18,
    symbol: "POL"
  };

  useEffect(() => {
    async function fetchBalances() {
      if (!account?.address) {
        setDfaithBalance(null);
        setDinvestBalance(null);
        return;
      }
      
      try {
        console.log("Wallet-Adresse:", account.address);
        console.log("Lade Balances...");
        
        // D.FAITH Balance abrufen
        const dfaithContract = getContract({
          client,
          chain: polygon,
          address: DFAITH_TOKEN.address
        });
        
        const dfaithBalanceResult = await balanceOf({
          contract: dfaithContract,
          address: account.address
        });
        
        // D.INVEST Balance abrufen
        const dinvestContract = getContract({
          client,
          chain: polygon,
          address: DINVEST_TOKEN.address
        });
        
        const dinvestBalanceResult = await balanceOf({
          contract: dinvestContract,
          address: account.address
        });
        
        // Balances formatieren und setzen
        const dfaithFormatted = Number(dfaithBalanceResult) / Math.pow(10, DFAITH_TOKEN.decimals);
        const dinvestFormatted = Number(dinvestBalanceResult) / Math.pow(10, DINVEST_TOKEN.decimals);
        
        setDfaithBalance({ displayValue: dfaithFormatted.toFixed(4) });
        setDinvestBalance({ displayValue: dinvestFormatted.toString() }); // Als String ohne toFixed für bessere Anzeige
        
        console.log("=== BALANCE DEBUG ===");
        console.log("D.FAITH Raw Balance:", dfaithBalanceResult.toString());
        console.log("D.FAITH Formatted:", dfaithFormatted);
        console.log("D.INVEST Raw Balance:", dinvestBalanceResult.toString());
        console.log("D.INVEST Formatted:", dinvestFormatted);
        console.log("D.INVEST Final displayValue:", dinvestFormatted.toString());
        console.log("D.INVEST > 0?", dinvestFormatted > 0);
        console.log("=====================");
        
      } catch (error) {
        console.error("Fehler beim Abrufen der Balances:", error);
        // Bei Fehler 0 setzen
        setDfaithBalance({ displayValue: "0.0000" });
        setDinvestBalance({ displayValue: "0" });
      }
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
          defaultInputTokenAddress: "0xB83D1B711BdB57B47e10BC9D5B874B4Fd99C23d6", // D.FAITH Token-Contract-Adresse
          defaultInputAmount: 1,
          defaultOutputTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC auf Polygon
          jsonRpcEndpoint: "https://polygon-rpc.com", // Expliziten RPC Endpoint angeben
          tokenList: [
            {
              "name": "D.FAITH Token",
              "address": "0xB83D1B711BdB57B47e10BC9D5B874B4Fd99C23d6", // D.FAITH Token-Contract
              "symbol": "D.FAITH",
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

  // Funktion zum Abrufen des besten Preisangebots
  const fetchBestQuote = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setEstimatedOutput("0");
      setExchangeRate("0");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Parallele Anfragen an beide APIs
      const [paraswapPromise, openoceanPromise] = [
        axios.get(`https://apiv5.paraswap.io/prices`, {
          params: {
            srcToken: DFAITH_TOKEN.address,
            destToken: POL_TOKEN.address,
            amount: (parseFloat(swapAmount) * Math.pow(10, DFAITH_TOKEN.decimals)).toString(),
            srcDecimals: DFAITH_TOKEN.decimals,
            destDecimals: POL_TOKEN.decimals,
            side: "SELL",
            network: 137, // Polygon
          }
        }).catch(error => null), // Fehlerbehandlung für ParaSwap
        
        axios.get(`https://open-api.openocean.finance/v3/137/quote`, {
          params: {
            chain: "polygon",
            inTokenAddress: DFAITH_TOKEN.address,
            outTokenAddress: POL_TOKEN.address,
            amount: swapAmount,
            gasPrice: "30",
            slippage: slippage
          }
        }).catch(error => null) // Fehlerbehandlung für OpenOcean
      ];
      
      // Warte auf beide Antworten
      const [paraswapResponse, openoceanResponse] = await Promise.all([paraswapPromise, openoceanPromise]);
      
      // Berechne die Ergebnisse beider Anbieter
      let paraswapAmount = 0;
      let openoceanAmount = 0;
      
      if (paraswapResponse?.data) {
        paraswapAmount = parseFloat(paraswapResponse.data.priceRoute.destAmount) / Math.pow(10, POL_TOKEN.decimals);
      }
      
      if (openoceanResponse?.data?.data) {
        openoceanAmount = parseFloat(openoceanResponse.data.data.outAmount);
      }
      
      // Wähle den besseren Kurs
      if (paraswapAmount > openoceanAmount) {
        setSelectedProvider("paraswap");
        setEstimatedOutput(paraswapAmount.toFixed(6));
        const rate = paraswapAmount / parseFloat(swapAmount);
        setExchangeRate(rate.toFixed(6));
      } else {
        setSelectedProvider("openocean");
        setEstimatedOutput(openoceanAmount.toFixed(6));
        const rate = openoceanAmount / parseFloat(swapAmount);
        setExchangeRate(rate.toFixed(6));
      }
      
    } catch (error) {
      console.error("Fehler beim Abrufen des besten Angebots:", error);
      setEstimatedOutput("0");
      setExchangeRate("0");
    } finally {
      setIsLoading(false);
    }
  };

  // Anfrage nach dem besten Quote, wenn sich der Betrag ändert
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBestQuote();
    }, 500); // Debounce von 500ms
    
    return () => clearTimeout(timer);
  }, [swapAmount, slippage]); // Entfernt selectedProvider aus den Dependencies

  // Swap-Funktion
  const executeSwap = async () => {
    if (!account?.address || !swapAmount || parseFloat(swapAmount) <= 0) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Hier würde die Transaktion vorbereitet und gesendet werden
      // Diese Funktion benötigt die vollständige Web3-Integration
      
      alert("In einer echten Implementierung würde jetzt der Swap durchgeführt werden.");
      
      // Nach erfolgreichem Swap zurücksetzen
      setSwapAmount("");
      setEstimatedOutput("0");
      setExchangeRate("0");
      
    } catch (error) {
      console.error("Fehler beim Ausführen des Swaps:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* DFAITH Token-Karte - jetzt mit D.FAITH */}
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full mb-6 relative">
              <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.FAITH</span>
              <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
              </div>
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent my-3"></div>
              
              <div className="text-xs text-zinc-500">
                ≈ 0.00 EUR
              </div>
              
              {/* D.INVEST Balance klein anzeigen links unten */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-zinc-800/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-zinc-700/50">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400/60 to-yellow-500/60 flex items-center justify-center">
                  <FaLock className="text-black text-[8px]" />
                </div>
                <span className="text-[10px] text-zinc-400">D.INVEST:</span>
                <span className="text-[10px] text-amber-400/80 font-medium">
                  {dinvestBalance ? (Number(dinvestBalance.displayValue) || 0).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>

            {/* Action Buttons mit besseren Gradienten */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
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
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowStake(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaLock className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Staking</span>
              </Button>
            </div>
            
            {/* D.INVEST immer anzeigen wenn Balance vorhanden (auch sehr kleine Beträge) */}
            {dinvestBalance && Number(dinvestBalance.displayValue) >= 0 && (
              <div className="flex flex-col p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="uppercase text-xs tracking-widest text-amber-500/80">D.INVEST</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                    {(Number(dinvestBalance.displayValue) || 0).toFixed(2)}
                  </div>
                  
                  <button 
                    onClick={() => setShowStake(true)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 hover:from-amber-500/30 hover:to-amber-600/30 transition-all border border-amber-500/20"
                  >
                    <FaLock size={12} />
                    <span className="text-sm font-medium">Staken & Verdienen</span>
                  </button>
                </div>
                
                {/* Gestaked Anzeige */}
                <div className="text-xs text-zinc-500 mt-2">
                  Gestaked: <span className="text-amber-400/80">0</span>
                </div>
              </div>
            )}
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

        {/* Modifiziertes Verkaufs-Modal */}
        <Modal open={showSell} onClose={() => setShowSell(false)} title="D.FAITH verkaufen">
          <div className="flex flex-col gap-4">
            {/* Provider Auswahl */}
            <div className="flex items-center justify-between bg-zinc-800/70 rounded-lg p-3 border border-zinc-700">
              <span className="text-sm text-zinc-300">Swap-Provider:</span>
              <div className="flex items-center gap-2">
                <button 
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    selectedProvider === "paraswap" 
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                      : "bg-zinc-700 text-zinc-400 border border-zinc-600"
                  }`}
                  onClick={() => setSelectedProvider("paraswap")}
                >
                  ParaSwap
                </button>
                <button 
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    selectedProvider === "openocean" 
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                      : "bg-zinc-700 text-zinc-400 border border-zinc-600"
                  }`}
                  onClick={() => setSelectedProvider("openocean")}
                >
                  OpenOcean
                </button>
              </div>
            </div>
            
            {/* Eingabefeld für DFAITH */}
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Von</span>
                <span className="text-xs text-zinc-500">
                  Verfügbar: <span className="text-amber-400">
                    {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
                  </span>
                </span>
              </div>
              
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center gap-2 bg-zinc-800 px-2.5 py-1.5 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-black">DF</span>
                  </div>
                  <span className="text-sm text-amber-400">D.FAITH</span>
                </div>
                <input 
                  type="number"
                  className="flex-1 bg-transparent border-none text-right text-base text-amber-400 font-medium focus:outline-none"
                  placeholder="0.0"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                />
              </div>
              
              <div className="flex justify-between mt-2">
                <span></span>
                <button 
                  className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setSwapAmount(dfaithBalance?.displayValue || "0")}
                >
                  MAX
                </button>
              </div>
            </div>
            
            {/* Austausch-Icon */}
            <div className="flex justify-center -my-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg">
                <FaArrowDown className="text-amber-400 text-sm" />
              </div>
            </div>
            
            {/* Ausgabefeld für MATIC */}
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Zu</span>
                <span className="text-xs text-zinc-500">
                  Geschätzter Erhalt
                </span>
              </div>
              
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center gap-2 bg-zinc-800 px-2.5 py-1.5 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">M</span>
                  </div>
                  <span className="text-sm text-purple-400">MATIC</span>
                </div>
                <div className="flex-1 text-right">
                  {isLoading ? (
                    <div className="flex justify-end items-center">
                      <div className="w-5 h-5 border-t-2 border-r-2 border-amber-400 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <span className="text-base text-purple-400 font-medium">
                      {estimatedOutput}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-500">
                  Kurs: 1 D.FAITH = {exchangeRate} POL
                </span>
                <span className="text-xs text-zinc-500">
                  Slippage: 
                  <select 
                    className="ml-1 bg-zinc-800 border border-zinc-700 rounded text-amber-400 px-1"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                  >
                    <option value="0.5">0.5%</option>
                    <option value="1">1%</option>
                    <option value="2">2%</option>
                    <option value="3">3%</option>
                  </select>
                </span>
              </div>
            </div>
            
            {/* Ausführungs-Button */}
            <Button
              className={`w-full py-3 font-bold rounded-xl ${
                parseFloat(swapAmount) > 0 && !isLoading
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              }`}
              onClick={executeSwap}
              disabled={parseFloat(swapAmount) <= 0 || isLoading}
            >
              {isLoading ? (
                <div className="flex justify-center items-center gap-2">
                  <div className="w-5 h-5 border-t-2 border-r-2 border-black rounded-full animate-spin"></div>
                  <span>Wird geladen...</span>
                </div>
              ) : parseFloat(swapAmount) <= 0 ? (
                "Betrag eingeben"
              ) : (
                "Jetzt tauschen"
              )}
            </Button>
            
            {/* Provider Info */}
            <div className="text-xs text-zinc-500 flex items-center gap-1.5 justify-center mt-2">
              <FaExchangeAlt size={10} className="text-amber-400" />
              <span>
                Powered by {selectedProvider === "paraswap" ? "ParaSwap" : "OpenOcean"} | Beste Kurse automatisch
              </span>
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
          <div className="flex flex-col gap-4">
            {/* Verfügbare & Gestakte Tokens */}
            <div className="grid grid-cols-2 gap-4 mb-1">
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <span className="text-xs text-zinc-500 mb-1">Verfügbar</span>
                <div className="text-lg font-bold text-amber-400">
                  {dinvestBalance ? (Number(dinvestBalance.displayValue) || 0).toFixed(2) : "0.00"}
                </div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <span className="text-xs text-zinc-500 mb-1">Gestaked</span>
                <div className="text-lg font-bold text-amber-400">0</div>
              </div>
            </div>
            
            {/* Stake und Unstake nebeneinander */}
            <div className="grid grid-cols-2 gap-4">
              {/* Staking-Option */}
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-amber-400">Staken</span>
                  <button 
                    className="text-[10px] px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-amber-400"
                    onClick={() => {/* Maximalbetrag setzen */}}
                  >
                    MAX
                  </button>
                </div>
                <div className="relative mb-2">
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 px-2 text-amber-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium text-xs py-1.5"
                  onClick={() => {/* Stake-Logik */}}
                >
                  Staken
                </Button>
              </div>
              
              {/* Unstaking-Option */}
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400">Unstaken</span>
                  <button 
                    className="text-[10px] px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400"
                    onClick={() => {/* Maximalbetrag setzen */}}
                  >
                    MAX
                  </button>
                </div>
                <div className="relative mb-2">
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 px-2 text-zinc-400 focus:border-zinc-600 focus:outline-none text-sm"
                  />
                </div>
                <Button 
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium text-xs py-1.5"
                  onClick={() => {/* Unstake-Logik */}}
                >
                  Unstaken
                </Button>
              </div>
            </div>
            
            {/* Rewards - bleibt unverändert */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">Belohnungen</span>
                </div>
                <span className="text-xs text-zinc-400">
                  Gesammelt: <span className="text-amber-400 font-bold">0 D.FAITH</span>
                </span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 opacity-50 cursor-not-allowed"
                disabled={true}
              >
                Belohnungen einfordern
              </Button>
            </div>
            
            {/* Smart Contract Info - etwas kompakter */}
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-xs">
              <div className="flex items-center gap-1.5">
                <FaLock className="text-amber-400 text-[10px]" />
                <span className="text-zinc-400">Smart Contract:</span>
                <span className="font-mono text-amber-400/70 break-all">{STAKING_CONTRACT.address}</span>
              </div>
            </div>
          </div>
          
          {/* Schließen-Button hinzugefügt */}
          <Button className="mt-4 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowStake(false)}>
            Schließen
          </Button>
        </Modal>
      </div>
    </>
  );
}