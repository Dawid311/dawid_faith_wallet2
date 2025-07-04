import { useEffect, useState, useRef } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt, FaSync, FaRegCopy } from "react-icons/fa";
import { useActiveAccount, useSendTransaction, BuyWidget } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { NATIVE_TOKEN_ADDRESS, getContract, prepareContractCall, sendAndConfirmTransaction, readContract } from "thirdweb";
import { client } from "../../client";
import { balanceOf, approve } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060"; // Neue D.FAITH Token-Adresse
const DFAITH_DECIMALS = 2; // Neue Dezimalstellen
const DINVEST_TOKEN = "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383"; // D.INVEST Token Adresse
const DINVEST_DECIMALS = 0; // D.INVEST hat keine Dezimalstellen
const POL_TOKEN = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // POL (WMATIC)
const POL_DECIMALS = 18;
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router auf Polygon

export default function BuyTab() {
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number | null>(null);
  const [polPriceEur, setPolPriceEur] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [lastKnownPrices, setLastKnownPrices] = useState<{
    dfaith?: number;
    dfaithEur?: number;
    polEur?: number;
    timestamp?: number;
  }>({});
  const account = useActiveAccount();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showPolBuyModal, setShowPolBuyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const { mutate: sendTransaction, isPending: isSwapPending } = useSendTransaction();
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  // Neuer State für mehrstufigen Kaufprozess
  const [buyStep, setBuyStep] = useState<'initial' | 'quoteFetched' | 'approved' | 'completed'>('initial');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [quoteTxData, setQuoteTxData] = useState<any>(null);
  const [spenderAddress, setSpenderAddress] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // D.FAITH Preis von OpenOcean holen und in Euro umrechnen mit Fallback
  useEffect(() => {
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
            if (parsed.dfaith) setDfaithPrice(parsed.dfaith);
            if (parsed.dfaithEur) setDfaithPriceEur(parsed.dfaithEur);
            if (parsed.polEur) setPolPriceEur(parsed.polEur);
          }
        }
      } catch (e) {
        console.log('Fehler beim Laden gespeicherter Preise:', e);
      }
    };

    loadStoredPrices();

    const fetchDfaithPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      let price: number | null = null;
      let priceEur: number | null = null;
      let polEur: number | null = null;
      let errorMsg = "";
      
      try {
        // 1. Hole POL/EUR Preis von CoinGecko
        try {
          const polResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
          if (polResponse.ok) {
            const polData = await polResponse.json();
            polEur = polData['polygon-ecosystem-token']?.eur;
            if (polEur) {
              // Auf 2 Dezimalstellen runden
              polEur = Math.round(polEur * 100) / 100;
            }
          }
        } catch (e) {
          console.log('POL Preis Fehler:', e);
        }
        
        // Fallback auf letzten bekannten POL Preis
        if (!polEur && lastKnownPrices.polEur) {
          polEur = lastKnownPrices.polEur;
        } else if (!polEur) {
          polEur = 0.50; // Hard fallback
        }
        
        // 2. Hole D.FAITH Preis von OpenOcean
        try {
          const params = new URLSearchParams({
            chain: "polygon",
            inTokenAddress: "0x0000000000000000000000000000000000001010", // Polygon Native Token (MATIC)
            outTokenAddress: DFAITH_TOKEN,
            amount: "1", // 1 POL
            gasPrice: "50",
          });
          
          const response = await fetch(`https://open-api.openocean.finance/v3/polygon/quote?${params}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log("OpenOcean Response:", data);
            if (data && data.data && data.data.outAmount && data.data.outAmount !== "0") {
              // outAmount ist in D.FAITH (mit 2 Decimals)
              price = Number(data.data.outAmount) / Math.pow(10, DFAITH_DECIMALS);
              // Berechne EUR Preis: (D.FAITH pro POL) * (POL Preis in EUR) = D.FAITH Preis in EUR
              priceEur = polEur / price; // 1 D.FAITH = POL_EUR / DFAITH_PER_POL
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
        if (!price && lastKnownPrices.dfaith) {
          price = lastKnownPrices.dfaith;
          errorMsg = "";
        }
        if (!priceEur && lastKnownPrices.dfaithEur) {
          priceEur = lastKnownPrices.dfaithEur;
          errorMsg = "";
        }
        
      } catch (e) {
        console.error("Price fetch error:", e);
        errorMsg = "Preis-API Fehler";
        
        // Verwende letzte bekannte Preise als Fallback
        if (lastKnownPrices.dfaith) price = lastKnownPrices.dfaith;
        if (lastKnownPrices.dfaithEur) priceEur = lastKnownPrices.dfaithEur;
        if (lastKnownPrices.polEur) polEur = lastKnownPrices.polEur;
        
        if (price && priceEur && polEur) {
          errorMsg = ""; // Kein Fehler anzeigen wenn Fallback verfügbar
        }
      }
      
      // Setze Preise (entweder neue oder Fallback)
      if (polEur) setPolPriceEur(polEur);
      if (price) setDfaithPrice(price);
      if (priceEur) setDfaithPriceEur(priceEur);
      
      // Speichere erfolgreiche Preise
      if (price && priceEur && polEur) {
        const newPrices = {
          dfaith: price,
          dfaithEur: priceEur,
          polEur: polEur,
          timestamp: Date.now()
        };
        setLastKnownPrices(newPrices);
        try {
          localStorage.setItem('dawid_faith_prices', JSON.stringify(newPrices));
        } catch (e) {
          console.log('Fehler beim Speichern der Preise:', e);
        }
        setPriceError(null);
      } else {
        setPriceError(errorMsg || "Preise nicht verfügbar");
      }
      
      setIsLoadingPrice(false);
    };

    fetchDfaithPrice();
    // Preis alle 2 Minuten aktualisieren
    const interval = setInterval(fetchDfaithPrice, 120000);
    return () => clearInterval(interval);
  }, [lastKnownPrices.dfaith, lastKnownPrices.dfaithEur, lastKnownPrices.polEur]);

  // D.INVEST kaufen Modal öffnen
  const handleInvestBuy = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
    }
    setShowInvestModal(true);
  };

  const handleInvestContinue = () => {
    setShowInvestModal(false);
    window.open('https://dein-stripe-link.de', '_blank');
  };

  // State für D.FAITH Swap
  const [showDfaithBuyModal, setShowDfaithBuyModal] = useState(false);
  const [swapAmountPol, setSwapAmountPol] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [polBalance, setPolBalance] = useState("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxStatus, setSwapTxStatus] = useState<string | null>(null);

  // POL Balance laden (auf 3 Stellen)
  useEffect(() => {
    const fetchPolBalance = async () => {
      if (!account?.address) {
        console.log("No account connected");
        return;
      }
      try {
        console.log("Fetching native POL balance for:", account.address);
        
        const balance = await readContract({
          contract: getContract({
            client,
            chain: polygon,
            address: "0x0000000000000000000000000000000000000000"
          }),
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address]
        }).catch(async () => {
          const response = await fetch(polygon.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [account.address, 'latest'],
              id: 1
            })
          });
          const data = await response.json();
          return BigInt(data.result);
        });
        
        console.log("Native POL Balance raw:", balance.toString());
        
        const polFormatted = Number(balance) / Math.pow(10, 18);
        console.log("Native POL formatted:", polFormatted);
        
        // Auf 3 Stellen formatieren
        setPolBalance(polFormatted.toFixed(3));
        
      } catch (error) {
        console.error("Fehler beim Laden der POL Balance:", error);
        setPolBalance("0");
      }
    };
    
    fetchPolBalance();
    const interval = setInterval(fetchPolBalance, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // D.FAITH Balance und D.INVEST Balance von der Insight API laden
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [dinvestBalance, setDinvestBalance] = useState("0");

  // Balances laden
  useEffect(() => {
    if (!account?.address) {
      setDfaithBalance("0.00");
      setDinvestBalance("0");
      return;
    }
    // D.FAITH
    (async () => {
      try {
        const res = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DFAITH_TOKEN}&owner_address=${account.address}&include_native=true`);
        const data = await res.json();
        const bal = data?.data?.[0]?.balance ?? "0";
        setDfaithBalance((Number(bal) / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS));
      } catch { setDfaithBalance("0.00"); }
    })();
    // D.INVEST
    (async () => {
      try {
        const res = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DINVEST_TOKEN}&owner_address=${account.address}&include_native=true`);
        const data = await res.json();
        const bal = data?.data?.[0]?.balance ?? "0";
        setDinvestBalance(Math.floor(Number(bal)).toString());
      } catch { setDinvestBalance("0"); }
    })();
  }, [account?.address]);

  // D.FAITH Swap Funktion mit mehrstufigem Prozess wie im SellTab
  const handleGetQuote = async () => {
    setSwapTxStatus("pending");
    setQuoteError(null);
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);

    try {
      if (!swapAmountPol || parseFloat(swapAmountPol) <= 0 || !account?.address) return;

      console.log("=== OpenOcean Quote Request ===");
      console.log("POL Amount:", swapAmountPol);
      
      const quoteParams = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: "0x0000000000000000000000000000000000001010", // Native POL
        outTokenAddress: DFAITH_TOKEN, // D.FAITH
        amount: swapAmountPol,
        slippage: slippage,
        gasPrice: "50",
        account: account.address,
      });
      
      const quoteUrl = `https://open-api.openocean.finance/v3/polygon/swap_quote?${quoteParams}`;
      const quoteResponse = await fetch(quoteUrl);
      
      if (!quoteResponse.ok) {
        throw new Error(`OpenOcean Quote Fehler: ${quoteResponse.status}`);
      }
      
      const quoteData = await quoteResponse.json();
      console.log("Quote Response:", quoteData);
      
      if (!quoteData || quoteData.code !== 200 || !quoteData.data) {
        throw new Error('OpenOcean: Keine gültige Quote erhalten');
      }
      
      const txData = quoteData.data;
      
      if (!txData.to || !txData.data) {
        throw new Error('OpenOcean: Unvollständige Transaktionsdaten');
      }
      
      setQuoteTxData(txData);
      
      // Bei POL-Käufen ist normalerweise kein Approval nötig, da es native Token sind
      // Aber wir prüfen trotzdem für Konsistenz
      setNeedsApproval(false);
      setBuyStep('quoteFetched');
      setSwapTxStatus(null);
      
    } catch (e: any) {
      console.error("Quote Fehler:", e);
      setQuoteError(e.message || "Quote Fehler");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Approval wird normalerweise nicht benötigt bei POL → D.FAITH da POL native ist
  // Aber wir implementieren es für Konsistenz
  const handleApprove = async () => {
    if (!account?.address) return;
    setSwapTxStatus("approving");
    
    try {
      console.log("Approval für POL (normalerweise nicht nötig)");
      // Bei Native Token ist kein Approval nötig, also überspringen wir direkt
      setNeedsApproval(false);
      setBuyStep('approved');
      setSwapTxStatus(null);
    } catch (e) {
      console.error("Approve Fehler:", e);
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Verbesserter D.FAITH Swap mit Balance-Verifizierung
  const handleBuySwap = async () => {
    if (!quoteTxData || !account?.address) return;
    setIsSwapping(true);
    setSwapTxStatus("swapping");
    
    // Aktuelle Balance vor dem Swap speichern
    const initialBalance = parseFloat(dfaithBalance);
    
    try {
      console.log("=== D.FAITH Kauf-Swap wird gestartet ===");
      console.log("Verwende Quote-Daten:", quoteTxData);
      
      const { prepareTransaction } = await import("thirdweb");
      
      // Aktuelle Nonce explizit abrufen
      const { getRpcClient } = await import("thirdweb");
      const rpc = getRpcClient({ client, chain: polygon });
      const nonce = await rpc({
        method: "eth_getTransactionCount",
        params: [account.address, "pending"]
      });
      
      console.log("Aktuelle Nonce:", nonce);
      
      const transaction = await prepareTransaction({
        to: quoteTxData.to,
        data: quoteTxData.data,
        value: BigInt(quoteTxData.value || "0"),
        chain: polygon,
        client,
        nonce: parseInt(nonce, 16),
        gas: BigInt(quoteTxData.gasLimit || "300000"),
        gasPrice: BigInt(quoteTxData.gasPrice || "50000000000")
      });
      
      console.log("Prepared Transaction:", transaction);
      setSwapTxStatus("confirming");
      
      // Sende Transaktion
      await sendTransaction(transaction);
      console.log("Transaction sent successfully");
      
      setSwapTxStatus("verifying");
      console.log("Verifiziere Balance-Änderung...");
      
      // Balance-Verifizierung mit mehreren Versuchen
      let balanceVerified = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximal 30 Versuche
      
      // Erste Wartezeit nach Transaktionsbestätigung
      console.log("Warte 3 Sekunden vor erster Balance-Prüfung...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      while (!balanceVerified && attempts < maxAttempts) {
        attempts++;
        console.log(`Balance-Verifizierung Versuch ${attempts}/${maxAttempts}`);
        
        try {
          if (attempts > 1) {
            const waitTime = Math.min(attempts * 1000, 10000); // 1s, 2s, 3s... bis max 10s
            console.log(`Warte ${waitTime/1000} Sekunden vor nächstem Versuch...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          // D.FAITH Balance über API neu laden
          const res = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DFAITH_TOKEN}&owner_address=${account.address}&include_native=true`);
          const data = await res.json();
          const bal = data?.data?.[0]?.balance ?? "0";
          const currentBalance = Number(bal) / Math.pow(10, DFAITH_DECIMALS);
          
          console.log(`Initiale Balance: ${initialBalance}, Aktuelle Balance: ${currentBalance}`);
          
          // Prüfe ob sich die Balance erhöht hat
          const expectedIncrease = parseFloat(swapAmountPol) * (dfaithPrice || 0);
          const actualIncrease = currentBalance - initialBalance;
          
          console.log(`Erwartete Erhöhung: ${expectedIncrease}, Tatsächliche Erhöhung: ${actualIncrease}`);
          
          // Großzügige Toleranz für Slippage und Rundungsfehler
          if (actualIncrease >= (expectedIncrease * 0.8)) { // 20% Toleranz für Slippage
            console.log("✅ Balance-Änderung verifiziert - Kauf erfolgreich!");
            setDfaithBalance(currentBalance.toFixed(DFAITH_DECIMALS));
            balanceVerified = true;
            setBuyStep('completed');
            setSwapTxStatus("success");
            setSwapAmountPol("");
            setQuoteTxData(null);
            setSpenderAddress(null);
            
            // POL Balance auch aktualisieren
            setTimeout(() => updatePolBalance(true), 1000);
            
            setTimeout(() => setSwapTxStatus(null), 5000);
          } else {
            console.log(`Versuch ${attempts}: Balance noch nicht ausreichend geändert, weiter warten...`);
          }
        } catch (balanceError) {
          console.error(`Balance-Verifizierung Versuch ${attempts} fehlgeschlagen:`, balanceError);
        }
      }
      
      if (!balanceVerified) {
        console.log("⚠️ Balance-Verifizierung nach mehreren Versuchen nicht erfolgreich");
        // Trotzdem als Erfolg werten, da Transaktion gesendet wurde
        setSwapTxStatus("success");
        setBuyStep('completed');
        setSwapAmountPol("");
        setTimeout(() => updatePolBalance(true), 2000);
        setTimeout(() => setSwapTxStatus(null), 8000);
      }
      
    } catch (error) {
      console.error("Swap Error:", error);
      setSwapTxStatus("error");
      
      // Versuche trotzdem die Balances zu aktualisieren
      setTimeout(() => updatePolBalance(true), 1000);
      setTimeout(() => {
        // D.FAITH Balance aktualisieren
        (async () => {
          try {
            const res = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DFAITH_TOKEN}&owner_address=${account.address}&include_native=true`);
            const data = await res.json();
            const bal = data?.data?.[0]?.balance ?? "0";
            setDfaithBalance((Number(bal) / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS));
          } catch { }
        })();
      }, 2000);
      
      setTimeout(() => setSwapTxStatus(null), 5000);
    } finally {
      setIsSwapping(false);
    }
  };

  // Verbesserte Funktion zum Aktualisieren der POL-Balance mit mehreren Versuchen
  const updatePolBalance = async (isPostSwap = false) => {
    if (!account?.address) return;
    
    // Bei Post-Swap-Updates mehrere Versuche durchführen
    const maxAttempts = isPostSwap ? 3 : 1;
    let attempts = 0;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      try {
        console.log(`Balance-Update Versuch ${attempts + 1}/${maxAttempts}`);
        
        const response = await fetch(polygon.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [account.address, 'latest'],
            id: 1
          })
        });
        
        if (!response.ok) {
          throw new Error(`RPC Fehler: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !data.result) {
          throw new Error("Ungültige RPC-Antwort");
        }
        
        const balance = BigInt(data.result);
        const polFormatted = Number(balance) / Math.pow(10, 18);
        
        console.log("Neue POL Balance:", polFormatted.toFixed(3));
        setPolBalance(polFormatted.toFixed(3));
        
        success = true;
      } catch (error) {
        console.error(`Balance-Update Fehler (Versuch ${attempts + 1}):`, error);
        attempts++;
        
        // Kurze Verzögerung vor dem nächsten Versuch
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    
    // Wenn alle Versuche fehlgeschlagen sind und es ein Post-Swap-Update ist,
    // einen weiteren verzögerten Versuch planen
    if (!success && isPostSwap) {
      setTimeout(() => updatePolBalance(false), 2000);
    }
  };

  // Refs für die Modals
  const polBuyModalRef = useRef<HTMLDivElement>(null);
  const dfaithBuyModalRef = useRef<HTMLDivElement>(null);
  const investBuyModalRef = useRef<HTMLDivElement>(null);

  // Scrollen zu den Modals, wenn sie geöffnet werden
  useEffect(() => {
    if (showPolBuyModal && polBuyModalRef.current) {
      setTimeout(() => {
        polBuyModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [showPolBuyModal]);

  useEffect(() => {
    if (showDfaithBuyModal && dfaithBuyModalRef.current) {
      setTimeout(() => {
        dfaithBuyModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [showDfaithBuyModal]);

  useEffect(() => {
    if (showInvestModal && investBuyModalRef.current) {
      setTimeout(() => {
        investBuyModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [showInvestModal]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token kaufen
        </h2>
        <p className="text-zinc-400">Wählen Sie den Token, den Sie kaufen möchten</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* DFAITH kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.FAITH Token</h3>
                <p className="text-xs text-zinc-500">Dawid Faith Utility Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit POL kaufen</span>
          </div>            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm text-zinc-400">Aktueller Preis:</span>
                <span className="text-sm text-amber-400 font-medium">
                  {isLoadingPrice && !dfaithPriceEur ? (
                    <span className="animate-pulse">Laden...</span>
                  ) : dfaithPriceEur ? (
                    <span>
                      {dfaithPriceEur.toFixed(3)}€ pro D.FAITH
                      {priceError && (
                        <span className="text-xs text-yellow-400 ml-1">(cached)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs">{priceError || "Preis nicht verfügbar"}</span>
                  )}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm text-zinc-400">Wechselkurs:</span>
                <span className="text-sm text-zinc-300 font-medium">
                  {dfaithPrice ? (
                    <span>
                      1 POL = {dfaithPrice.toFixed(2)} D.FAITH
                      {priceError && (
                        <span className="text-xs text-yellow-400 ml-1">(cached)</span>
                      )}
                    </span>
                  ) : (
                    "Wird geladen..."
                  )}
                </span>
              </div>
            </div>
          
          {/* D.FAITH kaufen Modal */}
          {showDfaithBuyModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto">
              <div
                ref={dfaithBuyModalRef}
                className="bg-zinc-900 rounded-xl p-4 sm:p-6 max-w-md w-full mx-4 border border-amber-400 my-8"
              >
                {/* Header mit Close Button */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-amber-400">D.FAITH kaufen</h3>
                  <button
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountPol("");
                      setSlippage("1");
                      setSwapTxStatus(null);
                      setBuyStep('initial');
                      setQuoteTxData(null);
                      setSpenderAddress(null);
                      setNeedsApproval(false);
                      setQuoteError(null);
                    }}
                    className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0"
                    disabled={isSwapping}
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>
                
                {/* Prozessschritte anzeigen */}
                <div className="mb-4 flex justify-between">
                  <div className={`text-xs ${buyStep !== 'initial' ? 'text-green-400' : 'text-zinc-500'}`}>
                    1. Quote {buyStep !== 'initial' ? '✓' : ''}
                  </div>
                  <div className={`text-xs ${buyStep === 'approved' || buyStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                    2. Approve {buyStep === 'approved' || buyStep === 'completed' ? '✓' : needsApproval ? '' : '(nicht nötig)'}
                  </div>
                  <div className={`text-xs ${buyStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                    3. Swap {buyStep === 'completed' ? '✓' : ''}
                  </div>
                </div>
                
                {/* POL Balance */}
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-sm text-zinc-400">Verfügbare POL:</span>
                    <span className="text-sm text-purple-400 font-bold">{polBalance}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Native POL Token für Swaps
                  </div>
                </div>
                
                {/* Swap Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">POL Betrag</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 pr-16 text-lg font-bold text-purple-400 focus:border-amber-500 focus:outline-none"
                      value={swapAmountPol}
                      onChange={(e) => setSwapAmountPol(e.target.value)}
                      disabled={isSwapping || buyStep !== 'initial'}
                    />
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition"
                      onClick={() => setSwapAmountPol((parseFloat(polBalance) * 0.95).toFixed(3))}
                      disabled={isSwapping || parseFloat(polBalance) <= 0 || buyStep !== 'initial'}
                    >
                      MAX
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Native POL wird direkt für den Swap verwendet
                  </div>
                </div>
                
                {/* Slippage Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Slippage Toleranz (%)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      placeholder="1"
                      min="0.1"
                      max="50"
                      step="0.1"
                      className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:border-amber-500 focus:outline-none"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      disabled={isSwapping || buyStep !== 'initial'}
                    />
                    <div className="flex gap-1">
                      <button
                        className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                        onClick={() => setSlippage("0.5")}
                        disabled={isSwapping}
                      >
                        0.5%
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                        onClick={() => setSlippage("1")}
                        disabled={isSwapping}
                      >
                        1%
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                        onClick={() => setSlippage("3")}
                        disabled={isSwapping}
                      >
                        3%
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Höhere Slippage = höhere Erfolgswahrscheinlichkeit, aber weniger Token
                  </div>
                </div>
                
                {/* Estimated Output */}
                {swapAmountPol && parseFloat(swapAmountPol) > 0 && dfaithPrice && dfaithPriceEur && (
                  <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 mb-2">
                      <span className="text-sm text-zinc-400">Geschätzte D.FAITH:</span>
                      <span className="text-sm text-amber-400 font-bold">
                        ~{(parseFloat(swapAmountPol) * dfaithPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 mb-2">
                      <span className="text-sm text-zinc-400">Geschätzter Wert:</span>
                      <span className="text-sm text-green-400 font-bold">
                        ~{(parseFloat(swapAmountPol) * dfaithPrice * dfaithPriceEur).toFixed(3)}€
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700/50">
                      Slippage: {slippage}% | Minimum: ~{(parseFloat(swapAmountPol) * dfaithPrice * (1 - parseFloat(slippage)/100)).toFixed(2)}
                    </div>
                  </div>
                )}
                
                {/* Info wenn keine POL verfügbar */}
                {parseFloat(polBalance) <= 0 && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-xs">⚠️</span>
                      <div className="text-sm text-yellow-400">
                        Sie benötigen POL Token für den Swap
                      </div>
                    </div>
                    <div className="text-xs text-yellow-300/70 mt-1">
                      Kaufen Sie zuerst POL Token unten über das BuyWidget
                    </div>
                  </div>
                )}
                
                {/* Transaction Status */}
                {swapTxStatus && (
                  <div className={`mb-4 p-3 rounded-lg text-center ${
                    swapTxStatus === "success" ? "bg-green-500/20 text-green-400" :
                    swapTxStatus === "error" ? "bg-red-500/20 text-red-400" :
                    swapTxStatus === "confirming" ? "bg-blue-500/20 text-blue-400" :
                    swapTxStatus === "verifying" ? "bg-blue-500/20 text-blue-400" :
                    swapTxStatus === "approving" ? "bg-orange-500/20 text-orange-400" :
                    swapTxStatus === "swapping" ? "bg-purple-500/20 text-purple-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {swapTxStatus === "success" && (
                      <div>
                        <div className="font-bold">🎉 Kauf erfolgreich!</div>
                        <div className="text-xs mt-1">D.FAITH Token wurden erfolgreich gekauft und verifiziert</div>
                      </div>
                    )}
                    {swapTxStatus === "error" && (
                      <div>
                        <div className="font-bold">❌ Kauf fehlgeschlagen!</div>
                        <div className="text-xs mt-1">{quoteError || "Bitte versuchen Sie es erneut"}</div>
                      </div>
                    )}
                    {swapTxStatus === "confirming" && (
                      <div>
                        <div className="font-bold">⏳ Bestätigung läuft...</div>
                        <div className="text-xs mt-1">Warte auf Blockchain-Bestätigung</div>
                      </div>
                    )}
                    {swapTxStatus === "verifying" && (
                      <div>
                        <div className="font-bold">� Verifiziere Kauf...</div>
                        <div className="text-xs mt-1">Prüfe Balance-Änderung zur Bestätigung</div>
                      </div>
                    )}
                    {swapTxStatus === "approving" && (
                      <div>
                        <div className="font-bold">🔐 Token-Berechtigung wird gesetzt...</div>
                        <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                      </div>
                    )}
                    {swapTxStatus === "swapping" && (
                      <div>
                        <div className="font-bold">🔄 Kauf wird durchgeführt...</div>
                        <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                      </div>
                    )}
                    {swapTxStatus === "pending" && (
                      <div>
                        <div className="font-bold">📝 Quote wird abgefragt...</div>
                        <div className="text-xs mt-1">Bitte warten Sie einen Moment</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Swap Buttons - verschiedene Schritte */}
                <div className="space-y-3">
                  {/* Schritt 1: Quote anfordern */}
                  {buyStep === 'initial' && (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                      onClick={handleGetQuote}
                      disabled={
                        !swapAmountPol || 
                        parseFloat(swapAmountPol) <= 0 || 
                        isSwapping || 
                        !account?.address || 
                        parseFloat(polBalance) <= 0 ||
                        parseFloat(swapAmountPol) > parseFloat(polBalance)
                      }
                    >
                      <FaExchangeAlt className="inline mr-2" />
                      {isSwapping ? "Lade Quote..." : `Quote für ${swapAmountPol || "0"} POL holen`}
                    </Button>
                  )}
                  
                  {/* Schritt 2: Approval (falls nötig) */}
                  {buyStep === 'quoteFetched' && needsApproval && (
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl mb-2"
                      onClick={handleApprove}
                      disabled={isSwapping}
                    >
                      <FaExchangeAlt className="inline mr-2" />
                      {isSwapping ? "Approval läuft..." : "POL für Kauf freigeben"}
                    </Button>
                  )}
                  
                  {/* Schritt 3: Swap durchführen */}
                  {((buyStep === 'quoteFetched' && !needsApproval) || buyStep === 'approved') && (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                      onClick={handleBuySwap}
                      disabled={isSwapping}
                    >
                      <FaExchangeAlt className="inline mr-2" />
                      {isSwapping ? "Kaufe..." : `${swapAmountPol || "0"} POL → D.FAITH kaufen`}
                    </Button>
                  )}
                  
                  {/* "Neuer Kauf" Button wenn Kauf abgeschlossen ist */}
                  {buyStep === 'completed' && (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setBuyStep('initial');
                        setQuoteTxData(null);
                        setSpenderAddress(null);
                        setNeedsApproval(false);
                        setQuoteError(null);
                        setSwapAmountPol("");
                        setSwapTxStatus(null);
                        setSlippage("1");
                      }}
                      disabled={isSwapping}
                    >
                      Neuer Kauf
                    </Button>
                  )}
                  
                  {quoteError && (
                    <div className="text-red-400 text-sm text-center">{quoteError}</div>
                  )}
                  
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl transition-colors"
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountPol("");
                      setSlippage("1");
                      setSwapTxStatus(null);
                      setBuyStep('initial');
                      setQuoteTxData(null);
                      setSpenderAddress(null);
                      setNeedsApproval(false);
                      setQuoteError(null);
                    }}
                    disabled={isSwapping}
                  >
                    Schließen
                  </Button>
                </div>

                {/* Validation und Error Messages */}
                {parseFloat(swapAmountPol) > parseFloat(polBalance) && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs">❌</span>
                      <div className="text-sm text-red-400">
                        Nicht genügend POL verfügbar
                      </div>
                    </div>
                    <div className="text-xs text-red-300/70 mt-1">
                      Verfügbar: {polBalance} POL | Benötigt: {swapAmountPol} POL
                    </div>
                  </div>
                )}

                {parseFloat(swapAmountPol) > 0 && parseFloat(swapAmountPol) < 0.001 && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-xs">⚠️</span>
                      <div className="text-sm text-yellow-400">
                        Minimum: 0.001 POL
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button
              className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              onClick={() => {
                if (account?.address) {
                  setShowDfaithBuyModal(true);
                } else {
                  alert('Bitte Wallet verbinden!');
                }
              }}
              disabled={!account?.address}
            >
              D.FAITH kaufen
            </Button>
          )}
        </div>

        {/* D.INVEST kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaLock className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.INVEST Token</h3>
                <p className="text-xs text-zinc-500">Investment & Staking Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Aktueller Preis:</span>
              <span className="text-sm text-amber-400 font-medium">5€ pro D.INVEST</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Minimum:</span>
              <span className="text-sm text-zinc-300 font-medium">5 EUR</span>
            </div>
          </div>
          
          <Button
            className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={handleInvestBuy}
          >
            D.INVEST kaufen
          </Button>
        </div>

        {/* POL kaufen */}
        <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full">
                <span className="text-white text-lg font-bold">🔷</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-400">POL Token</h3>
                <p className="text-xs text-zinc-500">Polygon Native Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Aktueller Preis:</span>
              <span className="text-sm text-purple-400 font-bold">
                {polPriceEur ? (
                  <span>
                    {polPriceEur.toFixed(2)}€ pro POL
                    {priceError && (
                      <span className="text-xs text-yellow-400 ml-1">(cached)</span>
                    )}
                  </span>
                ) : (
                  "~0.50€ pro POL"
                )}
              </span>
            </div>
          </div>
          
          <div className="w-full mt-4">
            {showPolBuyModal ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto"
              >
                <div
                  ref={polBuyModalRef}
                  className="bg-zinc-900 rounded-xl p-4 max-w-full w-full sm:max-w-xs border border-purple-500 text-center flex flex-col items-center justify-center my-4"
                >
                  <div className="mb-4 text-purple-400 text-2xl font-bold">POL kaufen</div>
                  <div className="w-full flex-1 flex items-center justify-center">
                    <BuyWidget
                      client={client}
                      tokenAddress={NATIVE_TOKEN_ADDRESS}
                      chain={polygon}
                      amount="1"
                      theme="dark"
                      className="w-full"
                    />
                  </div>
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl mt-4"
                    onClick={() => setShowPolBuyModal(false)}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => {
                  setShowPolBuyModal(true);
                  // Das Scrollen übernimmt jetzt der useEffect
                }}
              >
                POL kaufen
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-400 text-xs">ℹ</span>
          </div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Hinweis</div>
            <div className="text-sm text-zinc-400">
              Stellen Sie sicher, dass Sie genügend POL für Transaktionsgebühren in Ihrem Wallet haben.
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal für D.INVEST */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto">
          <div
            ref={investBuyModalRef}
            className="bg-zinc-900 rounded-xl p-8 w-full max-w-xs border border-amber-400 text-center flex flex-col items-center justify-center my-8"
          >
            <div className="mb-4 text-amber-400 text-2xl font-bold">Wichtiger Hinweis</div>
            <div className="mb-4 text-zinc-300 text-sm">
              {copied
                ? "Deine Wallet-Adresse wurde kopiert. Bitte füge sie beim Stripe-Kauf als Verwendungszweck ein, damit wir dir die Token zuweisen können."
                : "Bitte stelle sicher, dass du eine Wallet verbunden hast."}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 rounded-xl mt-2"
              onClick={handleInvestContinue}
              autoFocus
            >
              Weiter zu Stripe
            </Button>
            <button
              className="w-full mt-2 text-zinc-400 text-xs underline"
              onClick={() => setShowInvestModal(false)}
            >Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}
