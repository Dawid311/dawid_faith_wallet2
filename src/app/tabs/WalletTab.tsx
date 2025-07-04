import { useEffect, useState, useRef } from "react";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-8 sm:pt-12"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-zinc-900 rounded-xl w-full sm:min-w-[340px] sm:max-w-4xl sm:w-auto sm:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-zinc-700 transition-all duration-300 m-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-lg sm:text-xl text-amber-400 truncate pr-4">{title}</h3>
          <button 
            className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0 touch-manipulation"
            onClick={onClose}
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        {/* Content - Kein zusätzliches Padding für StakeTab */}
        <div className={`${title === "Staking" ? "" : "p-4 sm:p-6 pb-8"} overflow-y-auto`}>
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

  // Entferne useBalance und nutze wieder eigenen State:
  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  const [stakedBalance, setStakedBalance] = useState<string>("0");

  const [dfaithEurValue, setDfaithEurValue] = useState<string>("0.00");
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number>(0.001);
  const [polPriceEur, setPolPriceEur] = useState<number>(0.50);
  const [lastKnownPrices, setLastKnownPrices] = useState<{
    dfaith?: number;
    dfaithEur?: number;
    polEur?: number;
    timestamp?: number;
  }>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  // State für Loading und Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  // Tracking-ID für die aktuelle Abfrage
  const requestIdRef = useRef(0);
  
  // State für Kopieren-Feedback
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0xD05903dF2E1465e2bDEbB8979104204D1c48698d", // D.FAITH Token-Contract-Adresse
    decimals: 2, 
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383", // D.INVEST Token-Contract-Adresse
    decimals: 0, 
    symbol: "D.INVEST"
  };

  const STAKING_CONTRACT = {
    address: "0x89E0ED96e21E73e1F47260cdF72e7E7cb878A2B2", // Aktualisierte D.INVEST Staking Contract-Adresse
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
      const params = new URLSearchParams({
        chain_id: "137",
        token_address: tokenAddress,
        owner_address: accountAddress,
        include_native: "true",
        resolve_metadata_links: "true",
        include_spam: "false",
        limit: "50",
        metadata: "false",
      });
      console.debug("Insight API Request Params:", params.toString());
      const url = `https://insight.thirdweb.com/v1/tokens?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-client-id": process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
        },
      });
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
    // Behalte die alten Werte während des Ladens bei, setze sie nicht auf null
    const currentRequestId = ++requestIdRef.current;
    
    try {
      // Alle Token-Balances via Insight API laden
      const [dfaithValue, dinvestValue, polValue] = await Promise.all([
        fetchTokenBalanceViaInsightApi(DFAITH_TOKEN.address, account.address),
        fetchTokenBalanceViaInsightApi(DINVEST_TOKEN.address, account.address),
        fetchTokenBalanceViaInsightApi(POL_TOKEN.address, account.address)
      ]);
      
      if (currentRequestId !== requestIdRef.current) return;

      // D.FAITH: Balance korrekt formatieren (Dezimalstellen beachten)
      const dfaithRaw = Number(dfaithValue);
      const dfaithDisplay = (dfaithRaw / Math.pow(10, DFAITH_TOKEN.decimals)).toFixed(DFAITH_TOKEN.decimals);

      setDfaithBalance({ displayValue: dfaithDisplay });

      // D.INVEST: Keine Dezimalstellen
      setDinvestBalance({ displayValue: Math.floor(Number(dinvestValue)).toString() });
      
      // Gestakte Balance aus Staking Contract abrufen
      await fetchStakedBalance();
      
      fetchDfaithEurValue(dfaithDisplay);

      // Debug-Ausgabe für D.INVEST API-Antwort
      console.debug("DINVEST Insight API Wert (raw):", dinvestValue);
    } catch (error) {
      console.error("Fehler beim Laden der Balances:", error);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingBalances(false);
      }
    }
  };

  // Funktion zum Abrufen der gestakten Balance
  const fetchStakedBalance = async () => {
    if (!account?.address) {
      setStakedBalance("0");
      return;
    }

    try {
      const stakingContract = getContract({ 
        client, 
        chain: polygon, 
        address: STAKING_CONTRACT.address 
      });

      const stakeInfo = await readContract({
        contract: stakingContract,
        method: "function stakers(address) view returns (uint256, uint256)",
        params: [account.address]
      });
      // stakeInfo[0] ist die gestakte Menge
      setStakedBalance(stakeInfo[0].toString());
    } catch (error) {
      console.error("Fehler beim Abrufen der gestakten Balance:", error);
      setStakedBalance("0");
    }
  };

  // Funktion für manuelle Aktualisierung der Balance mit Animation
  const refreshBalances = async () => {
    if (!account?.address || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await fetchTokenBalances();
      await fetchDfaithPrice();
      await fetchStakedBalance(); // Gestakte Balance auch beim manuellen Refresh aktualisieren
    } finally {
      // Nach einer kurzen Verzögerung den Refresh-Status zurücksetzen (Animation)
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // UseEffect für initiales Laden und periodische Aktualisierung (alle 30 Sekunden)
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
    
    // Regelmäßige Aktualisierung alle 30 Sekunden
    intervalId = setInterval(() => {
      if (isMounted && account?.address) {
        console.log("⏰ 30-Sekunden-Intervall: Lade Balances neu...");
        loadData();
      }
    }, 30000); // 30 Sekunden
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        console.log("🛑 Balance-Aktualisierung gestoppt");
      }
    };
  }, [account?.address]);

  // D.FAITH EUR-Preis holen mit mehreren Anbietern und Fallback System
  const fetchDfaithPrice = async () => {
    // Rate Limiting für alle APIs (max. 1 Request alle 30 Sekunden pro Anbieter)
    const now = Date.now();
    const cooldownPeriod = 30 * 1000; // 30 Sekunden
    
    const getLastRequest = (provider: string) => {
      const lastRequest = localStorage.getItem(`last_${provider}_request`);
      return lastRequest ? parseInt(lastRequest) : 0;
    };
    
    const shouldSkipProvider = (provider: string) => {
      return (now - getLastRequest(provider)) < cooldownPeriod;
    };

    try {
      // Lade gespeicherte Preise beim Start
      const loadStoredPrices = () => {
        try {
          const stored = localStorage.getItem('dawid_faith_prices');
          if (stored) {
            const parsed = JSON.parse(stored);
            const now = Date.now();
            // Verwende gespeicherte Preise wenn sie weniger als 6 Stunden alt sind
            if (parsed.timestamp && (now - parsed.timestamp) < 6 * 60 * 60 * 1000) {
              setLastKnownPrices(parsed);
              if (parsed.dfaithEur) setDfaithPriceEur(parsed.dfaithEur);
              if (parsed.polEur) setPolPriceEur(parsed.polEur);
              return true;
            }
          }
        } catch (e) {
          console.log('Fehler beim Laden gespeicherter Preise:', e);
        }
        return false;
      };

      // Verwende gespeicherte Preise falls verfügbar
      const hasStoredPrices = loadStoredPrices();

      let polEur: number | null = null;
      let dfaithPriceEur: number | null = null;
      let errorMsg = "";

      // Mehrere Anbieter für POL/EUR Preis versuchen
      const polProviders = [
        {
          name: 'coingecko',
          fetch: async () => {
            if (shouldSkipProvider('coingecko')) {
              console.log('CoinGecko Request übersprungen (Rate Limiting)');
              return null;
            }
            localStorage.setItem('last_coingecko_request', now.toString());
            
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
            if (!response.ok) {
              if (response.status === 429) {
                console.log('CoinGecko Rate Limit erreicht (429)');
              }
              throw new Error(`CoinGecko: ${response.status}`);
            }
            const data = await response.json();
            return data['polygon-ecosystem-token']?.eur;
          }
        },
        {
          name: 'cryptocompare',
          fetch: async () => {
            if (shouldSkipProvider('cryptocompare')) {
              console.log('CryptoCompare Request übersprungen (Rate Limiting)');
              return null;
            }
            localStorage.setItem('last_cryptocompare_request', now.toString());
            
            const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=POL&tsyms=EUR');
            if (!response.ok) {
              if (response.status === 429) {
                console.log('CryptoCompare Rate Limit erreicht (429)');
              }
              throw new Error(`CryptoCompare: ${response.status}`);
            }
            const data = await response.json();
            return data.EUR;
          }
        },
        {
          name: 'binance',
          fetch: async () => {
            if (shouldSkipProvider('binance')) {
              console.log('Binance Request übersprungen (Rate Limiting)');
              return null;
            }
            localStorage.setItem('last_binance_request', now.toString());
            
            // Binance API für POL/USDT Preis, dann USDT/EUR
            const [polUsdtResponse, usdtEurResponse] = await Promise.all([
              fetch('https://api.binance.com/api/v3/ticker/price?symbol=POLUSDT'),
              fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT')
            ]);
            
            if (!polUsdtResponse.ok || !usdtEurResponse.ok) {
              throw new Error('Binance API Fehler');
            }
            
            const polUsdtData = await polUsdtResponse.json();
            const usdtEurData = await usdtEurResponse.json();
            
            const polUsdt = parseFloat(polUsdtData.price);
            const eurUsdt = parseFloat(usdtEurData.price);
            
            if (polUsdt && eurUsdt) {
              return polUsdt / eurUsdt; // POL in EUR
            }
            return null;
          }
        }
      ];

      // Versuche die Anbieter nacheinander bis einer funktioniert
      for (const provider of polProviders) {
        try {
          const price = await provider.fetch();
          if (price && price > 0) {
            polEur = Math.round(price * 100) / 100;
            console.log(`POL Preis erfolgreich von ${provider.name} geholt: €${polEur}`);
            break;
          }
        } catch (e) {
          console.log(`${provider.name} Fehler:`, e);
          continue;
        }
      }

      // Fallback auf letzten bekannten POL Preis
      if (!polEur && lastKnownPrices.polEur) {
        polEur = lastKnownPrices.polEur;
        console.log('Verwende gespeicherten POL Preis:', polEur);
      } else if (!polEur) {
        polEur = 0.50; // Hard fallback
        console.log('Verwende Hard-Fallback POL Preis:', polEur);
      }

      try {
        // 2. Hole D.FAITH Preis von OpenOcean
        const params = new URLSearchParams({
          chain: "polygon",
          inTokenAddress: "0x0000000000000000000000000000000000001010", // Polygon Native Token (MATIC)
          outTokenAddress: DFAITH_TOKEN.address,
          amount: "1", // 1 POL
          gasPrice: "50",
        });
        
        const response = await fetch(`https://open-api.openocean.finance/v3/polygon/quote?${params}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.outAmount && data.data.outAmount !== "0") {
            // outAmount ist in D.FAITH (mit 2 Decimals)
            const dfaithPerPol = Number(data.data.outAmount) / Math.pow(10, DFAITH_TOKEN.decimals);
            // Berechne EUR Preis: 1 D.FAITH = POL_EUR / DFAITH_PER_POL
            dfaithPriceEur = polEur / dfaithPerPol;
            console.log('D.FAITH Preis erfolgreich von OpenOcean berechnet:', dfaithPriceEur);
          } else {
            errorMsg = "OpenOcean: Keine Liquidität verfügbar";
          }
        } else {
          errorMsg = `OpenOcean: ${response.status}`;
        }
      } catch (e) {
        console.log("OpenOcean Fehler:", e);
        errorMsg = "OpenOcean API Fehler";
      }

      // Fallback auf letzte bekannte D.FAITH Preise
      if (!dfaithPriceEur && lastKnownPrices.dfaithEur) {
        dfaithPriceEur = lastKnownPrices.dfaithEur;
        errorMsg = "";
        console.log('Verwende gespeicherten D.FAITH Preis:', dfaithPriceEur);
      }

      // Setze Preise (entweder neue oder Fallback)
      if (polEur) setPolPriceEur(polEur);
      if (dfaithPriceEur) setDfaithPriceEur(dfaithPriceEur);

      // Speichere erfolgreiche Preise
      if (dfaithPriceEur && polEur) {
        const newPrices = {
          dfaithEur: dfaithPriceEur,
          polEur: polEur,
          timestamp: Date.now()
        };
        setLastKnownPrices(prev => ({ ...prev, ...newPrices }));
        try {
          localStorage.setItem('dawid_faith_prices', JSON.stringify(newPrices));
          console.log('Preise erfolgreich gespeichert');
        } catch (e) {
          console.log('Fehler beim Speichern der Preise:', e);
        }
        setPriceError(null);
      } else {
        setPriceError(errorMsg || "Preise nicht verfügbar");
      }

    } catch (error) {
      console.error("Fehler beim Abrufen des D.FAITH EUR-Preises:", error);
      // Verwende letzte bekannte Preise als Fallback
      if (lastKnownPrices.dfaithEur) {
        setDfaithPriceEur(lastKnownPrices.dfaithEur);
      } else {
        setDfaithPriceEur(0.001);
      }
      if (lastKnownPrices.polEur) {
        setPolPriceEur(lastKnownPrices.polEur);
      } else {
        setPolPriceEur(0.50);
      }
    }
  };

  const copyWalletAddress = async () => {
    if (account?.address) {
      try {
        await navigator.clipboard.writeText(account.address);
        setCopySuccess(true);
        setShowCopyModal(true);
        
        // Modal nach 2 Sekunden automatisch schließen
        setTimeout(() => {
          setShowCopyModal(false);
          setCopySuccess(false);
        }, 2000);
      } catch (error) {
        console.error("Fehler beim Kopieren:", error);
        setCopySuccess(false);
        setShowCopyModal(true);
        
        setTimeout(() => {
          setShowCopyModal(false);
        }, 2000);
      }
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // D.FAITH Wert in EUR berechnen basierend auf aktuellen Preisen
  const fetchDfaithEurValue = async (balance: string) => {
    try {
      const balanceFloat = parseFloat(balance);
      if (balanceFloat <= 0 || dfaithPriceEur <= 0) {
        setDfaithEurValue("0.00");
        return;
      }

      // Verwende den aktuellen D.FAITH EUR Preis nur wenn vorhanden
      const eurValue = balanceFloat * dfaithPriceEur;
      setDfaithEurValue(eurValue.toFixed(2));
      
    } catch (error) {
      console.error("Fehler beim Berechnen des D.FAITH EUR-Wertes:", error);
      setDfaithEurValue("0.00");
    }
  };

  // EUR-Wert neu berechnen wenn sich Preis oder Balance ändert
  useEffect(() => {
    if (dfaithBalance?.displayValue) {
      fetchDfaithEurValue(dfaithBalance.displayValue);
    }
  }, [dfaithPriceEur, dfaithBalance?.displayValue]);

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
        <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2 flex items-center">
          {dinvestBalance?.displayValue || "0"}
          {(isLoadingBalances || isRefreshing) && (
            <span className="ml-2 text-xs text-amber-500/60 animate-pulse">↻</span>
          )}
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
          Gestaked: <span className="text-amber-400/80">{stakedBalance}</span>
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
                <button
                  onClick={copyWalletAddress}
                  className="font-mono text-amber-400 text-sm hover:text-amber-300 transition-colors text-left group flex items-center gap-2"
                  title="Adresse kopieren"
                >
                  <span>{formatAddress(account.address)}</span>
                  <FaRegCopy className="text-xs opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-400 text-sm font-medium transition-all duration-200 border border-amber-500/30"
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
                {dfaithBalance ? dfaithBalance.displayValue : "0.00"}
                {(isLoadingBalances || isRefreshing) && (
                  <span className="ml-2 text-xs text-amber-500/60 animate-pulse">↻</span>
                )}
              </div>
              {/* Nur EUR-Wert anzeigen, wenn Preisquote vorhanden ist */}
              {dfaithPriceEur > 0 && (
                <div className="text-xs text-zinc-500 mt-2">
                  ≈ {dfaithEurValue} EUR
                </div>
              )}
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

            {/* Staking Modal mit verbesserter Integration */}
            <Modal open={showStakeModal} onClose={() => setShowStakeModal(false)} title="Staking">
              <div className="min-h-[400px]">
                <StakeTab />
              </div>
            </Modal>

            {/* Copy Success Modal */}
            <Modal open={showCopyModal} onClose={() => setShowCopyModal(false)} title={copySuccess ? "Erfolgreich kopiert!" : "Fehler beim Kopieren"}>
              <div className="text-center py-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  copySuccess 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {copySuccess ? (
                    <span className="text-2xl">✓</span>
                  ) : (
                    <span className="text-2xl">✗</span>
                  )}
                </div>
                <p className={`text-lg font-medium mb-2 ${
                  copySuccess ? 'text-green-400' : 'text-red-400'
                }`}>
                  {copySuccess ? 'Wallet-Adresse kopiert!' : 'Kopieren fehlgeschlagen'}
                </p>
                <p className="text-zinc-400 text-sm mb-4">
                  {copySuccess 
                    ? 'Die Adresse befindet sich jetzt in deiner Zwischenablage.' 
                    : 'Bitte versuche es erneut oder kopiere die Adresse manuell.'
                  }
                </p>
                {copySuccess && (
                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                    <p className="text-xs text-zinc-500 mb-1">Kopierte Adresse:</p>
                    <p className="text-amber-400 font-mono text-sm break-all">
                      {account?.address}
                    </p>
                  </div>
                )}
              </div>
            </Modal>
          </CardContent>
        </Card>
      </div>
    );
  }