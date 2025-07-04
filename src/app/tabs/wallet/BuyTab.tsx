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
        account: account?.address ?? "",
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

  // Neue States für den verbesserten Kaufprozess
  const [buyStep, setBuyStep] = useState<'initial' | 'quoteFetched' | 'completed'>('initial');
  const [quoteTxData, setQuoteTxData] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Funktion um Quote zu holen
  const handleGetQuote = async () => {
    if (!swapAmountPol || parseFloat(swapAmountPol) <= 0 || !account?.address) return;
    
    setSwapTxStatus("pending");
    setQuoteError(null);
    setQuoteTxData(null);
    setBuyStep('initial');
    
    try {
      console.log("1. Quote anfordern für", swapAmountPol, "POL → D.FAITH");
      
      // Betrag in Wei umrechnen für POL (18 Dezimalstellen)
      const amountInWei = (parseFloat(swapAmountPol) * Math.pow(10, POL_DECIMALS)).toString();
      console.log("Betrag für OpenOcean:", amountInWei);
      
      const params = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: "0x0000000000000000000000000000000000001010", // Native POL
        outTokenAddress: DFAITH_TOKEN,
        amount: amountInWei,
        slippage: slippage,
        gasPrice: "50",
        account: account?.address,
      });
      
      const response = await fetch(`https://open-api.openocean.finance/v3/polygon/swap_quote?${params}`);
      
      if (!response.ok) {
        throw new Error(`OpenOcean Quote Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Quote Response:", data);
      
      if (!data || data.code !== 200 || !data.data) {
        throw new Error('OpenOcean: Keine gültige Quote erhalten');
      }
      
      const txData = data.data;
      
      if (!txData.to || !txData.data) {
        throw new Error('OpenOcean: Unvollständige Transaktionsdaten');
      }
      
      console.log("✅ Quote erfolgreich erhalten");
      setQuoteTxData(txData);
      setBuyStep('quoteFetched');
      setSwapTxStatus(null);
      
    } catch (e: any) {
      console.error("Quote Fehler:", e);
      setQuoteError(e.message || "Fehler beim Holen der Quote");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    }
  };

  // Funktion für den Swap (ohne Approve da native POL)
  const handleBuySwap = async () => {
    if (!quoteTxData || !account?.address) return;
    
    setIsSwapping(true);
    setSwapTxStatus("swapping");
    
    // Aktuelle Balance vor dem Swap speichern
    const initialBalance = parseFloat(dfaithBalance);
    
    try {
      console.log("2. Swap Transaktion starten");
      console.log("Verwende Quote-Daten:", quoteTxData);
      
      const { prepareTransaction } = await import("thirdweb");
      
      // Vereinfachte Transaktionsvorbereitung ohne explizite Nonce
      const tx = prepareTransaction({
        to: quoteTxData.to,
        data: quoteTxData.data,
        value: BigInt(quoteTxData.value || "0"),
        chain: polygon,
        client,
        gas: BigInt(quoteTxData.gasLimit || "300000"),
        gasPrice: BigInt(quoteTxData.gasPrice || "50000000000")
      });
      
      console.log("Sending swap transaction");
      
      // Verwende sendAndConfirmTransaction anstatt sendTransaction + waitForReceipt
      const { sendAndConfirmTransaction } = await import("thirdweb");
      const receipt = await sendAndConfirmTransaction({
        transaction: tx,
        account: account,
      });
      
      console.log("Transaktion bestätigt:", receipt);
      
      // Prüfe ob Transaktion erfolgreich war
      if (receipt.status !== "success") {
        console.error("Transaktion Details:", {
          status: receipt.status,
          gasUsed: receipt.gasUsed?.toString(),
          logs: receipt.logs,
          transactionHash: receipt.transactionHash
        });
        throw new Error(`Transaktion fehlgeschlagen - Status: ${receipt.status}. Hash: ${receipt.transactionHash}`);
      }
      
      setSwapTxStatus("verifying");
      console.log("3. Verifiziere Balance-Änderung...");
      
      // Unendliche Balance-Verifizierung bis Erfolg bestätigt
      let balanceVerified = false;
      let attempts = 0;
      
      // Erste längere Wartezeit nach Transaktionsbestätigung
      console.log("Warte 5 Sekunden vor erster Balance-Prüfung...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Läuft so lange bis Balance-Änderung verifiziert ist
      while (!balanceVerified) {
        attempts++;
        console.log(`Balance-Verifizierung Versuch ${attempts}`);
        
        try {
          // Stufenweise längere Wartezeiten, aber maximal 15 Sekunden
          if (attempts > 1) {
            const waitTime = Math.min(attempts * 2000, 15000);
            console.log(`Warte ${waitTime/1000} Sekunden vor nächstem Versuch...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          // Neue Balance abrufen
          const response = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DFAITH_TOKEN}&owner_address=${account.address}&include_native=true`);
          const data = await response.json();
          const balance = data?.data?.[0]?.balance ?? "0";
          const currentBalance = Number(balance) / Math.pow(10, DFAITH_DECIMALS);
          
          console.log(`Initiale Balance: ${initialBalance}, Aktuelle Balance: ${currentBalance}`);
          
          // Prüfe ob sich die Balance um mindestens den erwarteten Betrag erhöht hat
          const expectedIncrease = dfaithPrice !== null
            ? parseFloat(swapAmountPol) * dfaithPrice * (1 - parseFloat(slippage) / 100)
            : 0;
          const actualIncrease = currentBalance - initialBalance;
          
          console.log(`Erwartete Erhöhung: ${expectedIncrease}, Tatsächliche Erhöhung: ${actualIncrease}`);
          
          // Großzügige Toleranz für Rundungsfehler
          if (actualIncrease >= (expectedIncrease * 0.9)) { // 10% Toleranz
            console.log("✅ Balance-Änderung verifiziert - Kauf erfolgreich!");
            setDfaithBalance(currentBalance.toFixed(DFAITH_DECIMALS));
            balanceVerified = true;
            setBuyStep('completed');
            setSwapTxStatus("success");
            setSwapAmountPol("");
            setQuoteTxData(null);
            setTimeout(() => setSwapTxStatus(null), 5000);
          } else {
            console.log(`Versuch ${attempts}: Balance noch nicht ausreichend geändert, weiter warten...`);
          }
        } catch (balanceError) {
          console.error(`Balance-Verifizierung Versuch ${attempts} fehlgeschlagen:`, balanceError);
          console.log("Balance-Abfrage fehlgeschlagen, versuche es weiter...");
        }
        
        // Sicherheitsventil: Nach 50 Versuchen Fehler werfen
        if (attempts >= 50) {
          throw new Error("Balance-Verifizierung nach 50 Versuchen noch nicht erfolgreich - manuell prüfen");
        }
      }
      
    } catch (error) {
      console.error("Kauf Fehler:", error);
      setSwapTxStatus("error");
      
      // Versuche trotzdem die Balance zu aktualisieren
      try {
        const response = await fetch(`https://insight.thirdweb.com/v1/tokens?chain_id=137&token_address=${DFAITH_TOKEN}&owner_address=${account.address}&include_native=true`);
        const data = await response.json();
        const balance = data?.data?.[0]?.balance ?? "0";
        const currentBalance = (Number(balance) / Math.pow(10, DFAITH_DECIMALS)).toFixed(DFAITH_DECIMALS);
        setDfaithBalance(currentBalance);
      } catch (balanceError) {
        console.error("Fehler beim Aktualisieren der Balance nach Kauf-Fehler:", balanceError);
      }
      
      setTimeout(() => setSwapTxStatus(null), 5000);
    } finally {
      setIsSwapping(false);
    }
  };
  
  // All-in-One Funktion für den kompletten Kaufprozess
  const handleBuyAllInOne = async () => {
    try {
      if (buyStep === 'initial') {
        setIsSwapping(true);
        await handleGetQuote();
      }
      
      // Swap ausführen wenn Quote vorhanden
      if (buyStep === 'quoteFetched') {
        await handleBuySwap();
      }
      
    } catch (e: any) {
      console.error("Kaufprozess Fehler:", e);
      setQuoteError(e.message || "Fehler beim Kauf");
      setSwapTxStatus("error");
      setTimeout(() => setSwapTxStatus(null), 4000);
    } finally {
      if (buyStep === 'initial') {
        setIsSwapping(false);
      }
    }
  };

  // Reset Funktion
  const resetBuyProcess = () => {
    setBuyStep('initial');
    setSwapAmountPol("");
    setSlippage("1");
    setSwapTxStatus(null);
    setQuoteError(null);
    setQuoteTxData(null);
    setIsSwapping(false);
  };

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
                      resetBuyProcess();
                    }}
                    className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0"
                    disabled={isSwapping}
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>
                
                {/* Prozessschritte-Anzeige */}
                <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center gap-4">
                    {/* Quote Schritt */}
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${buyStep === 'initial' ? 'bg-amber-500 text-black' : 
                          buyStep === 'quoteFetched' || buyStep === 'completed' ? 'bg-green-500 text-white' : 'bg-zinc-600 text-zinc-400'}
                      `}>
                        {buyStep === 'quoteFetched' || buyStep === 'completed' ? '✓' : '1'}
                      </div>
                      <span className={`text-sm font-medium
                        ${buyStep === 'initial' ? 'text-amber-400' : 
                          buyStep === 'quoteFetched' || buyStep === 'completed' ? 'text-green-400' : 'text-zinc-400'}
                      `}>
                        Quote
                      </span>
                    </div>
                    
                    <div className="w-6 h-0.5 bg-zinc-600"></div>
                    
                    {/* Swap Schritt */}
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${buyStep === 'quoteFetched' ? 'bg-amber-500 text-black' : 
                          buyStep === 'completed' ? 'bg-green-500 text-white' : 'bg-zinc-600 text-zinc-400'}
                      `}>
                        {buyStep === 'completed' ? '✓' : '2'}
                      </div>
                      <span className={`text-sm font-medium
                        ${buyStep === 'quoteFetched' ? 'text-amber-400' : 
                          buyStep === 'completed' ? 'text-green-400' : 'text-zinc-400'}
                      `}>
                        Swap
                      </span>
                    </div>
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
                
                {/* Transaction Status */}
                {(swapTxStatus || quoteError) && (
                  <div className="mb-4 p-3 rounded-lg border">
                    {swapTxStatus === "pending" && (
                      <div className="flex items-center gap-2 text-blue-400 border-blue-400/30 bg-blue-400/10">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Quote wird geholt...</span>
                      </div>
                    )}
                    
                    {swapTxStatus === "swapping" && (
                      <div className="flex items-center gap-2 text-purple-400 border-purple-400/30 bg-purple-400/10">
                        <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Swap wird durchgeführt...</span>
                      </div>
                    )}
                    
                    {swapTxStatus === "confirming" && (
                      <div className="flex items-center gap-2 text-amber-400 border-amber-400/30 bg-amber-400/10">
                        <div className="animate-spin w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Warte auf Bestätigung...</span>
                      </div>
                    )}
                    
                    {swapTxStatus === "verifying" && (
                      <div className="flex items-center gap-2 text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                        <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Verifiziere Kauf...</span>
                      </div>
                    )}
                    
                    {swapTxStatus === "success" && (
                      <div className="flex items-center gap-2 text-green-400 border-green-400/30 bg-green-400/10">
                        <span className="text-green-400">✓</span>
                        <span className="text-sm">Kauf erfolgreich!</span>
                      </div>
                    )}
                    
                    {(swapTxStatus === "error" || quoteError) && (
                      <div className="flex items-center gap-2 text-red-400 border-red-400/30 bg-red-400/10">
                        <span className="text-red-400">✕</span>
                        <span className="text-sm">{quoteError || "Kauf fehlgeschlagen"}</span>
                      </div>
                    )}
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
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Haupt-Action Button */}
                  {buyStep === 'initial' && (
                    <button
                      onClick={handleBuyAllInOne}
                      disabled={!swapAmountPol || parseFloat(swapAmountPol) <= 0 || parseFloat(polBalance) <= 0 || isSwapping}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                    >
                      {isSwapping ? "Wird verarbeitet..." : "Quote holen"}
                    </button>
                  )}
                  
                  {buyStep === 'quoteFetched' && (
                    <button
                      onClick={handleBuyAllInOne}
                      disabled={isSwapping}
                      className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                    >
                      {isSwapping ? "Swap läuft..." : "Swap durchführen"}
                    </button>
                  )}
                  
                  {buyStep === 'completed' && (
                    <button
                      onClick={resetBuyProcess}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      Neuer Kauf
                    </button>
                  )}
                  
                  {/* Cancel Button nur im Quote-Schritt */}
                  {buyStep === 'quoteFetched' && (
                    <button
                      onClick={resetBuyProcess}
                      disabled={isSwapping}
                      className="w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-zinc-300 rounded-xl transition-all duration-200"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* POL kaufen */}
          <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-400 to-sky-600 rounded-full">
                  <FaLock className="text-black text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-sky-400">POL Token</h3>
                  <p className="text-xs text-zinc-500">Polygon Native Token</p>
                </div>
              </div>
              <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">für D.FAITH Swap</span>
            </div>
            
            {/* POL kaufen Modal */}
            {showPolBuyModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 overflow-y-auto">
                <div
                  ref={polBuyModalRef}
                  className="bg-zinc-900 rounded-xl p-4 sm:p-6 max-w-md w-full mx-4 border border-amber-400 my-8"
                >
                  {/* Header mit Close Button */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-amber-400">POL kaufen</h3>
                    <button
                      onClick={() => {
                        setShowPolBuyModal(false);
                        setSwapAmount("");
                        setSlippage("1");
                        setSwapStatus(null);
                      }}
                      className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0"
                      disabled={isSwapPending}
                    >
                      <span className="text-lg">✕</span>
                    </button>
                  </div>
                  
                  {/* Preis und Slippage Info */}
                  <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-sm text-zinc-400">Aktueller Preis:</span>
                      <span className="text-sm text-amber-400 font-medium">
                        {isLoadingPrice && !polPriceEur ? (
                          <span className="animate-pulse">Laden...</span>
                        ) : polPriceEur ? (
                          <span>
                            {polPriceEur.toFixed(3)}€ pro POL
                            {priceError && (
                              <span className="text-xs text-yellow-400 ml-1">(cached)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs">{priceError || "Preis nicht verfügbar"}</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 mt-2">
                      <span className="text-sm text-zinc-400">Slippage Toleranz:</span>
                      <span className="text-sm text-zinc-300 font-medium">
                        {slippage}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Swap Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Betrag in EUR</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 pr-16 text-lg font-bold text-purple-400 focus:border-amber-500 focus:outline-none"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        disabled={isSwapPending}
                      />
                      <button
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition"
                        onClick={() => setSwapAmount((parseFloat(polPriceEur?.toString() || "0") * 0.95).toFixed(3))}
                        disabled={isSwapPending || !polPriceEur}
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Kaufen Sie POL mit Euro für D.FAITH Swap
                    </div>
                  </div>
                  
                  {/* Transaction Status */}
                  {swapStatus && (
                    <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Transaktionsstatus:</span>
                        <span className="text-sm font-bold text-amber-400">
                          {swapStatus === "pending" && "Wird bearbeitet..."}
                          {swapStatus === "confirming" && "Bestätigen..."}
                          {swapStatus === "success" && "Erfolgreich!"}
                          {swapStatus === "error" && "Fehler"}
                        </span>
                      </div>
                      {swapStatus === "error" && (
                        <div className="mt-2 text-xs text-red-400">
                          {swapError}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Buttons */}
                  <div className="mt-4">
                    <Button
                      onClick={async () => {
                        setIsSwapping(true);
                        setSwapStatus("pending");
                        
                        try {
                          // Schritt 1: Hole Quote von OpenOcean
                          const params = new URLSearchParams({
                            chain: "polygon",
                            inTokenAddress: "0x0000000000000000000000000000000000001010", // Native POL
                            outTokenAddress: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // D.FAITH
                            amount: (parseFloat(swapAmount) / dfaithPriceEur!).toFixed(DFAITH_DECIMALS),
                            slippage: slippage,
                            gasPrice: "50",
                            account: account?.address ?? "",
                          });
                          
                          const response = await fetch(`https://open-api.openocean.finance/v3/polygon/swap_quote?${params}`);
                          
                          if (!response.ok) {
                            throw new Error(`OpenOcean Quote Fehler: ${response.status}`);
                          }
                          
                          const data = await response.json();
                          console.log("Quote Response:", data);
                          
                          if (!data || data.code !== 200 || !data.data) {
                            throw new Error('OpenOcean: Keine gültige Quote erhalten');
                          }
                          
                          const txData = data.data;
                          
                          if (!txData.to || !txData.data) {
                            throw new Error('OpenOcean: Unvollständige Transaktionsdaten');
                          }
                          
                          // Schritt 2: Bereite Transaktion vor
                          const { prepareTransaction } = await import("thirdweb");
                          const transaction = await prepareTransaction({
                            to: txData.to,
                            data: txData.data,
                            value: BigInt(txData.value || "0"),
                            chain: polygon,
                            client
                          });
                          
                          console.log("Prepared Transaction:", transaction);
                          setSwapStatus("confirming");
                          
                          // Schritt 3: Sende Transaktion
                          await sendTransaction(transaction);
                          console.log("Transaction sent successfully");
                          
                          // Bei erfolgreichem Senden
                          setSwapStatus("success");
                          
                          // Balance sofort aktualisieren
                          setTimeout(() => updatePolBalance(true), 1000);
                          setTimeout(() => updatePolBalance(true), 3000);
                          
                          // Input zurücksetzen
                          setSwapAmount("");
                          
                          // Success-Status nach 5 Sekunden ausblenden
                          setTimeout(() => {
                            setSwapStatus(null);
                          }, 5000);
                          
                        } catch (error) {
                          console.error("Swap Error:", error);
                          setSwapStatus("error");
                          
                          // Error-Status nach 5 Sekunden ausblenden
                          setTimeout(() => {
                            setSwapStatus(null);
                          }, 5000);
                        } finally {
                          setIsSwapping(false);
                        }
                      }}
                      className="w-full"
                      disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
                    >
                      {isSwapping ? "Wird verarbeitet..." : "Jetzt kaufen"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}