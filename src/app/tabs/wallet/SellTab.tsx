import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaExchangeAlt, FaArrowDown } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { balanceOf } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060";
const DFAITH_DECIMALS = 2;
const DINVEST_TOKEN = "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383";
const DINVEST_DECIMALS = 0;

export default function SellTab() {
  const [sellAmount, setSellAmount] = useState("");
  const [dfaithBalance, setDfaithBalance] = useState("0");
  const [dinvestBalance, setDinvestBalance] = useState("0");
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [polPriceEur, setPolPriceEur] = useState<number | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [slippage, setSlippage] = useState("1");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxStatus, setSwapTxStatus] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [quoteTxData, setQuoteTxData] = useState<any>(null);
  const [spenderAddress, setSpenderAddress] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Neuer State für prozessschritte
  const [sellStep, setSellStep] = useState<'initial' | 'quoteFetched' | 'approved' | 'completed'>('initial');
  
  // Korrekte API-Funktion für Balance-Abfrage
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
      const url = `https://insight.thirdweb.com/v1/tokens?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-client-id": process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
        },
      });
      
      if (!res.ok) {
        console.error("Insight API Fehlerstatus:", res.status, res.statusText);
        throw new Error("API Error");
      }
      
      const data = await res.json();
      const balance = data?.data?.[0]?.balance ?? "0";
      return balance;
    } catch (e) {
      console.error("Insight API Fehler:", e);
      return "0";
    }
  };
  
  // D.FAITH & D.INVEST Balance laden
  useEffect(() => {
    let isMounted = true;
    let latestRequest = 0;

    const fetchBalances = async () => {
      const requestId = ++latestRequest;
      if (!account?.address) {
        if (isMounted) setDfaithBalance("0");
        if (isMounted) setDinvestBalance("0");
        return;
      }
      
      try {
        // D.FAITH
        const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
        const dfaithRaw = Number(dfaithValue);
        const dfaithDisplay = (dfaithRaw / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS);
        
        if (isMounted && requestId === latestRequest) {
          setDfaithBalance(dfaithDisplay);
        }

        // D.INVEST
        const dinvestValue = await fetchTokenBalanceViaInsightApi(DINVEST_TOKEN, account.address);
        if (isMounted && requestId === latestRequest) {
          setDinvestBalance(Math.floor(Number(dinvestValue)).toString());
        }
      } catch (error) {
        console.error("Fehler beim Laden der Balances:", error);
        if (isMounted) {
          setDfaithBalance("0");
          setDinvestBalance("0");
        }
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account?.address]);

  // Preis laden (umgekehrte Richtung - D.FAITH zu POL)
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      try {
        const polResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
        if (polResponse.ok) {
          const polData = await polResponse.json();
          setPolPriceEur(polData['polygon-ecosystem-token']?.eur || 0.50);
        }
        const params = new URLSearchParams({
          chain: "polygon",
          inTokenAddress: DFAITH_TOKEN,
          outTokenAddress: "0x0000000000000000000000000000000000001010",
          amount: "1",
          gasPrice: "50",
        });
        const response = await fetch(`https://open-api.openocean.finance/v3/polygon/quote?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.outAmount && data.data.outAmount !== "0") {
            const polPerDfaith = Number(data.data.outAmount) / Math.pow(10, 18);
            setDfaithPrice(polPerDfaith);
          } else {
            setPriceError("Keine Liquidität für Verkauf verfügbar");
          }
        } else {
          setPriceError(`Preis-API Fehler: ${response.status}`);
        }
      } catch (error) {
        console.error("Price fetch error:", error);
        setPriceError("Preis-API Fehler");
      }
      setIsLoadingPrice(false);
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSellClick = () => {
    if (!account?.address) {
      alert('Bitte Wallet verbinden!');
      return;
    }
    if (parseFloat(dfaithBalance) <= 0) {
      alert('Keine D.FAITH Token zum Verkaufen verfügbar!');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowSellModal(true);
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);
    setQuoteError(null);
    setSwapTxStatus(null);
    setSellStep('initial');
  };

  // Funktion um eine Verkaufs-Quote zu erhalten
  const handleGetQuote = async () => {
    setSwapTxStatus("pending");
    setQuoteError(null);
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);

    try {
      if (!sellAmount || parseFloat(sellAmount) <= 0 || !account?.address) return;

      // Erster Schritt: Quote von OpenOcean API holen
      console.log("1. Quote anfordern für", sellAmount, "D.FAITH");
      
      const params = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: DFAITH_TOKEN,
        outTokenAddress: "0x0000000000000000000000000000000000001010",
        amount: sellAmount,
        slippage: slippage,
        gasPrice: "50",
        account: account.address,
      });
      const url = `https://open-api.openocean.finance/v3/polygon/swap_quote?${params}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OpenOcean API Fehler: ${response.status}`);
      const data = await response.json();
      if (!data || !data.data) throw new Error("OpenOcean: Keine Daten erhalten");
      const txData = data.data;
      
      console.log("Quote erhalten:", txData);

      // Spenderadresse fest auf die OpenOcean Router Adresse setzen
      const spender = "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64";
      setQuoteTxData(txData);
      setSpenderAddress(spender);

      // Zweiter Schritt: Prüfen, ob Approval nötig ist
      console.log("2. Prüfe Approval für", spender);
      
      const allowanceParams = new URLSearchParams({
        chain: "polygon",
        account: account.address,
        inTokenAddress: DFAITH_TOKEN
      });
      const allowanceUrl = `https://open-api.openocean.finance/v3/polygon/allowance?${allowanceParams}`;
      const allowanceResponse = await fetch(allowanceUrl);
      let allowanceValue = "0";
      if (allowanceResponse.ok) {
        const allowanceData = await allowanceResponse.json();
        console.log("Allowance Daten:", allowanceData);
        
        if (allowanceData && allowanceData.data !== undefined && allowanceData.data !== null) {
          if (typeof allowanceData.data === "object") {
            if (Array.isArray(allowanceData.data)) {
              const first = allowanceData.data[0];
              if (typeof first === "object" && first !== null) {
                const values = Object.values(first);
                if (values.length > 0) allowanceValue = values[0]?.toString() ?? "0";
              }
            } else {
              const values = Object.values(allowanceData.data);
              if (values.length > 0) allowanceValue = values[0]?.toString() ?? "0";
            }
          } else {
            allowanceValue = allowanceData.data.toString();
          }
        }
        
        console.log("Aktuelle Allowance:", allowanceValue);
        
        let currentAllowance: bigint;
        try {
          currentAllowance = BigInt(allowanceValue);
        } catch {
          currentAllowance = BigInt(0);
        }
        const amountInWei = (parseFloat(sellAmount) * Math.pow(10, DFAITH_DECIMALS)).toFixed(0);
        const requiredAmount = BigInt(amountInWei);

        console.log("Benötigte Allowance:", requiredAmount.toString());
        console.log("Aktuelle Allowance:", currentAllowance.toString());
        
        if (currentAllowance < requiredAmount) {
          console.log("Approval nötig");
          setNeedsApproval(true);
        } else {
          console.log("Approval bereits vorhanden");
          setNeedsApproval(false);
        }
      } else {
        console.log("Fehler beim Abrufen der Allowance - setze Approval als nötig");
        setNeedsApproval(true);
      }
      
      setSellStep('quoteFetched');
      setSwapTxStatus(null);
    } catch (e: any) {
      console.error("Quote Fehler:", e);
      setQuoteError(e.message || "Quote Fehler");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Funktion um die Tokens für den Swap freizugeben (Approve)
  const handleApprove = async () => {
    if (!spenderAddress || !account?.address) return;
    setSwapTxStatus("approving");
    try {
      console.log("3. Approve Transaktion starten für Spender:", spenderAddress);
      
      const contract = getContract({
        client,
        chain: polygon,
        address: DFAITH_TOKEN
      });
      const amountInWei = (parseFloat(sellAmount) * Math.pow(10, DFAITH_DECIMALS)).toFixed(0);
      const requiredAmountWithBuffer = BigInt(Math.floor(Number(amountInWei) * 1.1).toString());
      
      console.log("Verkaufsbetrag:", sellAmount);
      console.log("Betrag in Wei:", amountInWei);
      console.log("Approve-Betrag mit Buffer:", requiredAmountWithBuffer.toString());
      
      const approveTransaction = prepareContractCall({
        contract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [spenderAddress, requiredAmountWithBuffer]
      });
      
      console.log("Sending approve transaction...");
      const approveResult = await sendTransaction(approveTransaction);
      console.log("Approve TX gesendet:", approveResult);
      
      setSwapTxStatus("waiting_approval");
      const { waitForReceipt } = await import("thirdweb");
      const receipt = await waitForReceipt(approveResult);
      console.log("Approve bestätigt:", receipt);
      
      setNeedsApproval(false);
      setSellStep('approved');
      setSwapTxStatus(null);
    } catch (e) {
      console.error("Approve Fehler:", e);
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Funktion für den eigentlichen Token-Swap
  const handleSellSwap = async () => {
    if (!quoteTxData || !account?.address) return;
    setIsSwapping(true);
    setSwapTxStatus("swapping");
    
    // Aktuelle Balance vor dem Swap speichern
    const initialBalance = parseFloat(dfaithBalance);
    
    try {
      console.log("4. Swap Transaktion starten");
      console.log("Swap TX Daten:", quoteTxData);
      
      const { prepareTransaction } = await import("thirdweb");
      const tx = prepareTransaction({
        to: quoteTxData.to,
        data: quoteTxData.data,
        value: BigInt(quoteTxData.value || "0"),
        chain: polygon,
        client
      });
      
      console.log("Sending swap transaction...");
      const swapResult = await sendTransaction(tx);
      console.log("Swap TX gesendet:", swapResult);
      
      setSwapTxStatus("confirming");
      
      // Warte auf Transaktionsbestätigung
      const { waitForReceipt } = await import("thirdweb");
      console.log("Warte auf Transaktionsbestätigung...");
      const receipt = await waitForReceipt(swapResult);
      console.log("Transaktion bestätigt:", receipt);
      
      // Prüfe ob Transaktion erfolgreich war
      if (receipt.status !== "success") {
        throw new Error("Transaktion fehlgeschlagen - Status: " + receipt.status);
      }
      
      setSwapTxStatus("verifying");
      console.log("5. Verifiziere Balance-Änderung...");
      
      // Mehrfache Versuche zur Balance-Verifizierung
      let balanceVerified = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!balanceVerified && attempts < maxAttempts) {
        attempts++;
        console.log(`Balance-Verifizierung Versuch ${attempts}/${maxAttempts}`);
        
        try {
          // Warte zwischen Versuchen
          if (attempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
          const dfaithRaw = Number(dfaithValue);
          const currentBalance = dfaithRaw / Math.pow(10, DFAITH_DECIMALS);
          
          console.log(`Initiale Balance: ${initialBalance}, Aktuelle Balance: ${currentBalance}`);
          
          // Prüfe ob sich die Balance um mindestens den Verkaufsbetrag verringert hat
          const expectedDecrease = parseFloat(sellAmount);
          const actualDecrease = initialBalance - currentBalance;
          
          console.log(`Erwartete Verringerung: ${expectedDecrease}, Tatsächliche Verringerung: ${actualDecrease}`);
          
          if (actualDecrease >= (expectedDecrease * 0.95)) { // 5% Toleranz für Rundungsfehler
            console.log("✅ Balance-Änderung verifiziert - Swap erfolgreich!");
            setDfaithBalance(currentBalance.toFixed(DFAITH_DECIMALS));
            balanceVerified = true;
            setSellStep('completed');
            setSwapTxStatus("success");
            setSellAmount("");
            setQuoteTxData(null);
            setSpenderAddress(null);
            setTimeout(() => setSwapTxStatus(null), 5000);
          } else if (attempts === maxAttempts) {
            console.log("⚠️ Balance-Änderung konnte nicht verifiziert werden");
            setDfaithBalance(currentBalance.toFixed(DFAITH_DECIMALS));
            throw new Error("Swap-Verifizierung fehlgeschlagen - Balance nicht wie erwartet geändert");
          }
        } catch (balanceError) {
          console.error(`Balance-Verifizierung Versuch ${attempts} fehlgeschlagen:`, balanceError);
          if (attempts === maxAttempts) {
            throw new Error("Balance-Verifizierung nach mehreren Versuchen fehlgeschlagen");
          }
        }
      }
      
    } catch (error) {
      console.error("Swap Fehler:", error);
      setSwapTxStatus("error");
      
      // Versuche trotzdem die Balance zu aktualisieren
      try {
        const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
        const dfaithRaw = Number(dfaithValue);
        const currentBalance = (dfaithRaw / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS);
        setDfaithBalance(currentBalance);
      } catch (balanceError) {
        console.error("Fehler beim Aktualisieren der Balance nach Swap-Fehler:", balanceError);
      }
      
      setTimeout(() => setSwapTxStatus(null), 5000);
    } finally {
      setIsSwapping(false);
    }
  };

  // Alle Schritte in einer Funktion
  const handleSellAllInOne = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0 || isSwapping || parseFloat(sellAmount) > parseFloat(dfaithBalance)) return;
    
    try {
      // Erster Schritt
      console.log("Start des Verkaufsprozesses");
      
      // Nur weitere Schritte ausführen, wenn Quote erfolgreich war
      if (sellStep === 'initial') {
        setIsSwapping(true);
        await handleGetQuote();
      }
      
      // Nur Approve ausführen, wenn nötig
      if (sellStep === 'quoteFetched' && needsApproval) {
        await handleApprove();
      }
      
      // Swap ausführen wenn Quote vorhanden und Approve erledigt/nicht nötig
      if ((sellStep === 'quoteFetched' && !needsApproval) || sellStep === 'approved') {
        await handleSellSwap();
      }
      
    } catch (e: any) {
      console.error("Verkaufsprozess Fehler:", e);
      setQuoteError(e.message || "Fehler beim Verkauf");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          D.FAITH verkaufen
        </h2>
        <p className="text-zinc-400">Tauschen Sie Ihre D.FAITH Token gegen POL</p>
      </div>

      {/* D.FAITH Token Karte */}
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
          <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">gegen POL verkaufen</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Verfügbare D.FAITH:</span>
            <span className="text-amber-400 font-bold">{dfaithBalance}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Aktueller Preis:</span>
            <span className="text-amber-400">
              {isLoadingPrice ? (
                <span className="animate-pulse">Laden...</span>
              ) : priceError ? (
                <span className="text-red-400">{priceError}</span>
              ) : dfaithPrice ? (
                `1 D.FAITH = ${dfaithPrice.toFixed(6)} POL`
              ) : (
                "Preis nicht verfügbar"
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Minimum:</span>
            <span className="text-zinc-300">0.01 D.FAITH</span>
          </div>
        </div>
        
        <Button
          className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          onClick={handleSellClick}
          disabled={!account?.address || parseFloat(dfaithBalance) <= 0}
        >
          {!account?.address ? "Wallet verbinden" : 
           parseFloat(dfaithBalance) <= 0 ? "Keine D.FAITH verfügbar" : 
           "D.FAITH verkaufen"}
        </Button>
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-red-500 my-8">
            <div className="mb-6 text-red-400 text-2xl font-bold text-center">D.FAITH verkaufen</div>
            
            {/* Prozessschritte anzeigen */}
            <div className="mb-4 flex justify-between">
              <div className={`text-xs ${sellStep !== 'initial' ? 'text-green-400' : 'text-zinc-500'}`}>
                1. Quote {sellStep !== 'initial' ? '✓' : ''}
              </div>
              <div className={`text-xs ${sellStep === 'approved' || sellStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                2. Approve {sellStep === 'approved' || sellStep === 'completed' ? '✓' : ''}
              </div>
              <div className={`text-xs ${sellStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                3. Swap {sellStep === 'completed' ? '✓' : ''}
              </div>
            </div>
            
            {/* D.FAITH Balance */}
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Verfügbare D.FAITH:</span>
                <span className="text-amber-400 font-bold">{dfaithBalance}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Ihre D.FAITH Token zum Verkaufen
              </div>
            </div>
            
            {/* Sell Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">D.FAITH Betrag</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  max={dfaithBalance}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 text-lg font-bold text-amber-400 focus:border-red-500 focus:outline-none"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  disabled={isSwapping || sellStep !== 'initial'}
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setSellAmount((parseFloat(dfaithBalance) * 0.95).toFixed(2))}
                  disabled={isSwapping || parseFloat(dfaithBalance) <= 0 || sellStep !== 'initial'}
                >
                  MAX
                </button>
              </div>
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
                  className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:border-red-500 focus:outline-none"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  disabled={isSwapping || sellStep !== 'initial'}
                />
                <div className="flex gap-1">
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippage("0.5")}
                    disabled={isSwapping || sellStep !== 'initial'}
                  >
                    0.5%
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippage("1")}
                    disabled={isSwapping || sellStep !== 'initial'}
                  >
                    1%
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippage("3")}
                    disabled={isSwapping || sellStep !== 'initial'}
                  >
                    3%
                  </button>
                </div>
              </div>
            </div>

            {/* Estimated Output */}
            {sellAmount && parseFloat(sellAmount) > 0 && dfaithPrice && (
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Geschätzte POL:</span>
                  <span className="text-purple-400 font-bold">
                    ~{(parseFloat(sellAmount) * dfaithPrice).toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Geschätzter Wert:</span>
                  <span className="text-green-400 font-bold">
                    ~{(parseFloat(sellAmount) * dfaithPrice * (polPriceEur || 0.5)).toFixed(3)}€
                  </span>
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
                  <>
                    <div>🎉 Verkauf erfolgreich!</div>
                    <div className="text-xs mt-1">Ihre D.FAITH wurden erfolgreich in POL getauscht und verifiziert</div>
                  </>
                )}
                {swapTxStatus === "error" && (
                  <>
                    <div>❌ Verkauf fehlgeschlagen!</div>
                    <div className="text-xs mt-1">{quoteError || "Ein Fehler ist aufgetreten"}</div>
                  </>
                )}
                {swapTxStatus === "confirming" && (
                  <>
                    <div>⏳ Blockchain-Bestätigung...</div>
                    <div className="text-xs mt-1">Warte auf Transaktionsbestätigung</div>
                  </>
                )}
                {swapTxStatus === "verifying" && (
                  <>
                    <div>🔍 Verifiziere Swap...</div>
                    <div className="text-xs mt-1">Prüfe Balance-Änderung zur Bestätigung</div>
                  </>
                )}
                {swapTxStatus === "approving" && (
                  <>
                    <div>🔐 Token-Berechtigung wird gesetzt...</div>
                    <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                  </>
                )}
                {swapTxStatus === "waiting_approval" && (
                  <>
                    <div>⌛ Approval wird bestätigt...</div>
                    <div className="text-xs mt-1">Warte auf Blockchain-Bestätigung</div>
                  </>
                )}
                {swapTxStatus === "swapping" && (
                  <>
                    <div>🔄 Swap wird durchgeführt...</div>
                    <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                  </>
                )}
                {swapTxStatus === "pending" && (
                  <>
                    <div>📝 Quote wird abgefragt...</div>
                    <div className="text-xs mt-1">Bitte warten Sie einen Moment</div>
                  </>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              {/* Schritt 1: Quote anfordern */}
              {sellStep === 'initial' && (
                <Button
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={handleGetQuote}
                  disabled={!sellAmount || parseFloat(sellAmount) <= 0 || isSwapping || parseFloat(sellAmount) > parseFloat(dfaithBalance)}
                >
                  <FaExchangeAlt className="inline mr-2" />
                  {isSwapping ? "Lade Quote..." : `Quote für ${sellAmount || "0"} D.FAITH holen`}
                </Button>
              )}
              {/* Schritt 2: Approve immer durchführen */}
              {sellStep === 'quoteFetched' && (
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl mb-2"
                  onClick={handleApprove}
                  disabled={isSwapping}
                >
                  <FaExchangeAlt className="inline mr-2" />
                  {isSwapping ? "Approval läuft..." : "D.FAITH Token für Verkauf freigeben"}
                </Button>
              )}
              {/* Schritt 3: Swap durchführen */}
              {sellStep === 'approved' && (
                <Button
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={handleSellSwap}
                  disabled={isSwapping}
                >
                  <FaExchangeAlt className="inline mr-2" />
                  {isSwapping ? "Verkaufe..." : `${sellAmount || "0"} D.FAITH jetzt verkaufen`}
                </Button>
              )}
              {/* "Neuer Verkauf" Button wenn Verkauf abgeschlossen ist */}
              {sellStep === 'completed' && (
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setSellStep('initial');
                    setQuoteTxData(null);
                    setSpenderAddress(null);
                    setNeedsApproval(false);
                    setQuoteError(null);
                    setSellAmount("");
                    setSwapTxStatus(null);
                  }}
                  disabled={isSwapping}
                >
                  Neuer Verkauf
                </Button>
              )}
              {quoteError && (
                <div className="text-red-400 text-sm text-center">{quoteError}</div>
              )}
              {/* Schließen Button */}
              <Button
                className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl"
                onClick={() => {
                  setShowSellModal(false);
                  setSellAmount("");
                  setSlippage("1");
                  setSwapTxStatus(null);
                  setQuoteTxData(null);
                  setSpenderAddress(null);
                  setNeedsApproval(false);
                  setQuoteError(null);
                  setSellStep('initial');
                }}
                disabled={isSwapping}
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
            <span className="text-yellow-400 text-xs">⚠️</span>
          </div>
          <div>
            <div className="font-medium text-yellow-400 mb-1">Wichtiger Hinweis</div>
            <div className="text-sm text-zinc-400">
              Beim Verkauf von D.FAITH Token können Slippage und Gebühren anfallen. Überprüfen Sie die Details vor der Bestätigung.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
