import { useEffect, useState, useRef } from "react";
import { createThirdwebClient, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useSendTransaction } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy, FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaHistory, FaTimes, FaSync } from "react-icons/fa";
import { balanceOf } from "thirdweb/extensions/erc20";

// Import Subtabs
import BuyTab from "./wallet/BuyTab";
import SellTab from "./wallet/SellTab";
import SendTab from "./wallet/SendTab";
import HistoryTab from "./wallet/HistoryTab";
import StakeTab from "./wallet/StakeTab";

// Mobile-optimierte Modal Komponente ohne Swipe-to-close
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-8 sm:pt-12" // <-- items-start & pt-8/pt-12 für Abstand nach oben
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-zinc-900 rounded-xl w-full sm:min-w-[340px] sm:max-w-2xl sm:w-auto sm:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-zinc-700 transition-all duration-300 m-4"
      >
        {/* Header - Mobile optimiert */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-lg sm:text-xl text-amber-400 truncate pr-4">{title}</h3>
          <button 
            className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0 touch-manipulation"
            onClick={onClose}
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        {/* Content - Mobile optimiert */}
        <div className="p-4 sm:p-6 pb-8 overflow-y-auto">
          {children}
        </div>
        
        {/* Footer mit Schließen-Button wurde bereits entfernt */}
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
      options: ["email", "google", "facebook"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
];

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const { mutate: sendTransaction, data: transactionResult, isPending: isTransactionPending } = useSendTransaction();

  // Entferne useBalance und nutze wieder eigenen State:
  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);

  const [dfaithEurValue, setDfaithEurValue] = useState<string>("0.00");
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number>(0.001);
  // State für Loading und Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  // Tracking-ID für die aktuelle Abfrage
  const requestIdRef = useRef(0);

  // Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // D.FAITH Token-Contract-Adresse
    decimals: 2, 
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383", // D.INVEST Token-Contract-Adresse
    decimals: 0, 
    symbol: "D.INVEST"
  };

  const STAKING_CONTRACT = {
    address: "0xe730555afA4DeA022976DdDc0cC7DBba1C98568A", // D.INVEST Staking Contract
    name: "D.INVEST Staking"
  };

  const POL_TOKEN = {
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    decimals: 18,
    symbol: "POL"
  };

  // Neue Funktion für Balance via Thirdweb Insight API
  const fetchTokenBalanceViaInsightApi = async (
    tokenAddress: string,
    accountAddress: string
  ): Promise<string> => {
    if (!accountAddress) return "0";
    try {
      const body = {
        chain_id: "137",
        token_address: tokenAddress,
        owner_address: accountAddress,
        include_native: true,
        resolve_metadata_links: true,
        include_spam: false,
        limit: 50,
        metadata: false,
      };
      console.debug("Insight API Request Body:", JSON.stringify(body, null, 2)); // <--- Request-Body loggen
      const res = await fetch(
        `https://insight.thirdweb.com/v1/tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Insight API konnte keine JSON-Antwort parsen:", jsonErr);
        data = null;
      }
      if (!res.ok) {
        console.error("Insight API Fehlerstatus:", res.status, res.statusText);
        console.error("Insight API Fehlerantwort:", JSON.stringify(data, null, 2));
        throw new Error("API Error");
      }
      console.debug("Insight API Antwort:", JSON.stringify(data, null, 2));
      const balance = data?.data?.[0]?.balance ?? "0";
      return balance;
    } catch (e) {
      console.error("Insight API Fehler:", e);
      return "0";
    }
  };

  // Zentrale Funktion zum Laden der Balances
  const fetchTokenBalances = async () => {
    if (!account?.address) return;

    setIsLoadingBalances(true);
    setDfaithBalance(null);
    setDinvestBalance(null);
    const currentRequestId = ++requestIdRef.current;
    
    try {
      // Alle Token-Balances via Insight API laden
      const [dfaithValue, dinvestValue, polValue] = await Promise.all([
        fetchTokenBalanceViaInsightApi(DFAITH_TOKEN.address, account.address),
        fetchTokenBalanceViaInsightApi(DINVEST_TOKEN.address, account.address),
        fetchTokenBalanceViaInsightApi(POL_TOKEN.address, account.address)
      ]);
      
      if (currentRequestId !== requestIdRef.current) return;
      
      setDfaithBalance({ displayValue: Number(dfaithValue).toFixed(2) });
      setDinvestBalance({ displayValue: Math.floor(Number(dinvestValue)).toString() });
      // Optional: State für POL-Balance hinzufügen, falls du sie anzeigen möchtest
      // setPolBalance({ displayValue: ... });
      fetchDfaithEurValue(dfaithValue);
    } catch (error) {
      // Fehlerbehandlung
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingBalances(false);
      }
    }
  };

  // Funktion für manuelle Aktualisierung der Balance mit Animation
  const refreshBalances = async () => {
    if (!account?.address || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await fetchTokenBalances();
      await fetchDfaithPrice();
    } finally {
      // Nach einer kurzen Verzögerung den Refresh-Status zurücksetzen (Animation)
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // UseEffect für initiales Laden und periodische Aktualisierung (alle 15 Sekunden)
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      if (!account?.address || !isMounted) return;
      
      console.log("🔄 Starte automatische Balance-Aktualisierung...");
      await fetchTokenBalances();
      await fetchDfaithPrice();
    };
    
    // Initiales Laden
    loadData();
    
    // Regelmäßige Aktualisierung alle 15 Sekunden (weniger aggressiv)
    intervalId = setInterval(() => {
      if (isMounted && account?.address) {
        console.log("⏰ 15-Sekunden-Intervall: Lade Balances neu...");
        loadData();
      }
    }, 15000); // 15 Sekunden statt 10
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        console.log("🛑 Balance-Aktualisierung gestoppt");
      }
    };
  }, [account?.address]);

  // D.FAITH EUR-Preis holen (basierend auf POL-Preis)
  const fetchDfaithPrice = async () => {
    try {
      // POL-Preis in EUR holen (ungefähr 0.50€)
      const polPriceEur = 0.50;
      
      // D.FAITH pro POL von Paraswap holen
      const response = await fetch(
        `https://apiv5.paraswap.io/prices?srcToken=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&destToken=0xF051E3B0335eB332a7ef0dc308BB4F0c10301060&amount=1000000000000000000&srcDecimals=18&destDecimals=2&network=137`
      );
      
      if (response.ok) {
        const data = await response.json();
        const dfaithPerPol = Number(data.priceRoute.destAmount) / Math.pow(10, 2);
        const dfaithPriceEur = polPriceEur / dfaithPerPol;
        setDfaithPriceEur(dfaithPriceEur);
      } else {
        // Fallback: 0.50€ / 500 = 0.001€ pro D.FAITH
        setDfaithPriceEur(0.001);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des D.FAITH EUR-Preises:", error);
      setDfaithPriceEur(0.001);
    }
  };

  const copyWalletAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // D.FAITH Wert in EUR live berechnen
  const fetchDfaithEurValue = async (balance: string) => {
    try {
      // 1. OpenOcean Quote: Wie viel POL bekomme ich für 1 D.FAITH?
      const params = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // D.FAITH
        outTokenAddress: "0x0000000000000000000000000000000000001010", // POL (MATIC)
        amount: "1",
        gasPrice: "50",
      });
      const quoteRes = await fetch(`https://open-api.openocean.finance/v3/polygon/quote?${params}`);
      const quoteData = await quoteRes.json();
      const dfaithToPol = Number(quoteData.data.outAmount) / Math.pow(10, 18); // POL hat 18 Dezimalstellen

      // 2. POL/EUR Preis holen (z.B. von CoinGecko)
      const polRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
      const polData = await polRes.json();
      const polEur = polData["polygon-ecosystem-token"].eur;

      // 3. D.FAITH Gesamtwert in EUR berechnen
      const totalEur = Number(balance) * dfaithToPol * polEur;
      setDfaithEurValue(totalEur.toFixed(2));
    } catch (e) {
      console.error("Fehler bei der EUR-Wertberechnung:", e);
      // Fallback: ungefähre Berechnung mit statischem Preis
      const totalEur = Number(balance) * dfaithPriceEur;
      setDfaithEurValue(totalEur.toFixed(2));
    }
  };

  // Entferne fetchTokenBalanceViaContract komplett (nicht mehr benötigt)

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
                    subtitle: "Wähle deine bevorzugte Anmeldemethode"
                  },
                }}
                wallets={wallets}
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

  // D.INVEST und Staking-Bereich Funktion definieren
  const renderDinvestSection = () => {
    return (
      <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
        <div className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.INVEST</div>
        <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2">
          {dinvestBalance?.displayValue}
        </div>
        <button 
          onClick={() => setShowStakeModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 hover:from-amber-500/30 hover:to-amber-600/30 transition-all border border-amber-500/20 mt-2"
        >
          <FaLock size={14} />
          <span className="text-sm font-medium">Staken & Verdienen</span>
        </button>
        {/* Gestaked Anzeige */}
        <div className="text-xs text-zinc-500 mt-2">
          Gestaked: <span className="text-amber-400/80">0</span>
        </div>
      </div>
    );
  };

  return (
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
                  // Verwende einen alternativen, stabileren RPC-Endpunkt
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>

            {/* Wallet Address mit besserem Styling und Refresh Button */}
            <div className="flex justify-between items-center bg-zinc-800/70 backdrop-blur-sm rounded-xl p-3 mb-6 border border-zinc-700/80">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 mb-0.5">Wallet Adresse</span>
                <span className="font-mono text-zinc-300 text-sm">{formatAddress(account.address)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshBalances}
                  disabled={isRefreshing || isLoadingBalances}
                  className={`p-2 rounded-lg ${isRefreshing || isLoadingBalances ? 'bg-amber-600/20' : 'bg-zinc-700 hover:bg-zinc-600'} text-zinc-200 text-sm font-medium transition-all duration-200`}
                  title="Aktualisieren"
                >
                  <FaSync className={`text-amber-400 ${isRefreshing || isLoadingBalances ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={copyWalletAddress}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-all duration-200"
                  title="Adresse kopieren"
                >
                  <FaRegCopy /> Kopieren
                </button>
              </div>
            </div>

            {/* DFAITH Token-Karte - jetzt mit D.FAITH */}
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full mb-6">
              <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.FAITH</span>
              <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                {isLoadingBalances ? "..." : (dfaithBalance ? dfaithBalance.displayValue : "0.00")}
              </div>
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent my-3"></div>
              
              <div className="text-xs text-zinc-500">
                ≈ {dfaithEurValue} EUR
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowBuyModal(true)}
              >
                <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowDown className="text-black text-xs" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Kaufen</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSellModal(true)}
              >
                <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowUp className="text-black text-xs" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Verkauf</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSendModal(true)}
              >
                <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaPaperPlane className="text-black text-xs" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Senden</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowHistoryModal(true)}
              >
                <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaHistory className="text-black text-xs" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Historie</span>
              </Button>
            </div>
            
            {/* D.INVEST immer anzeigen */}
            {renderDinvestSection()}

            {/* Modale für die verschiedenen Funktionen */}
            <Modal open={showBuyModal} onClose={() => setShowBuyModal(false)} title="Kaufen">
              <BuyTab />
            </Modal>

            <Modal open={showSellModal} onClose={() => setShowSellModal(false)} title="Verkaufen">
              <SellTab />
            </Modal>

            <Modal open={showSendModal} onClose={() => setShowSendModal(false)} title="Senden">
              <SendTab />
            </Modal>

            <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Historie">
              <HistoryTab />
            </Modal>

            <Modal open={showStakeModal} onClose={() => setShowStakeModal(false)} title="Staking">
              <StakeTab />
            </Modal>
          </CardContent>
        </Card>
      </div>
    );
  }