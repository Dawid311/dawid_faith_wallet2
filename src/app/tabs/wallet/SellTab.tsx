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

export default function SellTab() {
  const [sellAmount, setSellAmount] = useState("");
  const [dfaithBalance, setDfaithBalance] = useState("0");
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [polPriceEur, setPolPriceEur] = useState<number | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [slippage, setSlippage] = useState("1");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxStatus, setSwapTxStatus] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // D.FAITH Balance laden
  useEffect(() => {
    const fetchDfaithBalance = async () => {
      if (!account?.address) {
        setDfaithBalance("0");
        return;
      }
      
      try {
        const contract = getContract({
          client,
          chain: polygon,
          address: DFAITH_TOKEN
        });
        
        const balance = await balanceOf({
          contract,
          address: account.address
        });
        
        const balanceFormatted = Number(balance) / Math.pow(10, DFAITH_DECIMALS);
        setDfaithBalance(balanceFormatted.toFixed(2));
        
      } catch (error) {
        console.error("Fehler beim Laden der D.FAITH Balance:", error);
        setDfaithBalance("0");
      }
    };
    
    fetchDfaithBalance();
    const interval = setInterval(fetchDfaithBalance, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // Preis laden (umgekehrte Richtung - D.FAITH zu POL)
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      
      try {
        // 1. POL/EUR Preis holen
        const polResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
        if (polResponse.ok) {
          const polData = await polResponse.json();
          setPolPriceEur(polData['polygon-ecosystem-token']?.eur || 0.50);
        }
        
        // 2. D.FAITH zu POL Preis holen (umgekehrte Richtung)
        const params = new URLSearchParams({
          chain: "polygon",
          inTokenAddress: DFAITH_TOKEN, // D.FAITH als Input
          outTokenAddress: "0x0000000000000000000000000000000000001010", // POL als Output
          amount: "1", // 1 D.FAITH
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
  };

  const handleSellSwap = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0 || !account?.address) return;
    
    setIsSwapping(true);
    setSwapTxStatus("pending");
    
    try {
      // Betrag OHNE Dezimalumrechnung verwenden (OpenOcean API erwartet den Betrag direkt)
      const amountForApi = sellAmount; // Direkt den eingegebenen Betrag verwenden
    
      console.log("=== OpenOcean Sell Swap Request ===");
      console.log("Chain:", "polygon");
      console.log("InToken (D.FAITH):", DFAITH_TOKEN);
      console.log("OutToken (POL):", "0x0000000000000000000000000000000000001010");
      console.log("Amount (D.FAITH):", amountForApi); // Ohne Dezimalumrechnung
      console.log("Slippage:", slippage);
      console.log("GasPrice:", "50");
      console.log("Account:", account.address);
      
      const params = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: DFAITH_TOKEN,
        outTokenAddress: "0x0000000000000000000000000000000000001010",
        amount: amountForApi, // Hier ohne Dezimalumrechnung
        slippage: slippage,
        gasPrice: "50",
        account: account.address,
      });
      
      const url = `https://open-api.openocean.finance/v3/polygon/swap_quote?${params}`;
      console.log("Full URL:", url);
      
      const response = await fetch(url);
      console.log("Response Status:", response.status);
      
      if (!response.ok) {
        throw new Error(`OpenOcean API Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("=== OpenOcean Sell Swap Response ===");
      console.log("Full Response:", JSON.stringify(data, null, 2));
      
      if (!data) {
        throw new Error('OpenOcean: Keine Response erhalten');
      }
      
      if (data.code !== 200) {
        throw new Error(`OpenOcean: API Error Code ${data.code} - ${JSON.stringify(data)}`);
      }
      
      if (!data.data) {
        throw new Error('OpenOcean: Keine data in Response');
      }
      
      const txData = data.data;
      console.log("=== Transaction Data Structure ===");
      console.log("to:", txData.to);
      console.log("data:", txData.data);
      console.log("value:", txData.value);
      console.log("gasPrice:", txData.gasPrice);
      console.log("estimatedGas:", txData.estimatedGas);
      console.log("outAmount:", txData.outAmount);
      console.log("inAmount:", txData.inAmount);

      // === KORREKTUR: Spenderadresse flexibel holen ===
      // OpenOcean kann spender ODER approveTarget liefern
      const spenderAddress = txData.spender || txData.approveTarget;
      if (!spenderAddress) {
        throw new Error("OpenOcean: Keine Spenderadresse (spender/approveTarget) in der Swap-Quote erhalten");
      }

      // Überprüfen ob alle notwendigen Felder vorhanden sind
      if (!txData.to || !txData.data) {
        console.error("Fehlende tx data in response:", txData);
        throw new Error('OpenOcean: Unvollständige Transaktionsdaten');
      }

      // **WICHTIG: Allowance mit OpenOcean API prüfen**
      const allowanceParams = new URLSearchParams({
        chain: "polygon",
        account: account.address,
        inTokenAddress: DFAITH_TOKEN
      });

      const allowanceUrl = `https://open-api.openocean.finance/v3/polygon/allowance?${allowanceParams}`;
      console.log("Checking allowance:", allowanceUrl);

      const allowanceResponse = await fetch(allowanceUrl);

      let allowanceValue = "0";
      if (allowanceResponse.ok) {
        const allowanceData = await allowanceResponse.json();
        console.log("Allowance Response:", allowanceData);

        if (allowanceData && allowanceData.data !== undefined && allowanceData.data !== null) {
          if (typeof allowanceData.data === "object") {
            if (Array.isArray(allowanceData.data)) {
              // Falls Array, nimm das erste Element
              const first = allowanceData.data[0];
              if (typeof first === "object" && first !== null) {
                const values = Object.values(first);
                if (values.length > 0) allowanceValue = values[0]?.toString() ?? "0";
              }
            } else {
              // Objekt: nimm den ersten Wert
              const values = Object.values(allowanceData.data);
              if (values.length > 0) allowanceValue = values[0]?.toString() ?? "0";
            }
          } else {
            // String oder Zahl direkt
            allowanceValue = allowanceData.data.toString();
          }
        }
        let currentAllowance: bigint;
        try {
          currentAllowance = BigInt(allowanceValue);
        } catch (e) {
          console.error("Fehler beim Parsen der Allowance als BigInt:", allowanceValue, e);
          currentAllowance = BigInt(0);
        }
        // Für die Allowance-Prüfung benötigen wir trotzdem den korrekten Wert mit Dezimalstellen
        // === KORREKTUR: Approve-Betrag korrekt in Wei berechnen ===
        const amountInWei = (parseFloat(sellAmount) * Math.pow(10, DFAITH_DECIMALS)).toFixed(0);
        const requiredAmount = BigInt(amountInWei);

        console.log("Current Allowance:", currentAllowance.toString());
        console.log("Required Amount:", requiredAmount.toString());

        // Wenn Allowance nicht ausreicht, Approve-Transaktion senden
        if (currentAllowance < requiredAmount) {
          console.log("Insufficient allowance, requesting approval...");
          setSwapTxStatus("approving");

          const contract = getContract({
            client,
            chain: polygon,
            address: DFAITH_TOKEN
          });

          // Statt einer sehr hohen Allowance, verwende genau den Betrag, den du tatsächlich verkaufen willst
          // plus etwas Puffer für Slippage (z.B. +10%)
          const requiredAmountWithBuffer = BigInt(Math.floor(Number(amountInWei) * 1.1).toString());

          // === KORREKTUR: Approve an spenderAddress (OpenOcean Router) ===
          const approveTransaction = prepareContractCall({
            contract,
            method: "function approve(address spender, uint256 amount) returns (bool)",
            params: [spenderAddress, requiredAmountWithBuffer]
          });

          // Approve senden
          const approveResult = await sendTransaction(approveTransaction);
          console.log("Approval sent:", approveResult);

          // Warten bis Approve-Transaktion bestätigt ist
          setSwapTxStatus("waiting_approval");
          try {
            // Warte auf Bestätigung statt einfach Zeit verstreichen zu lassen
            const { waitForReceipt } = await import("thirdweb");
            await waitForReceipt(approveResult);
            console.log("Approval confirmed in blockchain");
          } catch (error) {
            console.error("Error waiting for approval confirmation:", error);
            throw new Error("Approval-Transaktion wurde nicht bestätigt");
          }

          // Allowance erneut prüfen
          const newAllowanceResponse = await fetch(allowanceUrl);
          let newAllowanceValue = "0";
          if (newAllowanceResponse.ok) {
            const newAllowanceData = await newAllowanceResponse.json();
            if (newAllowanceData && newAllowanceData.data !== undefined && newAllowanceData.data !== null) {
              if (typeof newAllowanceData.data === "object") {
                if (Array.isArray(newAllowanceData.data)) {
                  const first = newAllowanceData.data[0];
                  if (typeof first === "object" && first !== null) {
                    const values = Object.values(first);
                    if (values.length > 0) newAllowanceValue = values[0]?.toString() ?? "0";
                  }
                } else {
                  const values = Object.values(newAllowanceData.data);
                  if (values.length > 0) newAllowanceValue = values[0]?.toString() ?? "0";
                }
              } else {
                newAllowanceValue = newAllowanceData.data.toString();
              }
            }
            const newAllowance = BigInt(newAllowanceValue);

            console.log("New Allowance:", newAllowance.toString());

            if (newAllowance < requiredAmount) {
              throw new Error('Approval fehlgeschlagen oder noch nicht bestätigt');
            }
          }
        } else {
          console.log("Sufficient allowance, proceeding with swap...");
        }
      } else {
        console.warn("Allowance check failed, proceeding anyway");
      }

    // Jetzt den eigentlichen Swap durchführen
    setSwapTxStatus("swapping");
    
    const { prepareTransaction } = await import("thirdweb");
    const tx = prepareTransaction({
      to: txData.to,
      data: txData.data,
      value: BigInt(txData.value || "0"),
      chain: polygon,
      client
    });

    console.log("Prepared transaction:", tx);
    console.log("Sending transaction...");
    
    const transactionResult = await sendTransaction(tx);
    console.log("Transaction sent:", transactionResult);
    
    setSwapTxStatus("confirming");
    
    // Länger warten auf Bestätigung
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Balance nach Swap aktualisieren
    const fetchDfaithBalance = async () => {
      if (!account?.address) return;
      try {
        const contract = getContract({
          client,
          chain: polygon,
          address: DFAITH_TOKEN
        });
        
        const balance = await balanceOf({
          contract,
          address: account.address
        });
        
        const balanceFormatted = Number(balance) / Math.pow(10, DFAITH_DECIMALS);
        setDfaithBalance(balanceFormatted.toFixed(2));
      } catch (error) {
        console.error("Balance update error:", error);
      }
    };
    
    await fetchDfaithBalance();
    
    setSwapTxStatus("success");
    setSellAmount("");
    
    setTimeout(() => {
      setSwapTxStatus(null);
    }, 5000);
    
  } catch (error) {
    console.error("Sell Swap Error:", error);
    setSwapTxStatus("error");
    
    setTimeout(() => {
      setSwapTxStatus(null);
    }, 5000);
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
                  disabled={isSwapping}
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setSellAmount((parseFloat(dfaithBalance) * 0.95).toFixed(2))}
                  disabled={isSwapping || parseFloat(dfaithBalance) <= 0}
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
                swapTxStatus === "approving" ? "bg-orange-500/20 text-orange-400" :
                swapTxStatus === "swapping" ? "bg-purple-500/20 text-purple-400" :
                "bg-yellow-500/20 text-yellow-400"
              }`}>
                {swapTxStatus === "success" && "🎉 Verkauf erfolgreich!"}
                {swapTxStatus === "error" && "❌ Verkauf fehlgeschlagen!"}
                {swapTxStatus === "confirming" && "⏳ Bestätigung läuft..."}
                {swapTxStatus === "approving" && "🔐 Token-Berechtigung wird gesetzt..."}
                {swapTxStatus === "swapping" && "🔄 Swap wird durchgeführt..."}
                {swapTxStatus === "pending" && "📝 Transaktion wird vorbereitet..."}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleSellSwap}
                disabled={!sellAmount || parseFloat(sellAmount) <= 0 || isSwapping || parseFloat(sellAmount) > parseFloat(dfaithBalance)}
              >
                <FaExchangeAlt className="inline mr-2" />
                {isSwapping ? "Verkaufe..." : `${sellAmount || "0"} D.FAITH verkaufen`}
              </Button>
              
              <Button
                className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl"
                onClick={() => {
                  setShowSellModal(false);
                  setSellAmount("");
                  setSlippage("1");
                  setSwapTxStatus(null);
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
