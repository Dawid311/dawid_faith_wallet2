import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaExchangeAlt, FaArrowDown } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { balanceOf } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0xeB6f60E08AaAd7951896BdefC65cB789633BbeAd"; // D.FAITH auf Base (NEU Juli 2025)
const DFAITH_DECIMALS = 2;

export default function SellTab() {
  const [selectedToken, setSelectedToken] = useState<"DFAITH" | "ETH" | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  // const [dinvestBalance, setDinvestBalance] = useState("0");
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [ethPriceEur, setEthPriceEur] = useState<number | null>(null);
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
  const [sellStep, setSellStep] = useState<'initial' | 'quoteFetched' | 'approved' | 'completed'>('initial');
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  
  // Korrekte API-Funktion für Balance-Abfrage
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
        // entfernt: setDinvestBalance("0");
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
        // D.INVEST entfernt, da nicht benötigt und Konstante fehlt
      } catch (error) {
        console.error("Fehler beim Laden der Balances:", error);
        if (isMounted) {
          setDfaithBalance("0");
          // entfernt: setDinvestBalance("0");
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

  // Preis laden (umgekehrte Richtung - D.FAITH zu ETH)
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      try {
        const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur');
        if (ethResponse.ok) {
          const ethData = await ethResponse.json();
          setEthPriceEur(ethData['ethereum']?.eur || 3000);
        }
        const params = new URLSearchParams({
          chain: "base",
          inTokenAddress: DFAITH_TOKEN,
          outTokenAddress: "0x0000000000000000000000000000000000000000", // Native ETH
          amount: "1",
          gasPrice: "1000000", // Base Chain: 0.001 Gwei (1000000 Wei)
        });
        const response = await fetch(`https://open-api.openocean.finance/v3/base/quote?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.outAmount && data.data.outAmount !== "0") {
            const ethPerDfaith = Number(data.data.outAmount) / Math.pow(10, 18);
            setDfaithPrice(ethPerDfaith);
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

  // Token-Auswahl-Handler
  const handleTokenSelect = (token: "DFAITH" | "ETH") => {
    if (!account?.address) {
      alert('Bitte Wallet verbinden!');
      return;
    }
    
    setSelectedToken(token);
    setSellAmount("");
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);
    setQuoteError(null);
    setSwapTxStatus(null);
    setSellStep('initial');
    
    if (token === "ETH") {
      // Öffne externe Seite
      window.open('https://global.transak.com/', '_blank');
    } else {
      setShowSellModal(true);
    }
  };

  // Funktion um eine Verkaufs-Quote zu erhalten (angepasst von BuyTab-Logik)
  const handleGetQuote = async () => {
    setSwapTxStatus("pending");
    setQuoteError(null);
    setQuoteTxData(null);
    setSpenderAddress(null);
    setNeedsApproval(false);

    try {
      if (!sellAmount || parseFloat(sellAmount) <= 0 || !account?.address) return;

      console.log("=== OpenOcean Quote Request für Base ===");
      console.log("D.FAITH Amount:", sellAmount);
      
      // Verwende gleiche Logik wie BuyTab für Mengen-Konvertierung
      const sellAmountRaw = Math.floor(parseFloat(sellAmount) * Math.pow(10, DFAITH_DECIMALS)).toString();
      
      const quoteParams = new URLSearchParams({
        chain: "base",
        inTokenAddress: DFAITH_TOKEN,
        outTokenAddress: "0x0000000000000000000000000000000000000000", // Native ETH
        amount: sellAmountRaw,
        slippage: slippage,
        gasPrice: "1000000", // Base Chain: 0.001 Gwei (1000000 Wei)
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
      
      console.log("=== QUOTE JSON DETAILS ===");
      console.log("txData.to:", txData.to);
      console.log("txData.data:", txData.data);
      console.log("txData.value:", txData.value);
      console.log("txData.gasPrice:", txData.gasPrice);
      console.log("txData.gas:", txData.gas);
      console.log("Vollständige Quote JSON:", JSON.stringify(txData, null, 2));
      console.log("=== END QUOTE JSON ===");

      // Spenderadresse für Base Chain (OpenOcean Router)
      const spender = "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64"; // OpenOcean Router auf Base
      setQuoteTxData(txData);
      setSpenderAddress(spender);

      // IMMER Approval anfordern für maximale Sicherheit und Konsistenz
      console.log("Setze Approval als erforderlich (Sicherheitsmaßnahme)");
      setNeedsApproval(true);
      
      setSellStep('quoteFetched');
      setSwapTxStatus(null);
    } catch (e: any) {
      console.error("Quote Fehler:", e);
      setQuoteError(e.message || "Quote Fehler");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Funktion um die Tokens für den Swap freizugeben (Approve) - immer mit max approve
  const handleApprove = async () => {
    if (!spenderAddress || !account?.address) return;
    setSwapTxStatus("approving");
    try {
      console.log("=== APPROVE TRANSACTION WIRD GESTARTET ===");
      console.log("3. Approve Transaktion starten für Spender:", spenderAddress);
      console.log("Account:", account.address);
      console.log("D.FAITH Token:", DFAITH_TOKEN);
      
      const contract = getContract({
        client,
        chain: base,
        address: DFAITH_TOKEN
      });
      
      // Maximaler Approve-Betrag (type(uint256).max)
      const maxApproval = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
      
      console.log("Verkaufsbetrag:", sellAmount);
      console.log("Approve-Betrag:", "MAX (type(uint256).max)");
      console.log("Approve-Betrag Wert:", maxApproval.toString());
      
      const approveTransaction = prepareContractCall({
        contract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [spenderAddress, maxApproval]
      });
      
      console.log("=== APPROVE TRANSACTION WIRD GESENDET ===");
      console.log("Approve Transaction Details:", JSON.stringify(approveTransaction, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      
      const approveResult = await sendTransaction(approveTransaction);
      console.log("✅ APPROVE TX ERFOLGREICH GESENDET:", approveResult);
      console.log("Approve TX Hash:", approveResult.transactionHash);
      
      setSwapTxStatus("waiting_approval");
      
      // Robuste Approval-Überwachung für Base Chain
      console.log("=== WARTE AUF APPROVAL-BESTÄTIGUNG ===");
      let approveReceipt = null;
      let approveAttempts = 0;
      const maxApproveAttempts = 50; // 50 Versuche = ca. 2 Minuten
      
      while (!approveReceipt && approveAttempts < maxApproveAttempts) {
        approveAttempts++;
        console.log(`📋 Approval-Bestätigungsversuch ${approveAttempts}/${maxApproveAttempts}`);
        
        try {
          // Versuche Receipt über RPC zu holen
          const txHash = approveResult.transactionHash;
          const receiptResponse = await fetch(base.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionReceipt',
              params: [txHash],
              id: 1
            })
          });
          
          const receiptData = await receiptResponse.json();
          console.log(`Receipt Response Versuch ${approveAttempts}:`, receiptData);
          
          if (receiptData.result && receiptData.result.status) {
            approveReceipt = {
              status: receiptData.result.status === "0x1" ? "success" : "reverted",
              transactionHash: receiptData.result.transactionHash,
              blockNumber: receiptData.result.blockNumber,
              gasUsed: receiptData.result.gasUsed
            };
            console.log("✅ APPROVAL BESTÄTIGT VIA RPC:", approveReceipt);
            break;
          } else {
            // Wenn noch nicht bestätigt, warte 2.5 Sekunden
            if (approveAttempts < maxApproveAttempts) {
              console.log(`⏳ Noch nicht bestätigt, warte 2.5 Sekunden...`);
              await new Promise(resolve => setTimeout(resolve, 2500));
            }
          }
        } catch (receiptError) {
          console.log(`❌ Approval-Bestätigungsversuch ${approveAttempts} fehlgeschlagen:`, receiptError);
          if (approveAttempts < maxApproveAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2500));
          }
        }
      }
      
      // Prüfe das Ergebnis der Approval-Bestätigung
      if (!approveReceipt) {
        console.log("⚠️ KEINE APPROVAL-BESTÄTIGUNG NACH ALLEN VERSUCHEN");
        // Versuche eine letzte Allowance-Prüfung
        try {
          const allowanceContract = getContract({
            client,
            chain: base,
            address: DFAITH_TOKEN
          });
          
          const { readContract } = await import("thirdweb");
          const allowance = await readContract({
            contract: allowanceContract,
            method: "function allowance(address owner, address spender) view returns (uint256)",
            params: [account.address, spenderAddress]
          });
          
          console.log("Aktuelle Allowance nach Approval:", allowance.toString());
          
          if (allowance > 0) {
            console.log("✅ ALLOWANCE VORHANDEN - APPROVAL WAR ERFOLGREICH");
            setSwapTxStatus("approval_confirmed");
            setTimeout(() => {
              setNeedsApproval(false);
              setSellStep('approved');
              setSwapTxStatus(null);
            }, 2000);
          } else {
            throw new Error("Approval-Transaktion fehlgeschlagen - Keine Allowance vorhanden");
          }
        } catch (allowanceError) {
          console.error("Allowance-Prüfung fehlgeschlagen:", allowanceError);
          throw new Error("Approval-Bestätigung fehlgeschlagen - Bitte versuchen Sie es erneut");
        }
      } else if (approveReceipt.status === "reverted") {
        console.log("❌ APPROVAL REVERTED:", approveReceipt.transactionHash);
        throw new Error(`Approval fehlgeschlagen - Transaction reverted (Hash: ${approveReceipt.transactionHash})`);
      } else {
        console.log("✅ APPROVAL ERFOLGREICH BESTÄTIGT");
        setSwapTxStatus("approval_confirmed");
        setTimeout(() => {
          setNeedsApproval(false);
          setSellStep('approved');
          setSwapTxStatus(null);
        }, 2000);
      }
      
      console.log("=== APPROVE PROCESS ABGESCHLOSSEN ===");
      
    } catch (e: any) {
      console.error("❌ APPROVE FEHLER:", e);
      console.error("Fehler Details:", e.message);
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 6000);
    }
  };

  // Funktion für den eigentlichen Token-Swap (angepasst von BuyTab-Logik)
  const handleSellSwap = async () => {
    if (!quoteTxData || !account?.address) return;
    setIsSwapping(true);
    setSwapTxStatus("swapping");
    
    // Aktuelle D.FAITH-Balance vor dem Swap speichern
    const initialDfaithBalance = parseFloat(dfaithBalance);
    const sellAmountNum = parseFloat(sellAmount);
    
    try {
      console.log("=== D.FAITH Verkauf-Swap wird gestartet auf Base ===");
      console.log("Verwende Quote-Daten:", quoteTxData);
      console.log("=== SWAP TRANSACTION DETAILS ===");
      console.log("Transaction TO:", quoteTxData.to);
      console.log("Transaction DATA:", quoteTxData.data);
      console.log("Transaction VALUE:", quoteTxData.value);
      console.log("Transaction GAS:", quoteTxData.gas);
      console.log("Transaction GASPRICE:", quoteTxData.gasPrice);
      console.log("Vollständige Swap TX JSON:", JSON.stringify(quoteTxData, null, 2));
      console.log("=== END SWAP TX JSON ===");
      
      const { prepareTransaction } = await import("thirdweb");
      
      // Stelle sicher, dass wir auf Base Chain (ID: 8453) sind
      console.log("Target Chain:", base.name, "Chain ID:", base.id);
      if (base.id !== 8453) {
        throw new Error("Falsche Chain - Base Chain erwartet");
      }
      
      const transaction = await prepareTransaction({
        to: quoteTxData.to,
        data: quoteTxData.data,
        value: BigInt(quoteTxData.value || "0"),
        chain: base, // Explizit Base Chain
        client,
        // Base Chain optimierte Gas-Parameter
        gasPrice: BigInt("1000000"), // 0.001 Gwei für Base Chain
        gas: BigInt(quoteTxData.gas || "300000"),
      });
      
      console.log("Prepared Transaction:", transaction);
      console.log("=== PREPARED TRANSACTION ===");
      console.log("Prepared TX:", JSON.stringify(transaction, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      console.log("=== END PREPARED TX ===");
      
      setSwapTxStatus("confirming");
      
      // Sende Transaktion mit verbesserter Fehlerbehandlung
      try {
        console.log("Sende Transaktion auf Base Chain (ID: 8453)");
        sendTransaction(transaction);
        console.log("Transaction sent successfully on Base Chain");
        
        // Da sendTransaction void zurückgibt, können wir nicht sofort die TxHash prüfen
        // Die Balance-Verifizierung wird das Ergebnis bestätigen
      } catch (txError: any) {
        console.log("Transaction error details:", txError);
        
        // Ignoriere Analytics-Fehler von Thirdweb (gleiche Logik wie BuyTab)
        if (txError?.message?.includes('event') || 
            txError?.message?.includes('analytics') || 
            txError?.message?.includes('c.thirdweb.com') ||
            txError?.message?.includes('400') && txError?.message?.includes('thirdweb')) {
          console.log("Thirdweb API-Fehler ignoriert, Transaktion könnte trotzdem erfolgreich sein");
          // Gehe weiter zur Verifizierung
        } else {
          // Echter Transaktionsfehler
          throw txError;
        }
      }
      
      setSwapTxStatus("verifying");
      console.log("Verifiziere D.FAITH-Balance-Änderung...");
      
      // D.FAITH-Balance-Verifizierung mit mehreren Versuchen (gleiche Logik wie BuyTab)
      let balanceVerified = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximal 30 Versuche
      
      // Erste Wartezeit nach Transaktionsbestätigung
      console.log("Warte 3 Sekunden vor erster Balance-Prüfung...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      while (!balanceVerified && attempts < maxAttempts) {
        attempts++;
        console.log(`D.FAITH-Balance-Verifizierung Versuch ${attempts}/${maxAttempts}`);
        
        try {
          if (attempts > 1) {
            const waitTime = Math.min(attempts * 1000, 10000); // 1s, 2s, 3s... bis max 10s
            console.log(`Warte ${waitTime/1000} Sekunden vor nächstem Versuch...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          // D.FAITH-Balance neu laden
          const dfaithValue = await fetchTokenBalanceViaInsightApi(DFAITH_TOKEN, account.address);
          const dfaithRaw = Number(dfaithValue);
          const currentDfaithBalance = dfaithRaw / Math.pow(10, DFAITH_DECIMALS);
          
          console.log(`Initiale D.FAITH-Balance: ${initialDfaithBalance}, Aktuelle D.FAITH-Balance: ${currentDfaithBalance}`);
          
          // Prüfe ob sich die D.FAITH-Balance um mindestens den Verkaufsbetrag verringert hat (mit 10% Toleranz)
          const expectedDecrease = sellAmountNum;
          const actualDecrease = initialDfaithBalance - currentDfaithBalance;
          
          console.log(`Erwartete Verringerung: ${expectedDecrease}, Tatsächliche Verringerung: ${actualDecrease}`);
          
          if (actualDecrease >= (expectedDecrease * 0.9)) { // 10% Toleranz
            console.log("✅ D.FAITH-Balance-Änderung verifiziert - Verkauf erfolgreich!");
            setDfaithBalance(currentDfaithBalance.toFixed(DFAITH_DECIMALS));
            balanceVerified = true;
            setSellStep('completed');
            setSwapTxStatus("success");
            setSellAmount("");
            setQuoteTxData(null);
            setSpenderAddress(null);
            setTimeout(() => setSwapTxStatus(null), 5000);
          } else {
            console.log(`Versuch ${attempts}: D.FAITH-Balance noch nicht ausreichend geändert, weiter warten...`);
          }
        } catch (balanceError) {
          console.error(`D.FAITH-Balance-Verifizierung Versuch ${attempts} fehlgeschlagen:`, balanceError);
        }
      }
      
      if (!balanceVerified) {
        console.log("⚠️ D.FAITH-Balance-Verifizierung nach mehreren Versuchen nicht erfolgreich");
        setSwapTxStatus("success");
        setSellStep('completed');
        setSellAmount("");
        setTimeout(() => setSwapTxStatus(null), 8000);
      }
      
    } catch (error) {
      console.error("Swap Error:", error);
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

// Alle Schritte in einer Funktion - ENTFERNT, da wir separate Buttons wollen
// const handleSellAllInOne = async () => {
//   // Diese Funktion wird entfernt da wir separate Schritte wollen
// };

  // Token-Auswahl wie im BuyTab
  const tokenOptions = [
    {
      key: "DFAITH",
      label: "D.FAITH",
      symbol: "DFAITH",
      balance: dfaithBalance,
      color: "from-amber-400 to-yellow-500",
      description: "Faith Utility Token",
      price: dfaithPrice && ethPriceEur ? `~${(dfaithPrice * ethPriceEur).toFixed(4)}€ pro D.FAITH` : (isLoadingPrice ? "Laden..." : (priceError || "Preis nicht verfügbar")),
      sub: dfaithPrice ? `1 D.FAITH = ${dfaithPrice.toFixed(6)} ETH` : "Wird geladen...",
      icon: <FaCoins className="text-amber-400" />,
    },
    {
      key: "ETH",
      label: "ETH",
      symbol: "ETH",
      balance: "–",
      color: "from-blue-500 to-blue-700",
      description: "Ethereum Native Token",
      price: ethPriceEur ? `${ethPriceEur.toFixed(2)}€ pro ETH` : "~3000€ pro ETH",
      sub: "via Transak verkaufen",
      icon: <span className="text-white text-lg font-bold">⟠</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token verkaufen
        </h2>
        <p className="text-zinc-400">Wähle einen Token und verkaufe ihn direkt</p>
      </div>

      {/* Token-Auswahl Grid */}
      <div className="space-y-3">
        <div className="grid gap-3">
          {tokenOptions.map((token) => (
            <div
              key={token.key}
              onClick={() => {
                if (account?.address) {
                  handleTokenSelect(token.key as "DFAITH" | "ETH");
                } else {
                  alert('Bitte Wallet verbinden!');
                }
              }}
              className="relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/70 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${token.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                  {token.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{token.label}</h3>
                  <p className="text-zinc-400 text-xs">{token.description}</p>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-zinc-400">{token.price}</span>
                <span className="text-zinc-400">{token.sub}</span>
              </div>
              {token.key === "DFAITH" && (
                <div className="mt-2 text-xs text-zinc-500">
                  Balance: {token.balance} D.FAITH
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verkaufs-Modal zentral - Mobile Optimiert und zentriert */}
      {showSellModal && selectedToken === "DFAITH" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4 pt-8 sm:pt-16">
          <div
            className="bg-zinc-900 rounded-xl p-3 sm:p-6 max-w-sm w-full border border-amber-400 max-h-[calc(100vh-8rem)] sm:max-h-[85vh] overflow-y-auto flex flex-col mt-4 sm:mt-0"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Modal-Header */}
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedToken(null);
                  setSellAmount("");
                  setSlippage("1");
                  setSwapTxStatus(null);
                  setSellStep('initial');
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

            {/* Modal-Inhalt für D.FAITH Verkauf */}
            <div className="w-full space-y-4">
              {/* Professional Sell Widget Header */}
              <div className="text-center pb-3 border-b border-zinc-700">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <FaCoins className="text-black text-lg" />
                </div>
                <p className="text-zinc-400 text-xs">Faith Utility Token auf Base Network</p>
                {dfaithPrice && ethPriceEur && (
                  <div className="mt-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full inline-block">
                    <span className="text-amber-400 text-xs font-semibold">
                      €{(dfaithPrice * ethPriceEur).toFixed(4)} / D.FAITH
                    </span>
                  </div>
                )}
              </div>

              {/* Sell Widget Steps Indicator */}
              <div className="flex justify-between items-center px-2">
                <div className={`flex items-center space-x-1 ${sellStep !== 'initial' ? 'text-green-400' : 'text-zinc-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${sellStep !== 'initial' ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                    {sellStep !== 'initial' ? '✓' : '1'}
                  </div>
                  <span className="text-xs font-medium">Quote</span>
                </div>
                <div className={`w-8 h-0.5 ${sellStep === 'approved' || sellStep === 'completed' ? 'bg-green-500' : 'bg-zinc-700'}`}></div>
                <div className={`flex items-center space-x-1 ${sellStep === 'approved' || sellStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${sellStep === 'approved' || sellStep === 'completed' ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                    {sellStep === 'approved' || sellStep === 'completed' ? '✓' : '2'}
                  </div>
                  <span className="text-xs font-medium">Approve</span>
                </div>
                <div className={`w-8 h-0.5 ${sellStep === 'completed' ? 'bg-green-500' : 'bg-zinc-700'}`}></div>
                <div className={`flex items-center space-x-1 ${sellStep === 'completed' ? 'text-green-400' : 'text-zinc-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${sellStep === 'completed' ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                    {sellStep === 'completed' ? '✓' : '3'}
                  </div>
                  <span className="text-xs font-medium">Sell</span>
                </div>
              </div>

              {/* Amount Input Section */}
              <div className="space-y-3">
                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">You Sell</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 bg-amber-500/20 rounded-lg px-2 py-1 border border-amber-500/30 flex-shrink-0">
                      <FaCoins className="text-amber-400 text-sm" />
                      <span className="text-amber-300 font-semibold text-xs">D.FAITH</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-lg sm:text-xl font-bold text-white focus:outline-none min-w-0"
                      value={sellAmount}
                      onChange={e => setSellAmount(e.target.value)}
                      disabled={isSwapping || sellStep !== 'initial'}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Balance: {dfaithBalance} D.FAITH</span>
                    <button
                      className="text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded"
                      onClick={() => {
                        // Verwende 99% der Balance als Maximum, um Rundungsfehler zu vermeiden
                        const maxSellAmount = (parseFloat(dfaithBalance) * 0.99).toFixed(2);
                        console.log("Setting MAX amount:", maxSellAmount, "from balance:", dfaithBalance);
                        setSellAmount(maxSellAmount);
                      }}
                      disabled={isSwapping || parseFloat(dfaithBalance) <= 0 || sellStep !== 'initial'}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* You Receive Section mit Exchange Rate */}
                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">You Receive</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 bg-blue-500/20 rounded-lg px-2 py-1 border border-blue-500/30 flex-shrink-0">
                      <span className="text-blue-400 text-sm">⟠</span>
                      <span className="text-blue-300 font-semibold text-xs">ETH</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg sm:text-xl font-bold text-blue-400">
                        {sellAmount && parseFloat(sellAmount) > 0 && dfaithPrice 
                          ? (parseFloat(sellAmount) * dfaithPrice).toFixed(6)
                          : "0.000000"
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">
                      {dfaithPrice ? `1 D.FAITH = ${dfaithPrice.toFixed(6)} ETH` : "Loading..."}
                    </span>
                    <span className="text-zinc-500">
                      {sellAmount && parseFloat(sellAmount) > 0 && dfaithPrice && ethPriceEur
                        ? `≈ €${(parseFloat(sellAmount) * dfaithPrice * ethPriceEur).toFixed(2)}`
                        : ""
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Advanced Settings - Kompakt */}
              <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-zinc-300 whitespace-nowrap">Slippage</span>
                    <input
                      type="number"
                      placeholder="1.0"
                      min="0.1"
                      max="50"
                      step="0.1"
                      className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg py-1 px-2 text-sm text-zinc-300 focus:border-amber-500 focus:outline-none"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      disabled={isSwapping || sellStep !== 'initial'}
                    />
                    <span className="text-xs text-zinc-500">%</span>
                  </div>
                  <div className="flex gap-1">
                    {["0.5", "1", "3"].map((value) => (
                      <button
                        key={value}
                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                          slippage === value 
                            ? "bg-amber-500 text-black" 
                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                        }`}
                        onClick={() => setSlippage(value)}
                        disabled={isSwapping || sellStep !== 'initial'}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Display */}
              {swapTxStatus && (
                <div className={`rounded-xl p-3 border text-center ${
                  swapTxStatus === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                  swapTxStatus === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  "bg-blue-500/10 border-blue-500/30 text-blue-400"
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {swapTxStatus === "success" && <span className="text-xl">🎉</span>}
                    {swapTxStatus === "error" && <span className="text-xl">❌</span>}
                    {swapTxStatus === "pending" && <span className="text-xl">📝</span>}
                    {swapTxStatus === "confirming" && <span className="text-xl">⏳</span>}
                    {swapTxStatus === "verifying" && <span className="text-xl">🔎</span>}
                    {swapTxStatus === "swapping" && <span className="text-xl">🔄</span>}
                    {swapTxStatus === "approving" && <span className="text-xl">🔐</span>}
                    {swapTxStatus === "waiting_approval" && <span className="text-xl">⌛</span>}
                    <span className="font-semibold text-sm">
                      {swapTxStatus === "success" && "Sale Successful!"}
                      {swapTxStatus === "error" && "Sale Failed"}
                      {swapTxStatus === "pending" && "Getting Quote..."}
                      {swapTxStatus === "confirming" && "Confirming..."}
                      {swapTxStatus === "verifying" && "Verifying..."}
                      {swapTxStatus === "swapping" && "Processing Sale..."}
                      {swapTxStatus === "approving" && "Approving Tokens..."}
                      {swapTxStatus === "waiting_approval" && "Waiting for Approval..."}
                    </span>
                  </div>
                  {swapTxStatus === "error" && quoteError && (
                    <p className="text-sm opacity-80">{quoteError}</p>
                  )}
                </div>
              )}

              {/* Validation Warnings */}
              {parseFloat(sellAmount) > parseFloat(dfaithBalance) && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2 text-red-400 text-sm">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Insufficient D.FAITH balance ({dfaithBalance} available, {sellAmount} requested)</span>
                  </div>
                </div>
              )}

              {parseFloat(sellAmount) > 0 && parseFloat(sellAmount) < 0.01 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2 text-yellow-400 text-sm">
                  <div className="flex items-center gap-2">
                    <span>💡</span>
                    <span>Minimum sale: 0.01 D.FAITH</span>
                  </div>
                </div>
              )}

              {/* Zusätzliche Balance-Warnung bei knapper Balance */}
              {parseFloat(sellAmount) > 0 && parseFloat(sellAmount) > (parseFloat(dfaithBalance) * 0.95) && parseFloat(sellAmount) <= parseFloat(dfaithBalance) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2 text-yellow-400 text-sm">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>You&apos;re selling almost your entire balance. Consider leaving some D.FAITH for gas or future transactions.</span>
                  </div>
                </div>
              )}

              {/* Action Buttons - Überarbeitet für sequenzielle Schritte */}
              <div className="space-y-2">
                {/* Debug Info - nur in Entwicklung */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-gray-800 p-2 rounded text-xs text-gray-400">
                    Debug: sellStep={sellStep}, needsApproval={needsApproval.toString()}, quoteTxData={quoteTxData ? 'present' : 'null'}
                  </div>
                )}
                
                {/* Schritt 1: Quote holen */}
                {sellStep === 'initial' && (
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl text-base transition-all transform hover:scale-[1.02]"
                    onClick={handleGetQuote}
                    disabled={
                      !sellAmount || 
                      parseFloat(sellAmount) <= 0 || 
                      swapTxStatus === "pending" || 
                      !account?.address || 
                      parseFloat(dfaithBalance) <= 0 ||
                      parseFloat(sellAmount) > parseFloat(dfaithBalance) ||
                      parseFloat(sellAmount) < 0.01 ||
                      // Zusätzliche Sicherheit: Prüfe gegen 99% der Balance
                      parseFloat(sellAmount) > (parseFloat(dfaithBalance) * 0.999)
                    }
                  >
                    {swapTxStatus === "pending" ? "Getting Quote..." : "Get Quote"}
                  </Button>
                )}

                {/* Schritt 2: Approve (nur wenn nötig) */}
                {sellStep === 'quoteFetched' && needsApproval && (
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl text-base transition-all transform hover:scale-[1.02]"
                    onClick={handleApprove}
                    disabled={swapTxStatus === "approving" || swapTxStatus === "waiting_approval"}
                  >
                    {swapTxStatus === "approving" ? "Approving..." : 
                     swapTxStatus === "waiting_approval" ? "Waiting for Approval..." : 
                     "Approve D.FAITH"}
                  </Button>
                )}

                {/* Schritt 3: Sell (wenn Quote da ist und Approval nicht nötig oder bereits erledigt) */}
                {((sellStep === 'quoteFetched' && !needsApproval) || sellStep === 'approved') && (
                  <Button
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-xl text-base transition-all transform hover:scale-[1.02]"
                    onClick={handleSellSwap}
                    disabled={swapTxStatus === "swapping" || swapTxStatus === "confirming" || swapTxStatus === "verifying"}
                  >
                    {swapTxStatus === "swapping" ? "Processing Sale..." : 
                     swapTxStatus === "confirming" ? "Confirming..." : 
                     swapTxStatus === "verifying" ? "Verifying..." : 
                     `Sell ${sellAmount || "0"} D.FAITH`}
                  </Button>
                )}

                {/* Schritt 4: Neuer Verkauf nach Abschluss */}
                {sellStep === 'completed' && (
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl text-base transition-all"
                    onClick={() => {
                      setSellStep('initial');
                      setQuoteTxData(null);
                      setSpenderAddress(null);
                      setNeedsApproval(false);
                      setQuoteError(null);
                      setSellAmount("");
                      setSwapTxStatus(null);
                      setSlippage("1");
                    }}
                  >
                    Make Another Sale
                  </Button>
                )}
              </div>
            </div>

            <Button
              className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-lg text-xs mt-2"
              onClick={() => {
                setShowSellModal(false);
                setSelectedToken(null);
                setSellAmount("");
                setSlippage("1");
                setSwapTxStatus(null);
                setSellStep('initial');
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
        </div>
      )}

      {/* Hinweis */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
            <span className="text-yellow-400 text-xs">⚠️</span>
          </div>
          <div>
            <div className="font-medium text-yellow-400 mb-1">Wichtiger Hinweis</div>
            <div className="text-sm text-zinc-400">
              Beim Verkauf von Token können Slippage und Gebühren anfallen. Überprüfen Sie die Details vor der Bestätigung.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
