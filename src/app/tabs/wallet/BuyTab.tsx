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
const POL_TOKEN = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // POL (WMATIC)
const POL_DECIMALS = 18;
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router auf Polygon

export default function BuyTab() {
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number | null>(null);
  const [polPriceEur, setPolPriceEur] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
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

  // D.FAITH Preis von OpenOcean holen und in Euro umrechnen
  useEffect(() => {
    const fetchDfaithPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      let price: number | null = null;
      let priceEur: number | null = null;
      let polEur: number | null = null;
      let errorMsg = "";
      
      try {
        // 1. Hole POL/EUR Preis von CoinGecko
        const polResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
        if (polResponse.ok) {
          const polData = await polResponse.json();
          polEur = polData['polygon-ecosystem-token']?.eur || 0.50; // Fallback zu 0.50€
        } else {
          polEur = 0.50; // Fallback
        }
        
        // 2. Hole D.FAITH Preis von OpenOcean
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
            priceEur = (polEur ?? 0.5) / price; // 1 D.FAITH = POL_EUR / DFAITH_PER_POL
          } else {
            errorMsg = "OpenOcean: Keine Liquidität verfügbar";
          }
        } else {
          errorMsg = `OpenOcean: ${response.status}`;
        }
      } catch (e) {
        console.error("Price fetch error:", e);
        errorMsg = "Preis-API Fehler";
      }
      
      if (price && priceEur && polEur) {
        setDfaithPrice(price);
        setDfaithPriceEur(priceEur);
        setPolPriceEur(polEur);
        setPriceError(null);
      } else {
        setDfaithPrice(null);
        setDfaithPriceEur(null);
        setPolPriceEur(polEur);
        setPriceError(errorMsg || "Preis nicht verfügbar");
      }
      setIsLoadingPrice(false);
    };

    fetchDfaithPrice();
    // Preis nur alle 60 Sekunden (1 Minute) aktualisieren statt alle 30 Sekunden
    // Für noch weniger API-Calls (alle 2 Minuten):
    const interval = setInterval(fetchDfaithPrice, 120000);
    // Oder alle 5 Minuten für sehr seltene Updates:
    // const interval = setInterval(fetchDfaithPrice, 300000);
    return () => clearInterval(interval);
  }, []);

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

  // D.FAITH Swap Funktion mit Transaktionsbestätigung
  const handleDfaithSwap = async () => {
    if (!swapAmountPol || parseFloat(swapAmountPol) <= 0 || !account?.address) return;
    setIsSwapping(true);
    setSwapTxStatus("pending");
    
    try {
      // Step 1: Hole Quote von OpenOcean
      const amountToSend = swapAmountPol;
      
      console.log("=== OpenOcean Quote Request ===");
      console.log("POL Amount:", amountToSend);
      
      const quoteParams = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: "0x0000000000000000000000000000000000001010", // Native POL
        outTokenAddress: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // D.FAITH
        amount: amountToSend,
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
      
      // Step 2: Bereite Transaktion vor
      const { prepareTransaction } = await import("thirdweb");
      const transaction = await prepareTransaction({
        to: txData.to,
        data: txData.data,
        value: BigInt(txData.value || "0"),
        chain: polygon,
        client
      });
      
      console.log("Prepared Transaction:", transaction);
      setSwapTxStatus("confirming");
      
      // Step 3: Sende Transaktion - sendTransaction ist async und gibt Promise<void> zurück
      await sendTransaction(transaction);
      console.log("Transaction sent successfully");
      
      // Bei erfolgreichem Senden
      setSwapTxStatus("success");
      
      // Balance sofort aktualisieren
      setTimeout(() => updatePolBalance(true), 1000);
      setTimeout(() => updatePolBalance(true), 3000);
      
      // Input zurücksetzen
      setSwapAmountPol("");
      
      // Success-Status nach 5 Sekunden ausblenden
      setTimeout(() => {
        setSwapTxStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error("Swap Error:", error);
      setSwapTxStatus("error");
      
      // Error-Status nach 5 Sekunden ausblenden
      setTimeout(() => {
        setSwapTxStatus(null);
      }, 5000);
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
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Aktueller Preis:</span>
              <span className="text-sm text-amber-400 font-medium">
                {isLoadingPrice ? (
                  <span className="animate-pulse">Laden...</span>
                ) : priceError ? (
                  <span className="text-red-400 text-xs">{priceError}</span>
                ) : dfaithPriceEur ? (
                  `${dfaithPriceEur.toFixed(3)}€ pro D.FAITH`
                ) : (
                  "Preis nicht verfügbar"
                )}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Wechselkurs:</span>
              <span className="text-sm text-zinc-300 font-medium">
                {dfaithPrice ? `1 POL = ${dfaithPrice.toFixed(2)} D.FAITH` : "Wird geladen..."}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Minimum:</span>
              <span className="text-sm text-zinc-300 font-medium">0.001 POL</span>
            </div>
          </div>
          
          {/* D.FAITH kaufen Modal */}
          {showDfaithBuyModal ? (
            <div className="fixed inset-0 z-50 flex items-start justify-center min-h-screen bg-black/60 overflow-y-auto">
              <div
                ref={dfaithBuyModalRef}
                className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-amber-400 my-8 mt-12 flex flex-col items-center justify-center"
              >
                <div className="mb-6 text-amber-400 text-2xl font-bold text-center">D.FAITH kaufen</div>
                
                {/* POL Balance */}
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Verfügbare POL:</span>
                    <span className="text-purple-400 font-bold">{polBalance}</span>
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
                      className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 text-lg font-bold text-purple-400 focus:border-amber-500 focus:outline-none"
                      value={swapAmountPol}
                      onChange={(e) => setSwapAmountPol(e.target.value)}
                      disabled={isSwapping}
                    />
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition"
                      onClick={() => setSwapAmountPol((parseFloat(polBalance) * 0.95).toFixed(3))}
                      disabled={isSwapping || parseFloat(polBalance) <= 0}
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
                      disabled={isSwapping}
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
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {swapTxStatus === "success" && (
                      <div>
                        <div className="font-bold">🎉 Swap erfolgreich!</div>
                        <div className="text-xs mt-1">Token wurden erfolgreich getauscht</div>
                      </div>
                    )}
                    {swapTxStatus === "error" && (
                      <div>
                        <div className="font-bold">❌ Swap fehlgeschlagen!</div>
                        <div className="text-xs mt-1">Bitte versuchen Sie es erneut</div>
                      </div>
                    )}
                    {swapTxStatus === "confirming" && (
                      <div>
                        <div className="font-bold">⏳ Bestätigung läuft...</div>
                        <div className="text-xs mt-1">Warte auf Blockchain-Bestätigung</div>
                      </div>
                    )}
                    {swapTxStatus === "pending" && (
                      <div>
                        <div className="font-bold">📝 Transaktion wird vorbereitet...</div>
                        <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Swap Button */}
                <div className="space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    onClick={handleDfaithSwap}
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
                    {isSwapping ? (
                      swapTxStatus === "pending" ? "Bereite Swap vor..." :
                      swapTxStatus === "confirming" ? "Bestätige Transaktion..." :
                      "Swapping..."
                    ) : parseFloat(polBalance) <= 0 ? 
                      "Keine POL verfügbar" :
                    parseFloat(swapAmountPol) > parseFloat(polBalance) ?
                      "Nicht genügend POL" :
                    swapAmountPol ? 
                      `${swapAmountPol} POL → D.FAITH` : 
                      "Betrag eingeben"
                    }
                  </Button>
                  
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl transition-colors"
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountPol("");
                      setSlippage("1");
                      setSwapTxStatus(null);
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
                <span className="text-purple-400 text-lg font-bold">POL</span>
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
                {polPriceEur ? `${polPriceEur.toFixed(3)}€ pro POL` : "~0.500€ pro POL"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-zinc-400">Minimum:</span>
              <span className="text-sm text-zinc-300 font-medium">1 EUR</span>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center min-h-screen bg-black/60 overflow-y-auto">
          <div
            ref={investBuyModalRef}
            className="bg-zinc-900 rounded-xl p-8 w-full max-w-xs border border-amber-400 text-center flex flex-col items-center justify-center my-8 mt-12"
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
