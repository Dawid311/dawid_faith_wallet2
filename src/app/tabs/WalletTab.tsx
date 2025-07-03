import { useEffect, useState } from "react";
import { createThirdwebClient, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useSendTransaction } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { balanceOf, approve, allowance } from "thirdweb/extensions/erc20";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy, FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaHistory, FaTimes } from "react-icons/fa";

// Import Subtabs
import BuyTab from "./wallet/BuyTab";
import SellTab from "./wallet/SellTab";
import SendTab from "./wallet/SendTab";
import HistoryTab from "./wallet/HistoryTab";
import StakeTab from "./wallet/StakeTab";

// Mobile-optimierte Modal Komponente mit Touch-Support
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  
  // Touch-Events für mobile Swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.currentTarget as any).startY = touch.clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const startY = (e.currentTarget as any).startY;
    const deltaY = currentY - startY;
    
    // Nur nach unten swipen erlauben (positive deltaY)
    if (deltaY > 0) {
      const modal = e.currentTarget as HTMLElement;
      modal.style.transform = `translateY(${Math.min(deltaY, 200)}px)`;
      modal.style.opacity = `${Math.max(1 - deltaY / 300, 0.3)}`;
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const modal = e.currentTarget as HTMLElement;
    const transform = modal.style.transform;
    const translateY = transform ? parseInt(transform.match(/translateY\((\d+)px\)/)?.[1] || '0') : 0;
    
    if (translateY > 100) {
      onClose();
    } else {
      // Animation zurück zur ursprünglichen Position
      modal.style.transform = 'translateY(0)';
      modal.style.opacity = '1';
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full sm:min-w-[340px] sm:max-w-2xl sm:w-auto sm:mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl relative border-t border-zinc-700 sm:border border-zinc-700 transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Swipe Indicator - oben */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-zinc-600 rounded-full"></div>
        </div>
        
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
        <div className="p-4 sm:p-6 pb-8">
          {children}
        </div>
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

  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  const [dfaithEurValue, setDfaithEurValue] = useState<string>("0.00");
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number>(0.001);
  // Tracking für die aktuellste Anfrage als State hinzufügen
  const [latestRequest, setLatestRequest] = useState(0);

  // Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // Neue D.FAITH Token-Contract-Adresse
    decimals: 2, // Neue Dezimalstellen
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383", // Neue D.INVEST Token-Contract-Adresse
    decimals: 0, // Neue Dezimalstellen (0 statt 18)
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

  // EIN useEffect für alles:
  useEffect(() => {
    let isMounted = true;
    
    // Direkter Aufruf ohne setState-Callback, um zirkuläre Abhängigkeiten zu vermeiden
    const load = async () => {
      if (isMounted) {
        const newRequestId = latestRequest + 1;
        setLatestRequest(newRequestId);
        
        // Warten bis der State aktualisiert ist
        setTimeout(async () => {
          if (isMounted) {
            console.log("Lade Balances mit Request ID:", newRequestId);
            await fetchBalances(newRequestId);
            await fetchDfaithPrice();
          }
        }, 0);
      }
    };

    // Initial direkt laden
    if (account?.address) {
      console.log("Account geändert, lade Daten neu...");
      load();
    }

    // Intervall-Updates
    const interval = setInterval(() => {
      if (account?.address) {
        load();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account?.address]); // Nur bei Account-Änderung neu laden

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

  // Balance-Aktualisierung
  const fetchBalances = async (requestId?: number) => {
    console.log(`fetchBalances gestartet mit requestId: ${requestId}, aktuelle latestRequest: ${latestRequest}`);
    
    if (!account?.address) {
      setDfaithBalance(null);
      setDinvestBalance(null);
      setDfaithEurValue("0.00");
      return;
    }

    try {
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

      console.log(`Erhaltene Balances - D.FAITH: ${dfaithFormatted.toFixed(2)}, D.INVEST: ${Math.floor(dinvestFormatted)}`);

      // Immer aktualisieren, da wir die Request ID logik entfernt haben
      setDfaithBalance({ displayValue: dfaithFormatted.toFixed(2) });
      setDinvestBalance({ displayValue: Math.floor(dinvestFormatted).toString() });
      fetchDfaithEurValue(dfaithFormatted.toFixed(2));
    } catch (error) {
      console.error("Fehler beim Abrufen der Balances:", error);
      setDfaithBalance({ displayValue: "0.00" });
      setDinvestBalance({ displayValue: "0" });
      setDfaithEurValue("0.00");
    }
  };

  // Funktion: D.FAITH Wert in EUR live berechnen
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
      setDfaithEurValue("0.00");
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
    console.log("Rendere D.INVEST Sektion:", dinvestBalance);
    
    return (
      <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
        <div className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.INVEST</div>
        <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2">
          {Math.floor(Number(dinvestBalance?.displayValue || 0))}
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
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full mb-6">
              <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.FAITH</span>
              <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(2) : "0.00"}
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