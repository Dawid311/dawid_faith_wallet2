import { useEffect, useState, useRef } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt, FaSync, FaRegCopy } from "react-icons/fa";
import { useActiveAccount, useSendTransaction, BuyWidget } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { NATIVE_TOKEN_ADDRESS, getContract, prepareContractCall, sendAndConfirmTransaction, readContract } from "thirdweb";
import { client } from "../../client";
import { balanceOf, approve } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0xEE27258975a2DA946CD5025134D70E5E24F6789F"; // D.FAITH Token auf Base
const DFAITH_DECIMALS = 2; // Dezimalstellen
const DINVEST_TOKEN = "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383"; // D.INVEST Token auf Base
const DINVEST_DECIMALS = 0; // D.INVEST hat keine Dezimalstellen
const ETH_TOKEN = "0x0000000000000000000000000000000000000000"; // Native ETH
const ETH_DECIMALS = 18;

export default function BuyTab() {
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number | null>(null);
  const [ethPriceEur, setEthPriceEur] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [lastKnownPrices, setLastKnownPrices] = useState<{
    dfaith?: number;
    dfaithEur?: number;
    ethEur?: number;
    timestamp?: number;
  }>({});
  const account = useActiveAccount();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showEthBuyModal, setShowEthBuyModal] = useState(false);
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
            if (parsed.ethEur) setEthPriceEur(parsed.ethEur);
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
      let ethEur: number | null = null;
      let dfaithPriceEur: number | null = null;
      let errorMsg = "";
      
      try {
        // 1. Hole ETH/EUR Preis von CoinGecko
        try {
          const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur');
          if (ethResponse.ok) {
            const ethData = await ethResponse.json();
            ethEur = ethData['ethereum']?.eur;
            if (ethEur) {
              // Auf 2 Dezimalstellen runden
              ethEur = Math.round(ethEur * 100) / 100;
            }
          }
        } catch (e) {
          console.log('ETH Preis Fehler:', e);
        }
        
        // Fallback auf letzten bekannten ETH Preis
        if (!ethEur && lastKnownPrices.ethEur) {
          ethEur = lastKnownPrices.ethEur;
        } else if (!ethEur) {
          ethEur = 3000; // Hard fallback für ETH
        }
        
        // 2. Hole D.FAITH Preis von OpenOcean für Base Chain
        try {
          const params = new URLSearchParams({
            chain: "base",
            inTokenAddress: "0x0000000000000000000000000000000000000000", // Native ETH
            outTokenAddress: DFAITH_TOKEN,
            amount: "1", // 1 ETH
            gasPrice: "50",
          });
          
          const response = await fetch(`https://open-api.openocean.finance/v3/base/quote?${params}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log("OpenOcean Response:", data);
            if (data && data.data && data.data.outAmount && data.data.outAmount !== "0") {
              // outAmount ist in D.FAITH (mit 2 Decimals)
              const dfaithAmount = Number(data.data.outAmount) / Math.pow(10, DFAITH_DECIMALS);
              setDfaithPrice(dfaithAmount);
              // Berechne EUR Preis: (D.FAITH pro ETH) * (ETH Preis in EUR) = D.FAITH Preis in EUR
              if (ethEur) {
                dfaithPriceEur = ethEur / dfaithAmount; // 1 D.FAITH = ETH_EUR / DFAITH_PER_ETH
              }
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
        if (!dfaithPrice && lastKnownPrices.dfaith) {
          setDfaithPrice(lastKnownPrices.dfaith);
          errorMsg = "";
        }
        if (!dfaithPriceEur && lastKnownPrices.dfaithEur) {
          dfaithPriceEur = lastKnownPrices.dfaithEur;
          errorMsg = "";
        }
        
      } catch (e) {
        console.error("Price fetch error:", e);
        errorMsg = "Preis-API Fehler";
        
        // Verwende letzte bekannte Preise als Fallback
        if (lastKnownPrices.dfaith) setDfaithPrice(lastKnownPrices.dfaith);
        if (lastKnownPrices.dfaithEur) dfaithPriceEur = lastKnownPrices.dfaithEur;
        if (lastKnownPrices.ethEur) ethEur = lastKnownPrices.ethEur;
        
        if (dfaithPrice && dfaithPriceEur && ethEur) {
          errorMsg = ""; // Kein Fehler anzeigen wenn Fallback verfügbar
        }
      }
      
      // Setze Preise (entweder neue oder Fallback)
      if (ethEur) setEthPriceEur(ethEur);
      if (dfaithPriceEur) setDfaithPriceEur(dfaithPriceEur);
      
      // Speichere erfolgreiche Preise
      if (dfaithPrice && dfaithPriceEur && ethEur) {
        const newPrices = {
          dfaith: dfaithPrice,
          dfaithEur: dfaithPriceEur,
          ethEur: ethEur,
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
  }, [lastKnownPrices.dfaith, lastKnownPrices.dfaithEur, lastKnownPrices.ethEur]);

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
  const [swapAmountEth, setSwapAmountEth] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [ethBalance, setEthBalance] = useState("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxStatus, setSwapTxStatus] = useState<string | null>(null);

  // ETH Balance laden (auf 3 Stellen)
  useEffect(() => {
    const fetchEthBalance = async () => {
      if (!account?.address) {
        console.log("No account connected");
        return;
      }
      try {
        console.log("Fetching native ETH balance for:", account.address);
        
        const balance = await readContract({
          contract: getContract({
            client,
            chain: base,
            address: "0x0000000000000000000000000000000000000000"
          }),
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address]
        }).catch(async () => {
          const response = await fetch(base.rpc, {
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
        
        console.log("Native ETH Balance raw:", balance.toString());
        
        const ethFormatted = Number(balance) / Math.pow(10, 18);
        console.log("Native ETH formatted:", ethFormatted);
        
        // Auf 3 Stellen formatieren
        setEthBalance(ethFormatted.toFixed(3));
        
      } catch (error) {
        console.error("Fehler beim Laden der ETH Balance:", error);
        setEthBalance("0");
      }
    };
    
    fetchEthBalance();
    const interval = setInterval(fetchEthBalance, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // D.FAITH Balance und D.INVEST Balance von der Insight API laden
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [dinvestBalance, setDinvestBalance] = useState("0");

      // Neue Funktion für Balance via Thirdweb Insight API für Base Chain
  const fetchTokenBalanceViaInsightApi = async (
    tokenAddress: string,
    accountAddress: string
  ): Promise<string> => {
    if (!accountAddress) return "0";
    try {
      const params = new URLSearchParams({
        chain_id: "8453", // Base Chain ID
        token_address: tokenAddress,
        owner_address: accountAddress,
        include_native: "true",
        resolve_metadata_links: "true",
        include_spam: "false",
        limit: "50",
        metadata: "false",
      });
      
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
        console.error("BuyTab: Insight API konnte keine JSON-Antwort parsen:", jsonErr);
        data = null;
      }
      
      if (!res.ok) {
        console.error("BuyTab: Insight API Fehlerstatus:", res.status, res.statusText);
        console.error("BuyTab: Insight API Fehlerantwort:", JSON.stringify(data, null, 2));
        throw new Error("API Error");
      }
      
      const balance = data?.data?.[0]?.balance ?? "0";
      return balance;
    } catch (e) {
      console.error("BuyTab: Insight API Fehler:", e);
      return "0";
    }
  };

  // Balances laden
  useEffect(() => {
    const loadBalances = async () => {
      if (!account?.address) {
        setDfaithBalance("0.00");
        setDinvestBalance("0");
        return;
      }
      
      try {
        // D.FAITH Balance laden
        const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
        const dfaithRaw = Number(dfaithValue);
        const dfaithDisplay = (dfaithRaw / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS);
        setDfaithBalance(dfaithDisplay);
        
        // D.INVEST Balance laden  
        const dinvestValue = await fetchTokenBalanceViaInsightApi(DINVEST_TOKEN, account.address);
        setDinvestBalance(Math.floor(Number(dinvestValue)).toString());
        
      } catch (error) {
        console.error("BuyTab: Fehler beim Laden der Token-Balances:", error);
        setDfaithBalance("0.00");
        setDinvestBalance("0");
      }
    };
    
    loadBalances();
    
    // Balance alle 30 Sekunden aktualisieren
    const interval = setInterval(loadBalances, 30000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // D.FAITH Swap Funktion mit mehrstufigem Prozess angepasst für Base Chain
  const handleGetQuote = async () => {
    setSwapTxStatus("pending");
    setQuoteError(null);
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);

    try {
      if (!swapAmountEth || parseFloat(swapAmountEth) <= 0 || !account?.address) return;

      console.log("=== OpenOcean Quote Request für Base ===");
      console.log("ETH Amount:", swapAmountEth);
      
      const quoteParams = new URLSearchParams({
        chain: "base",
        inTokenAddress: "0x0000000000000000000000000000000000000000", // Native ETH
        outTokenAddress: DFAITH_TOKEN, // D.FAITH
        amount: swapAmountEth,
        slippage: slippage,
        gasPrice: "50",
        account: account.address,
      });
      
      const quoteUrl = `https://open-api.openocean.finance/v3/base/swap_quote?${quoteParams}`;
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
      
      // Bei ETH-Käufen ist normalerweise kein Approval nötig, da es native Token sind
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

  // Approval wird normalerweise nicht benötigt bei ETH → D.FAITH da ETH native ist
  const handleApprove = async () => {
    if (!account?.address) return;
    setSwapTxStatus("approving");
    
    try {
      console.log("Approval für ETH (normalerweise nicht nötig)");
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

  // Verbesserter D.FAITH Swap mit ETH-Balance-Verifizierung für Base Chain
  const handleBuySwap = async () => {
    if (!quoteTxData || !account?.address) return;
    setIsSwapping(true);
    setSwapTxStatus("swapping");
    
    // Aktuelle ETH-Balance vor dem Swap speichern
    const initialEthBalance = parseFloat(ethBalance);
    const ethAmount = parseFloat(swapAmountEth);
    
    try {
      console.log("=== D.FAITH Kauf-Swap wird gestartet auf Base ===");
      console.log("Verwende Quote-Daten:", quoteTxData);
      
      const { prepareTransaction } = await import("thirdweb");
      
      // Aktuelle Nonce explizit abrufen
      const { getRpcClient } = await import("thirdweb");
      const rpc = getRpcClient({ client, chain: base });
      const nonce = await rpc({
        method: "eth_getTransactionCount",
        params: [account.address, "pending"]
      });
      
      console.log("Aktuelle Nonce:", nonce);
      
      const transaction = await prepareTransaction({
        to: quoteTxData.to,
        data: quoteTxData.data,
        value: BigInt(quoteTxData.value || "0"),
        chain: base,
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
      console.log("Verifiziere ETH-Balance-Änderung...");
      
      // ETH-Balance-Verifizierung mit mehreren Versuchen
      let balanceVerified = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximal 30 Versuche
      
      // Erste Wartezeit nach Transaktionsbestätigung
      console.log("Warte 3 Sekunden vor erster Balance-Prüfung...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      while (!balanceVerified && attempts < maxAttempts) {
        attempts++;
        console.log(`ETH-Balance-Verifizierung Versuch ${attempts}/${maxAttempts}`);
        
        try {
          if (attempts > 1) {
            const waitTime = Math.min(attempts * 1000, 10000); // 1s, 2s, 3s... bis max 10s
            console.log(`Warte ${waitTime/1000} Sekunden vor nächstem Versuch...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          // ETH-Balance neu laden
          const response = await fetch(base.rpc, {
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
          const ethRaw = data?.result ? BigInt(data.result) : BigInt(0);
          const currentEthBalance = Number(ethRaw) / Math.pow(10, 18);
          
          console.log(`Initiale ETH-Balance: ${initialEthBalance}, Aktuelle ETH-Balance: ${currentEthBalance}`);
          
          // Prüfe ob sich die ETH-Balance um mindestens den Kaufbetrag verringert hat (mit 10% Toleranz für Fees)
          const expectedDecrease = ethAmount;
          const actualDecrease = initialEthBalance - currentEthBalance;
          
          console.log(`Erwartete Verringerung: ${expectedDecrease}, Tatsächliche Verringerung: ${actualDecrease}`);
          
          if (actualDecrease >= (expectedDecrease * 0.9)) { // 10% Toleranz
            console.log("✅ ETH-Balance-Änderung verifiziert - Kauf erfolgreich!");
            setEthBalance(currentEthBalance.toFixed(3));
            balanceVerified = true;
            setBuyStep('completed');
            setSwapTxStatus("success");
            setSwapAmountEth("");
            setQuoteTxData(null);
            setSpenderAddress(null);
            // D.FAITH Balance auch aktualisieren
            setTimeout(async () => {
              try {
                const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
                const dfaithRaw = Number(dfaithValue);
                const dfaithDisplay = (dfaithRaw / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS);
                setDfaithBalance(dfaithDisplay);
              } catch (error) {
                console.error("Fehler beim Aktualisieren der D.FAITH Balance nach Swap:", error);
              }
            }, 1000);
            setTimeout(() => setSwapTxStatus(null), 5000);
          } else {
            console.log(`Versuch ${attempts}: ETH-Balance noch nicht ausreichend geändert, weiter warten...`);
          }
        } catch (balanceError) {
          console.error(`ETH-Balance-Verifizierung Versuch ${attempts} fehlgeschlagen:`, balanceError);
        }
      }
      
      if (!balanceVerified) {
        console.log("⚠️ ETH-Balance-Verifizierung nach mehreren Versuchen nicht erfolgreich");
        setSwapTxStatus("success");
        setBuyStep('completed');
        setSwapAmountEth("");
        setTimeout(() => setSwapTxStatus(null), 8000);
      }
      
    } catch (error) {
      console.error("Swap Error:", error);
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 5000);
    } finally {
      setIsSwapping(false);
    }
  };

  // Refs für die Modals
  const ethBuyModalRef = useRef<HTMLDivElement>(null);
  const dfaithBuyModalRef = useRef<HTMLDivElement>(null);
  const investBuyModalRef = useRef<HTMLDivElement>(null);

  // Scrollen zu den Modals, wenn sie geöffnet werden
  useEffect(() => {
    if (showEthBuyModal && ethBuyModalRef.current) {
      setTimeout(() => {
        ethBuyModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [showEthBuyModal]);

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
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit ETH kaufen</span>
          </div>
          <div className="space-y-4">
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
                      1 ETH = {dfaithPrice.toFixed(2)} D.FAITH
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
                className="bg-zinc-900 rounded-xl p-4 sm:p-6 max-w-sm w-full mx-2 border border-amber-400 my-4 max-h-[90vh] overflow-y-auto flex flex-col"
                style={{ boxSizing: 'border-box' }}
              >
                {/* Header mit Close Button */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg sm:text-2xl font-bold text-amber-400">D.FAITH kaufen</h3>
                  <button
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountEth("");
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
                <div className="mb-3 flex justify-between text-xs">
                  <div className={` ${buyStep !== 'initial' ? 'text-green-400' : 'text-zinc-500'}`}>1. Quote {buyStep !== 'initial' ? '✓' : ''}</div>
                  <div className={` ${buyStep === 'approved' || buyStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>2. Approve {buyStep === 'approved' || buyStep === 'completed' ? '✓' : needsApproval ? '' : '(nötig)'}</div>
                  <div className={` ${buyStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>3. Swap {buyStep === 'completed' ? '✓' : ''}</div>
                </div>

                {/* Kompakte Inputzeile: ETH-Balance als Badge, Input */}
                <div className="flex gap-2 items-center mb-3 w-full">
                  {/* ETH-Balance Badge */}
                  <div className="flex items-center gap-1 bg-blue-900/60 border border-blue-500 rounded-lg px-3 py-2 text-blue-300 font-bold text-sm whitespace-nowrap">
                    <span className="text-blue-400 text-base">⟠</span>
                    <span>{ethBalance}</span>
                    <span className="text-xs font-normal ml-1">ETH</span>
                  </div>
                  {/* ETH Input - jetzt mit mehr Platz */}
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Betrag"
                    className="flex-grow bg-zinc-800 border border-zinc-600 rounded-lg py-3 px-3 text-base font-bold text-blue-400 focus:border-amber-500 focus:outline-none"
                    value={swapAmountEth}
                    onChange={e => setSwapAmountEth(e.target.value)}
                    disabled={isSwapping || buyStep !== 'initial'}
                    style={{ minWidth: '120px' }}
                  />
                  <button
                    className="text-xs px-2 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition font-bold"
                    onClick={() => setSwapAmountEth((parseFloat(ethBalance) * 0.95).toFixed(3))}
                    disabled={isSwapping || parseFloat(ethBalance) <= 0 || buyStep !== 'initial'}
                    style={{ minWidth: 'unset' }}
                  >MAX</button>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mb-3">
                  <span>Verfügbar: <span className="text-blue-400 font-bold">{ethBalance} ETH</span></span>
                </div>

                {/* Slippage */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Slippage Toleranz (%)</label>
                  <div className="flex gap-2">
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
                        disabled={isSwapping || buyStep !== 'initial'}
                      >
                        0.5%
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                        onClick={() => setSlippage("1")}
                        disabled={isSwapping || buyStep !== 'initial'}
                      >
                        1%
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                        onClick={() => setSlippage("3")}
                        disabled={isSwapping || buyStep !== 'initial'}
                      >
                        3%
                      </button>
                    </div>
                  </div>
                </div>

                {/* Estimated Output */}
                {swapAmountEth && parseFloat(swapAmountEth) > 0 && dfaithPrice && dfaithPriceEur && (
                  <div className="mb-3 p-3 bg-zinc-800/50 rounded text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-400">~D.FAITH:</span>
                      <span className="text-amber-400 font-bold">{(parseFloat(swapAmountEth) * dfaithPrice).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-400">~Wert:</span>
                      <span className="text-green-400 font-bold">{(parseFloat(swapAmountEth) * dfaithPrice * dfaithPriceEur).toFixed(2)}€</span>
                    </div>
                  </div>
                )}

                {/* Status/Fehler kompakt */}
                {swapTxStatus && (
                  <div className={`mb-3 p-2 rounded text-center text-xs ${
                    swapTxStatus === "success" ? "bg-green-500/20 text-green-400" :
                    swapTxStatus === "error" ? "bg-red-500/20 text-red-400" :
                    swapTxStatus === "confirming" ? "bg-blue-500/20 text-blue-400" :
                    swapTxStatus === "verifying" ? "bg-blue-500/20 text-blue-400" :
                    swapTxStatus === "approving" ? "bg-orange-500/20 text-orange-400" :
                    swapTxStatus === "swapping" ? "bg-purple-500/20 text-purple-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {swapTxStatus === "success" && <div><b>🎉 Kauf erfolgreich!</b><div className="mt-1">D.FAITH gekauft</div></div>}
                    {swapTxStatus === "error" && <div><b>❌ Kauf fehlgeschlagen!</b><div className="mt-1">{quoteError || "Bitte erneut versuchen"}</div></div>}
                    {swapTxStatus === "confirming" && <div><b>⏳ Bestätigung...</b></div>}
                    {swapTxStatus === "verifying" && <div><b>🔎 Verifiziere...</b></div>}
                    {swapTxStatus === "approving" && <div><b>🔐 Approval...</b></div>}
                    {swapTxStatus === "swapping" && <div><b>🔄 Swap läuft...</b></div>}
                    {swapTxStatus === "pending" && <div><b>📝 Quote wird geholt...</b></div>}
                  </div>
                )}

                {/* Swap Buttons */}
                <div className="space-y-2">
                  {buyStep === 'initial' && (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl text-base"
                      onClick={handleGetQuote}
                      disabled={
                        !swapAmountEth || 
                        parseFloat(swapAmountEth) <= 0 || 
                        isSwapping || 
                        !account?.address || 
                        parseFloat(ethBalance) <= 0 ||
                        parseFloat(swapAmountEth) > parseFloat(ethBalance)
                      }
                    >
                      <FaExchangeAlt className="inline mr-1" />
                      {isSwapping ? "Lade Quote..." : `Quote holen`}
                    </Button>
                  )}
                  {buyStep === 'quoteFetched' && needsApproval && (
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-base"
                      onClick={handleApprove}
                      disabled={isSwapping}
                    >
                      <FaExchangeAlt className="inline mr-1" />
                      {isSwapping ? "Approval läuft..." : "ETH freigeben"}
                    </Button>
                  )}
                  {((buyStep === 'quoteFetched' && !needsApproval) || buyStep === 'approved') && (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl text-base"
                      onClick={handleBuySwap}
                      disabled={isSwapping}
                    >
                      <FaExchangeAlt className="inline mr-1" />
                      {isSwapping ? "Kaufe..." : `${swapAmountEth || "0"} ETH → D.FAITH`}
                    </Button>
                  )}
                  {buyStep === 'completed' && (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-xl text-base"
                      onClick={() => {                      setBuyStep('initial');
                      setQuoteTxData(null);
                      setSpenderAddress(null);
                      setNeedsApproval(false);
                      setQuoteError(null);
                      setSwapAmountEth("");
                      setSwapTxStatus(null);
                      setSlippage("1");
                      }}
                      disabled={isSwapping}
                    >
                      Neuer Kauf
                    </Button>
                  )}
                  {quoteError && (
                    <div className="text-red-400 text-xs text-center">{quoteError}</div>
                  )}
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-lg text-xs"
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountEth("");
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

                {/* Validation kompakt */}
                {parseFloat(swapAmountEth) > parseFloat(ethBalance) && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-red-400">❌</span>
                      <span>Nicht genügend ETH</span>
                    </div>
                    <div className="text-[10px] text-red-300/70 mt-1">Verfügbar: {ethBalance} | Benötigt: {swapAmountEth}</div>
                  </div>
                )}
                {parseFloat(swapAmountEth) > 0 && parseFloat(swapAmountEth) < 0.001 && (
                  <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⚠️</span>
                      <span>Minimum: 0.001 ETH</span>
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

        {/* ETH kaufen */}
        <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full">
                <span className="text-white text-lg font-bold">⟠</span>
              </div>
              <div>
                <h3 className="font-bold text-blue-400">ETH Token</h3>
                <p className="text-xs text-zinc-500">Ethereum Native Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Aktueller Preis:</span>
              <span className="text-sm text-blue-400 font-bold">
                {ethPriceEur ? (
                  <span>
                    {ethPriceEur.toFixed(2)}€ pro ETH
                    {priceError && (
                      <span className="text-xs text-yellow-400 ml-1">(cached)</span>
                    )}
                  </span>
                ) : (
                  "~3000€ pro ETH"
                )}
              </span>
            </div>
          </div>
          
          <div className="w-full mt-4">
            {showEthBuyModal ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto"
              >
                <div
                  ref={ethBuyModalRef}
                  className="bg-zinc-900 rounded-xl p-4 max-w-full w-full sm:max-w-xs border border-blue-500 text-center flex flex-col items-center justify-center my-4"
                >
                  <div className="mb-4 text-blue-400 text-2xl font-bold">ETH kaufen</div>
                  <div className="w-full flex-1 flex items-center justify-center">
                    <BuyWidget
                      client={client}
                      tokenAddress={NATIVE_TOKEN_ADDRESS}
                      chain={base}
                      amount="1"
                      theme="dark"
                      className="w-full"
                    />
                  </div>
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl mt-4"
                    onClick={() => setShowEthBuyModal(false)}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => {
                  setShowEthBuyModal(true);
                  // Das Scrollen übernimmt jetzt der useEffect
                }}
              >
                ETH kaufen
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
              Stellen Sie sicher, dass Sie genügend ETH für Transaktionsgebühren in Ihrem Wallet haben.
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
