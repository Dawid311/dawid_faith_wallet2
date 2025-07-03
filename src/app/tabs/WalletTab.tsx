import { useEffect, useState, useRef, useCallback } from "react";
import { createThirdwebClient, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useSendTransaction } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { balanceOf, approve, allowance } from "thirdweb/extensions/erc20";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy, FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaHistory, FaTimes, FaSync } from "react-icons/fa";

// BalanceCache-Klasse - Ähnlich wie MetaMask könnte es funktionieren
class BalanceCache {
  private cache: Map<string, {
    value: bigint,
    timestamp: number,
    // Nonce für jede Abfrage, um sicherzustellen, dass nur der neueste Wert verwendet wird
    nonce: number
  }>;
  private ttl: number; // Time-to-live in ms
  private lastNonce: number;

  constructor(ttl = 30000) { // Standard-TTL: 30 Sekunden
    this.cache = new Map();
    this.ttl = ttl;
    this.lastNonce = 0;
  }

  // Generiert einen einzigartigen Cache-Schlüssel
  private getCacheKey(contractAddress: string, accountAddress: string): string {
    return `${contractAddress.toLowerCase()}_${accountAddress.toLowerCase()}`;
  }

  // Generiert eine neue Nonce für eine Abfrage
  private getNextNonce(): number {
    return ++this.lastNonce;
  }

  // Überprüft, ob ein gecachter Wert noch gültig ist
  isValid(contractAddress: string, accountAddress: string): boolean {
    const key = this.getCacheKey(contractAddress, accountAddress);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    return Date.now() - entry.timestamp < this.ttl;
  }

  // Gibt einen gecachten Wert zurück (oder null, wenn keiner existiert oder er abgelaufen ist)
  get(contractAddress: string, accountAddress: string): bigint | null {
    const key = this.getCacheKey(contractAddress, accountAddress);
    const entry = this.cache.get(key);
    
    if (!entry || (Date.now() - entry.timestamp > this.ttl)) {
      return null;
    }
    
    return entry.value;
  }

  // Speichert einen Wert im Cache
  set(contractAddress: string, accountAddress: string, value: bigint): number {
    const key = this.getCacheKey(contractAddress, accountAddress);
    const nonce = this.getNextNonce();
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      nonce
    });
    
    return nonce;
  }

  // Aktualisiert einen Cache-Eintrag nur, wenn die Nonce der Abfrage höher ist als die des vorhandenen Eintrags
  // Dies verhindert Race-Conditions zwischen konkurrierenden Abfragen
  updateIfNewer(contractAddress: string, accountAddress: string, value: bigint, nonce: number): boolean {
    const key = this.getCacheKey(contractAddress, accountAddress);
    const entry = this.cache.get(key);
    
    if (!entry || nonce > entry.nonce) {
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        nonce
      });
      return true;
    }
    
    return false;
  }

  // Löscht einen Cache-Eintrag
  invalidate(contractAddress: string, accountAddress: string): void {
    const key = this.getCacheKey(contractAddress, accountAddress);
    this.cache.delete(key);
  }
} // <-- Hier die fehlende schließende Klammer für die Klasse BalanceCache

// Hilfsfunktion zum Ermitteln des stabilsten Wertes aus einer Reihe von Abfragen
function getStableBalance(values: bigint[]): bigint {
  // Bestehende Implementation
  if (values.length === 0) return BigInt(0);
  if (values.length === 1) return values[0];
  
  // Finde den Modus (häufigsten Wert) in der Liste
  const counts = new Map<string, number>();
  let maxCount = 0;
  let mostFrequentValue = values[0];
  
  for (const value of values) {
    const valueStr = value.toString();
    const count = (counts.get(valueStr) || 0) + 1;
    counts.set(valueStr, count);
    
    if (count > maxCount) {
      maxCount = count;
      mostFrequentValue = value;
    }
  }
  
  console.log("Balance-Stabilisierung: Alle Werte", values.map(v => v.toString()));
  console.log("Balance-Stabilisierung: Häufigster Wert", mostFrequentValue.toString(), `(${maxCount} von ${values.length})`);
  
  return mostFrequentValue;
}

// Import Subtabs
import BuyTab from "./wallet/BuyTab";
import SellTab from "./wallet/SellTab";
import SendTab from "./wallet/SendTab";
import HistoryTab from "./wallet/HistoryTab";
import StakeTab from "./wallet/StakeTab";

// Globaler Balance-Cache mit 30 Sekunden TTL (wie MetaMask es ähnlich machen könnte)
const globalBalanceCache = new BalanceCache(30000);

// Alternierende RPC-Endpunkte für bessere Zuverlässigkeit
const RPC_ENDPOINTS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://polygon-mainnet.public.blastapi.io" 
];

// Funktion zum Abrufen eines stabilen RPC-Endpunkts
function getOptimalRpcEndpoint() {
  // Einfache Round-Robin-Auswahl zwischen verfügbaren RPC-Endpunkten
  const now = Date.now();
  const index = Math.floor((now / 10000) % RPC_ENDPOINTS.length);
  return RPC_ENDPOINTS[index];
}

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

// Client mit optimiertem RPC-Endpunkt
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
  // State für Refresh-Animation
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

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

  const requestIdRef = useRef(0);
  const lastSuccessfulBalanceRef = useRef<{ 
    dfaith: number | null, 
    dinvest: number | null,
    dfaithRaw: string | null,
    dinvestRaw: string | null
  }>({ 
    dfaith: null, 
    dinvest: null,
    dfaithRaw: null,
    dinvestRaw: null
  });
  
  // Balance-Historie für Stabilisierung
  const balanceHistoryRef = useRef<{
    dfaithValues: string[],
    lastStableValue: string | null,
    stabilityCount: number
  }>({
    dfaithValues: [],
    lastStableValue: null,
    stabilityCount: 0
  });

  // Funktion für manuelle Aktualisierung der Balance
  const refreshBalances = async () => {
    if (!account?.address || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      const myRequestId = ++requestIdRef.current;
      await fetchBalances(myRequestId);
      await fetchDfaithPrice();
    } finally {
      // Nach einer kurzen Verzögerung den Refresh-Status zurücksetzen (Animation)
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Optimiertes useEffect mit MetaMask-ähnlichem Polling-Intervall
  useEffect(() => {
    let isMounted = true;
    
    // Funktion, um einen kontrollierten Ladevorgang zu starten
    const load = useCallback(async () => {
      if (!isMounted || !account?.address) return;
      
      const myRequestId = ++requestIdRef.current;
      try {
        await fetchBalances(myRequestId);
        await fetchDfaithPrice();
      } catch (e) {
        console.error("Fehler beim Laden:", e);
      }
    }, [account?.address]);

    // Initial laden
    if (account?.address) {
      load();
    }

    // Automatische Aktualisierungen:
    // - Alle 60 Sekunden im normalen Zustand
    // - Alle 20 Sekunden für 2 Minuten nach dem Verbinden 
    //   (ähnlich wie MetaMask, das zunächst häufiger aktualisiert)
    let pollInterval = 60000; // 60 Sekunden Standardintervall
    const initialConnectTime = Date.now();
    
    const updatePollInterval = () => {
      const timeSinceConnect = Date.now() - initialConnectTime;
      if (timeSinceConnect < 120000) { // 2 Minuten
        pollInterval = 20000; // 20 Sekunden für initiale Stabilisierung
      } else {
        pollInterval = 60000; // 60 Sekunden im Normalbetrieb
      }
    };
    
    // Sofortiges Polling-Intervall bestimmen
    updatePollInterval();
    
    const interval = setInterval(() => {
      updatePollInterval(); // Aktualisiere das Intervall
      if (account?.address) {
        load();
      }
    }, pollInterval);

    // Aufräumen
    return () => {
      isMounted = false;
      clearInterval(interval);
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

  // Optimierte Balance-Aktualisierung mit Cache-System und MetaMask-ähnlichem Verhalten
  const fetchBalances = async (myRequestId?: number) => {
    if (!account?.address) {
      setDfaithBalance(null);
      setDinvestBalance(null);
      setDfaithEurValue("0.00");
      return;
    }

    console.log("=== Starte fetchBalances ===");
    console.log("Request ID:", myRequestId);
    console.log("Account:", account.address);
    console.log("Zeit:", new Date().toISOString());
    
    // Optimaler RPC für diesen Aufruf
    const currentRpcEndpoint = getOptimalRpcEndpoint();
    console.log("Verwende RPC-Endpunkt:", currentRpcEndpoint);

    try {
      // Überprüfen, ob wir D.FAITH aus dem Cache verwenden können
      let dfaithBalanceResult: bigint | null = null;
      let usingCachedDfaith = false;
      
      if (globalBalanceCache.isValid(DFAITH_TOKEN.address, account.address)) {
        dfaithBalanceResult = globalBalanceCache.get(DFAITH_TOKEN.address, account.address);
        usingCachedDfaith = true;
        console.log("D.FAITH Balance aus Cache verwendet:", dfaithBalanceResult?.toString());
      }
      
      // Wenn kein Cache oder dieser abgelaufen ist, neue Abfrage starten
      if (!dfaithBalanceResult) {
        // D.FAITH Balance abrufen - mit verbessertem RPC und Fehlerbehandlung
        const dfaithContract = getContract({
          client,
          chain: {
            ...polygon,
            rpc: currentRpcEndpoint  // Dynamischer RPC-Endpunkt
          },
          address: DFAITH_TOKEN.address
        });

        console.log("Rufe D.FAITH Contract an:", DFAITH_TOKEN.address);
        
        // Nonce für diesen Anfragezyklus generieren
        const requestNonce = globalBalanceCache.set(DFAITH_TOKEN.address, account.address, BigInt(0));
        
        // Führe mehrere Abfragen durch und verwende den Modus für stabilere Ergebnisse
        const dfaithBalanceResults: bigint[] = [];
        const queryPromises: Promise<void>[] = [];
        
        for (let i = 0; i < 3; i++) {
          queryPromises.push((async () => {
            try {
              // Verbesserung: Jede Abfrage mit einem kurzen, zufälligen Abstand starten
              await new Promise(resolve => setTimeout(resolve, i * 20));
              
              // Für jede Abfrage einen anderen RPC-Endpunkt verwenden, falls möglich
              const queryContract = getContract({
                client,
                chain: {
                  ...polygon,
                  rpc: RPC_ENDPOINTS[i % RPC_ENDPOINTS.length]
                },
                address: DFAITH_TOKEN.address
              });
              
              const result = await balanceOf({
                contract: queryContract,
                address: account.address
              });
              
              dfaithBalanceResults.push(result);
            } catch (e) {
              console.error(`D.FAITH Balance-Abfrage #${i+1} fehlgeschlagen:`, e);
            }
          })());
        }
        
        // Warte auf alle Abfragen
        await Promise.all(queryPromises);
        
        // Falls Abfrage fehlgeschlagen ist, versuche noch einmal mit einem anderen RPC
        if (dfaithBalanceResults.length === 0) {
          try {
            const fallbackContract = getContract({
              client,
              chain: {
                ...polygon,
                rpc: RPC_ENDPOINTS[(RPC_ENDPOINTS.length - 1)]
              },
              address: DFAITH_TOKEN.address
            });
            
            const result = await balanceOf({
              contract: fallbackContract,
              address: account.address
            });
            
            dfaithBalanceResults.push(result);
          } catch (e) {
            console.error("Fallback D.FAITH Balance-Abfrage fehlgeschlagen:", e);
          }
        }
        
        if (dfaithBalanceResults.length > 0) {
          // Wähle den stabilsten Wert als Ergebnis
          dfaithBalanceResult = getStableBalance(dfaithBalanceResults);
          
          // Cache aktualisieren, aber nur wenn die Nonce noch aktuell ist
          globalBalanceCache.updateIfNewer(
            DFAITH_TOKEN.address, 
            account.address, 
            dfaithBalanceResult,
            requestNonce
          );
        } else if (lastSuccessfulBalanceRef.current.dfaithRaw) {
          // Wenn alle Abfragen fehlschlagen, verwende den letzten erfolgreichen Wert
          dfaithBalanceResult = BigInt(lastSuccessfulBalanceRef.current.dfaithRaw);
          console.log("Verwende letzten erfolgreichen D.FAITH-Wert:", dfaithBalanceResult.toString());
        } else {
          dfaithBalanceResult = BigInt(0);
        }
      }
      
      console.log("D.FAITH Rohe Balance:", dfaithBalanceResult.toString(), usingCachedDfaith ? "(aus Cache)" : "");
      console.log(`D.FAITH Vorherige Rohe Balance: ${lastSuccessfulBalanceRef.current.dfaithRaw || 'keine'}`);
      
      // Möglicher Request-Abbruch prüfen
      if (myRequestId !== undefined && myRequestId !== requestIdRef.current) {
        console.log("Request abgebrochen - nicht mehr aktuell");
        return;
      }

      // D.INVEST Balance abrufen
      let dinvestBalanceResult: bigint | null = null;
      let usingCachedDinvest = false;
      
      if (globalBalanceCache.isValid(DINVEST_TOKEN.address, account.address)) {
        dinvestBalanceResult = globalBalanceCache.get(DINVEST_TOKEN.address, account.address);
        usingCachedDinvest = true;
        console.log("D.INVEST Balance aus Cache verwendet:", dinvestBalanceResult?.toString());
      }
      
      if (!dinvestBalanceResult) {
        const dinvestContract = getContract({
          client,
          chain: {
            ...polygon,
            rpc: currentRpcEndpoint
          },
          address: DINVEST_TOKEN.address
        });

        console.log("Rufe D.INVEST Contract an:", DINVEST_TOKEN.address);
        
        try {
          dinvestBalanceResult = await balanceOf({
            contract: dinvestContract,
            address: account.address
          });
          
          // Cache für D.INVEST aktualisieren
          globalBalanceCache.set(DINVEST_TOKEN.address, account.address, dinvestBalanceResult);
        } catch (e) {
          console.error("D.INVEST Balance-Abfrage fehlgeschlagen:", e);
          
          // Fallback auf letzten erfolgreichen Wert
          if (lastSuccessfulBalanceRef.current.dinvestRaw) {
            dinvestBalanceResult = BigInt(lastSuccessfulBalanceRef.current.dinvestRaw);
          } else {
            dinvestBalanceResult = BigInt(0);
          }
        }
      }
      
      console.log("D.INVEST Rohe Balance:", dinvestBalanceResult.toString(), usingCachedDinvest ? "(aus Cache)" : "");
      console.log(`D.INVEST Vorherige Rohe Balance: ${lastSuccessfulBalanceRef.current.dinvestRaw || 'keine'}`);
      
      if (myRequestId !== undefined && myRequestId !== requestIdRef.current) {
        console.log("Request abgebrochen - nicht mehr aktuell");
        return;
      }

      // Balances formatieren mit präziser BigInt-zu-Number-Konvertierung
      const dfaithFormatted = Number(dfaithBalanceResult) / 10 ** DFAITH_TOKEN.decimals;
      const dinvestFormatted = Number(dinvestBalanceResult) / 10 ** DINVEST_TOKEN.decimals;

      console.log("D.FAITH Formatierte Balance:", dfaithFormatted.toFixed(2));
      console.log("D.INVEST Formatierte Balance:", Math.floor(dinvestFormatted).toString());
      
      // Logik für UI-Aktualisierung - ähnlich wie MetaMask: 
      // Bei manueller Aktualisierung immer aktualisieren
      // Ansonsten nur bei signifikanten Änderungen oder wenn wir keine Werte haben
      const isManualRefresh = myRequestId !== undefined;
      const isInitialLoad = lastSuccessfulBalanceRef.current.dfaith === null;
      
      // D.FAITH Aktualisierungslogik
      let shouldUpdateDfaith = isManualRefresh || isInitialLoad;
      
      if (!shouldUpdateDfaith && lastSuccessfulBalanceRef.current.dfaithRaw !== dfaithBalanceResult.toString()) {
        // Bei D.FAITH ist die Stabilität besonders wichtig
        // Prüfe, ob der neue Wert bereits in der Werte-Historie vorhanden ist
        const newRawValue = dfaithBalanceResult.toString();
        const existingIndex = balanceHistoryRef.current.dfaithValues.indexOf(newRawValue);
        
        if (existingIndex >= 0) {
          // Dieser Wert wurde bereits einmal gesehen - höhere Wahrscheinlichkeit, dass er korrekt ist
          shouldUpdateDfaith = true;
          console.log("D.FAITH: Wert bereits in Historie gefunden, aktualisiere UI");
        } else {
          // Bei Änderung: Nur aktualisieren wenn die Änderung signifikant ist (>1%)
          const percentDiff = Math.abs((dfaithFormatted - (lastSuccessfulBalanceRef.current.dfaith || 0)) / Math.max(lastSuccessfulBalanceRef.current.dfaith || 1, 1)) * 100;
          shouldUpdateDfaith = percentDiff > 1;
          console.log(`D.FAITH Prozentuale Änderung: ${percentDiff.toFixed(2)}%, Aktualisieren: ${shouldUpdateDfaith}`);
        }
      }
      
      // D.INVEST Aktualisierungslogik - einfacher da weniger problematisch
      let shouldUpdateDinvest = isManualRefresh || isInitialLoad;
      
      if (!shouldUpdateDinvest && lastSuccessfulBalanceRef.current.dinvestRaw !== dinvestBalanceResult.toString()) {
        shouldUpdateDinvest = true;
      }
      
      // Aktualisiere Balance-Historie
      if (!usingCachedDfaith) {
        balanceHistoryRef.current.dfaithValues.push(dfaithBalanceResult.toString());
        if (balanceHistoryRef.current.dfaithValues.length > 5) {
          balanceHistoryRef.current.dfaithValues.shift(); // Ältesten Wert entfernen
        }
      }

      // UI-Aktualisierung für D.FAITH
      if (shouldUpdateDfaith) {
        setDfaithBalance({ displayValue: dfaithFormatted.toFixed(2) });
        lastSuccessfulBalanceRef.current.dfaith = dfaithFormatted;
        lastSuccessfulBalanceRef.current.dfaithRaw = dfaithBalanceResult.toString();
        fetchDfaithEurValue(dfaithFormatted.toFixed(2));
        console.log("D.FAITH UI aktualisiert:", dfaithFormatted.toFixed(2));
      }
      
      // UI-Aktualisierung für D.INVEST
      if (shouldUpdateDinvest) {
        setDinvestBalance({ displayValue: Math.floor(dinvestFormatted).toString() });
        lastSuccessfulBalanceRef.current.dinvest = dinvestFormatted;
        lastSuccessfulBalanceRef.current.dinvestRaw = dinvestBalanceResult.toString();
        console.log("D.INVEST UI aktualisiert:", Math.floor(dinvestFormatted).toString());
      }
      
      console.log("=== Ende fetchBalances ===");
    } catch (error) {
      console.error("Fehler beim Abrufen der Balances:", error);
      
      // Bei schwerwiegendem Fehler: Nur dann UI zurücksetzen, wenn wir noch keine Werte haben
      if (myRequestId === requestIdRef.current) {
        if (!lastSuccessfulBalanceRef.current.dfaith && !lastSuccessfulBalanceRef.current.dinvest) {
          setDfaithBalance({ displayValue: "0.00" });
          setDinvestBalance({ displayValue: "0" });
          setDfaithEurValue("0.00");
        }
      }
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
      console.error("Fehler beim Berechnen des D.FAITH EUR-Werts:", e);
      setDfaithEurValue("0.00");
    }
  };

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

  // Umfassende Analyse-Funktion für Balance-Schwankungen - MetaMask-Vergleich eingebaut
  const analyzeBalanceIssue = async () => {
    if (!account?.address) return;
    
    console.log("===== ERWEITERTE BALANCE SCHWANKUNGS-ANALYSE BEGINNT =====");
    console.log("Zeit:", new Date().toISOString());
    
    try {
      // Status des Cache prüfen
      console.log("Cache-Status für D.FAITH:", 
        globalBalanceCache.isValid(DFAITH_TOKEN.address, account.address) ? "VALID" : "INVALID");
      
      // Klarstellung des Problems
      console.log("PROBLEM-BESCHREIBUNG: Wir untersuchen, warum der D.FAITH Token-Kontostand schwankt, während er in MetaMask stabil bleibt.");
      console.log("ZIEL: Eine ähnliche Stabilisierungsstrategie wie in MetaMask implementieren.");
      
      // Mehrere Anfragen über verschiedene RPC-Endpunkte, um Schwankungen zu beobachten
      type BalanceResult = {
        raw: string;
        formatted: string;
        responseTime: string;
        rpc: string;
      };
      
      const results: BalanceResult[] = [];
      const rpcResults: { [key: string]: BalanceResult[] } = {};
      
      for (const rpc of RPC_ENDPOINTS) {
        rpcResults[rpc] = [];
      }
      
      // Parallele Abfragen für jeden RPC-Endpunkt
      console.log("==== Test mit verschiedenen RPC-Endpunkten ====");
      
      const rpcTests = await Promise.all(RPC_ENDPOINTS.map(async (rpc) => {
        try {
          const dfaithContract = getContract({
            client,
            chain: {
              ...polygon,
              rpc
            },
            address: DFAITH_TOKEN.address
          });
          
          // 5 Abfragen pro RPC-Endpunkt
          const localResults = [];
          
          for (let i = 0; i < 5; i++) {
            const startTime = performance.now();
            
            try {
              const result = await balanceOf({
                contract: dfaithContract,
                address: account.address
              });
              
              const endTime = performance.now();
              const formattedBalance = Number(result) / 10 ** DFAITH_TOKEN.decimals;
              
              const resultObj = {
                raw: result.toString(),
                formatted: formattedBalance.toFixed(2),
                responseTime: (endTime - startTime).toFixed(2) + 'ms',
                rpc
              };
              
              localResults.push(resultObj);
              results.push(resultObj);
              rpcResults[rpc].push(resultObj);
              
              console.log(`RPC ${rpc.substring(8, 20)}... Abfrage #${i+1}: ${formattedBalance.toFixed(2)} in ${(endTime - startTime).toFixed(2)}ms`);
              
              // Kleine Pause zwischen Abfragen
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
              console.error(`Fehler bei RPC ${rpc}:`, e);
            }
          }
          
          return { rpc, results: localResults };
        } catch (e) {
          console.error(`RPC ${rpc} fehlgeschlagen:`, e);
          return { rpc, results: [] };
        }
      }));
      
      // Analysiere die Ergebnisse aus allen RPC-Endpunkten
      let allSame = true;
      let firstRaw = results.length > 0 ? results[0].raw : "";
      const uniqueValues = new Map<string, number>();
      
      // Sammle Werte und Häufigkeiten
      for (const result of results) {
        uniqueValues.set(result.raw, (uniqueValues.get(result.raw) || 0) + 1);
        if (result.raw !== firstRaw) {
          allSame = false;
        }
      }
      
      // Finde den Modus (häufigsten Wert)
      let modalValue = "";
      let modalCount = 0;
      uniqueValues.forEach((count, value) => {
        if (count > modalCount) {
          modalCount = count;
          modalValue = value;
        }
      });
      
      // Bereite detaillierte Statistiken vor
      const uniqueValuesArray = Array.from(uniqueValues.entries()).map(([value, count]) => ({
        value,
        formattedValue: (Number(BigInt(value)) / 10 ** DFAITH_TOKEN.decimals).toFixed(2),
        count,
        percentage: (count / results.length * 100).toFixed(1) + '%'
      }));
      
      // RPC-spezifische Analyse
      const rpcAnalysis = Object.entries(rpcResults).map(([rpc, rpcData]) => {
        const rpcUniqueValues = new Map<string, number>();
        for (const result of rpcData) {
          rpcUniqueValues.set(result.raw, (rpcUniqueValues.get(result.raw) || 0) + 1);
        }
        
        let rpcModalValue = "";
        let rpcModalCount = 0;
        rpcUniqueValues.forEach((count, value) => {
          if (count > rpcModalCount) {
            rpcModalCount = count;
            rpcModalValue = value;
          }
        });
        
        return {
          rpc,
          responseCount: rpcData.length,
          uniqueValueCount: rpcUniqueValues.size,
          allSame: rpcUniqueValues.size === 1,
          modalValue: rpcModalValue,
          modalValueFormatted: rpcModalValue ? (Number(BigInt(rpcModalValue)) / 10 ** DFAITH_TOKEN.decimals).toFixed(2) : "N/A",
          modalPercentage: rpcData.length ? (rpcModalCount / rpcData.length * 100).toFixed(1) + '%' : "0%",
          avgResponseTime: rpcData.length ? 
            (rpcData.reduce((sum, r) => sum + parseFloat(r.responseTime), 0) / rpcData.length).toFixed(2) + 'ms' : "N/A"
        };
      });
      
      // Vergleiche mit Cache-Strategien
      console.log("\n===== ANALYSE-ERGEBNISSE =====");
      console.log("Gesamtzahl der Abfragen:", results.length);
      console.log("Alle Ergebnisse identisch?", allSame ? "JA" : "NEIN");
      console.log("Anzahl unterschiedlicher Werte:", uniqueValues.size);
      console.log("Werteverteilung:", uniqueValuesArray);
      console.log("Häufigster Wert:", modalValue, 
        `(${modalCount} von ${results.length}, ${(modalCount/results.length*100).toFixed(1)}%) = `,
        (Number(BigInt(modalValue)) / 10 ** DFAITH_TOKEN.decimals).toFixed(2));
      
      console.log("\n==== RPC-ANALYSE ====");
      rpcAnalysis.forEach(analysis => {
        console.log(`RPC ${analysis.rpc.substring(8, 25)}...:`);
        console.log(`  Antworten: ${analysis.responseCount}, Unterschiedliche Werte: ${analysis.uniqueValueCount}`);
        console.log(`  Häufigster Wert: ${analysis.modalValueFormatted} (${analysis.modalPercentage})`);
        console.log(`  Durchschnittliche Antwortzeit: ${analysis.avgResponseTime}`);
      });
      
      // Umfassende Diagnose
      console.log("\n===== DIAGNOSE =====");
      if (uniqueValues.size > 1) {
        console.log("PROBLEM BESTÄTIGT: Der D.FAITH Contract gibt unterschiedliche Balances zurück, abhängig von:");
        console.log("1. Verwendetem RPC-Endpunkt");
        console.log("2. Timing der Anfrage");
        console.log("\nLÖSUNGSSTRATEGIE:");
        console.log("1. Implementierung eines Cache-Systems mit 30 Sekunden TTL (ähnlich wie MetaMask)");
        console.log("2. Mehrfache parallele Abfragen mit unterschiedlichen RPC-Endpunkten");
        console.log("3. Verwendung des häufigsten Werts als stabilstes Ergebnis");
        console.log("4. Konsistenzprüfung gegen frühere Werte, um extreme Schwankungen zu vermeiden");
        console.log("5. UI-Aktualisierung nur bei signifikanten Änderungen (>1%)");
      } else {
        console.log("Kein Problem erkannt: Der Contract gibt momentan konsistente Balances zurück.");
        console.log("Trotzdem bleiben die Stabilisierungsmaßnahmen aktiv, da das Problem zeitweise auftritt.");
      }
      console.log("===== ANALYSE BEENDET =====");
      
      return { 
        allSame, 
        uniqueValues: uniqueValuesArray, 
        modalValue,
        modalValueFormatted: (Number(BigInt(modalValue)) / 10 ** DFAITH_TOKEN.decimals).toFixed(2),
        modalPercentage: (modalCount/results.length*100).toFixed(1),
        results,
        rpcAnalysis
      };
    } catch (error) {
      console.error("Fehler bei der Balance-Analyse:", error);
      return null;
    }
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
                  // Verwende den bewährten stabilsten RPC-Endpunkt
                  rpc: "https://polygon-rpc.com",
                  // Verwenden Sie nur diese RPC-Option, die die stabilste Balance liefert
                }}
              />
            </div>

            {/* Wallet Address mit besserem Styling und Refresh Button */}
            <div className="flex justify-between items-center bg-zinc-800/70 backdrop-blur-sm rounded-xl p-3 mb-6 border border-zinc-700/80">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 mb-0.5">Wallet Adresse</span>
                <span className="font-mono text-zinc-300 text-sm">
                  {account?.address ? formatAddress(account.address) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsDiagnosing(true);
                    try {
                      await analyzeBalanceIssue();
                    } finally {
                      setTimeout(() => setIsDiagnosing(false), 500);
                    }
                  }}
                  disabled={isDiagnosing}
                  className={`px-2 py-1 text-xs ${isDiagnosing ? 'bg-indigo-700/30' : 'bg-indigo-700/50 hover:bg-indigo-700/70'} text-indigo-200 rounded-lg transition-colors flex items-center gap-1`}
                  title="Balance-Problem analysieren"
                >
                  {isDiagnosing && <FaSync className="animate-spin text-[10px]" />}
                  Diagnose
                </button>
                <button
                  onClick={refreshBalances}
                  disabled={isRefreshing}
                  className={`p-2 rounded-lg ${isRefreshing ? 'bg-amber-600/20' : 'bg-zinc-700 hover:bg-zinc-600'} text-zinc-200 text-sm font-medium transition-all duration-200`}
                  title="Aktualisieren"
                >
                  <FaSync className={`text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
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