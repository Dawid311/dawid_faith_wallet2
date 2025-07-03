import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaArrowDown, FaExchangeAlt, FaLock, FaPaperPlane } from "react-icons/fa";

export default function SendTab() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");
  const [isSending, setIsSending] = useState(false);
  
  // Neue State-Variablen für D.FAITH Verkauf
  const [showDfaithSellModal, setShowDfaithSellModal] = useState(false);
  const [sellAmountDfaith, setSellAmountDfaith] = useState("");
  const [slippageSell, setSlippageSell] = useState("1");
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [isSellingDfaith, setIsSellingDfaith] = useState(false);
  const [sellTxStatus, setSellTxStatus] = useState<string | null>(null);
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);

  // Token-Konstanten mit neuen Adressen
  const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060";
  const DFAITH_DECIMALS = 2;

  // D.FAITH Verkaufs-Funktion (umgekehrt zu Kauf)
  const handleDfaithSell = async () => {
    if (!sellAmountDfaith || parseFloat(sellAmountDfaith) <= 0) return;
    setIsSellingDfaith(true);
    setSellTxStatus("pending");
    try {
      const amountStr = parseFloat(sellAmountDfaith).toString();
      
      // Debug: Zeige alle Parameter
      console.log("=== OpenOcean Sell Request ===");
      console.log("Chain:", "polygon");
      console.log("InToken:", "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060"); // D.FAITH
      console.log("OutToken:", "0x0000000000000000000000000000000000001010"); // POL
      console.log("Amount:", amountStr);
      console.log("Slippage:", slippageSell);
      
      // 1. Hole Sell-Transaktionsdaten von OpenOcean v3 (D.FAITH → POL)
      const params = new URLSearchParams({
        chain: "polygon",
        inTokenAddress: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // D.FAITH Token
        outTokenAddress: "0x0000000000000000000000000000000000001010", // POL Native Token
        amount: (parseFloat(amountStr) * Math.pow(10, DFAITH_DECIMALS)).toString(), // D.FAITH mit 2 Decimals
        slippage: slippageSell,
        gasPrice: "50",
        account: "0x123...", // Hier echte Wallet-Adresse einsetzen
      });
      
      const url = `https://open-api.openocean.finance/v3/polygon/swap_quote?${params}`;
      console.log("Full URL:", url);
      
      const response = await fetch(url);
      console.log("Response Status:", response.status);
      
      if (!response.ok) {
        throw new Error(`OpenOcean API Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("=== OpenOcean Sell Response ===");
      console.log("Full Response:", JSON.stringify(data, null, 2));
      
      // Prüfe Response-Struktur
      if (!data || data.code !== 200 || !data.data) {
        throw new Error('OpenOcean: Keine gültigen Verkaufsdaten erhalten');
      }
      
      const txData = data.data;
      
      // Validiere tx data
      if (!txData.to || !txData.data) {
        throw new Error('OpenOcean: Unvollständige Transaktionsdaten');
      }
      
      // 2. Sende die Verkaufs-Transaktion
      // Hier würde die echte Blockchain-Transaktion stattfinden
      
      setSellTxStatus("confirming");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSellTxStatus("success");
      setSellAmountDfaith("");
      
      // Status nach 5 Sekunden zurücksetzen
      setTimeout(() => {
        setSellTxStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error("D.FAITH Sell Fehler:", error);
      setSellTxStatus("error");
      
      setTimeout(() => {
        setSellTxStatus(null);
      }, 5000);
    } finally {
      setIsSellingDfaith(false);
    }
  };

  // Simuliere D.FAITH Balance laden
  useEffect(() => {
    // Hier würde die echte Balance geladen werden
    setDfaithBalance("125.50"); // Beispiel-Balance
    setDfaithPrice(3.9); // Beispiel: 1 D.FAITH = 3.9 POL
  }, []);

  const handleSend = async () => {
    if (!sendAmount || !sendToAddress) return;
    
    setIsSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`${sendAmount} ${selectedToken} würde an ${sendToAddress} gesendet werden.`);
      setSendAmount("");
      setSendToAddress("");
    } catch (error) {
      console.error("Fehler beim Senden:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token senden
        </h2>
        <p className="text-zinc-400">Senden Sie Token an andere Wallets</p>
      </div>

      {/* Token Auswahl */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">Token auswählen:</label>
        <div className="grid grid-cols-3 gap-3">
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              selectedToken === "DFAITH" 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700/90"
            }`}
            onClick={() => setSelectedToken("DFAITH")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
              <span className="text-sm font-bold text-black">DF</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium">D.FAITH</div>
              <div className="text-[10px] opacity-75">{dfaithBalance}</div>
            </div>
          </button>
          
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              selectedToken === "DINVEST" 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700/90"
            }`}
            onClick={() => setSelectedToken("DINVEST")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
              <FaLock className="text-black text-sm" />
            </div>
            <div className="text-center">
              <div className="text-xs font-medium">D.INVEST</div>
              <div className="text-[10px] opacity-75">0.0000</div>
            </div>
          </button>
          
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              selectedToken === "POL" 
                ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700/90"
            }`}
            onClick={() => setSelectedToken("POL")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium">POL</div>
              <div className="text-[10px] opacity-75">0.0000</div>
            </div>
          </button>
        </div>
      </div>

      {/* D.FAITH Verkaufs-Button */}
      {selectedToken === "DFAITH" && (
        <div className="bg-gradient-to-br from-red-800/20 to-red-900/20 rounded-xl p-4 border border-red-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-red-400">D.FAITH verkaufen</div>
            <div className="text-xs text-zinc-400">Tausche gegen POL</div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={() => setShowDfaithSellModal(true)}
            disabled={parseFloat(dfaithBalance) <= 0}
          >
            <FaPaperPlane className="inline mr-2" />
            D.FAITH verkaufen
          </Button>
        </div>
      )}

      {/* D.FAITH Verkaufs-Modal */}
      {showDfaithSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-auto border border-red-400 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 text-red-400 text-2xl font-bold text-center">D.FAITH verkaufen</div>
            
            {/* D.FAITH Balance */}
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Verfügbare D.FAITH:</span>
                <span className="text-amber-400 font-bold">{dfaithBalance}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                D.FAITH Token zum Verkauf
              </div>
            </div>
            
            {/* Verkaufs-Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">D.FAITH Betrag</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 text-lg font-bold text-amber-400 focus:border-red-500 focus:outline-none"
                  value={sellAmountDfaith}
                  onChange={(e) => setSellAmountDfaith(e.target.value)}
                  disabled={isSellingDfaith}
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setSellAmountDfaith((parseFloat(dfaithBalance) * 0.95).toFixed(2))}
                  disabled={isSellingDfaith || parseFloat(dfaithBalance) <= 0}
                >
                  MAX
                </button>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                D.FAITH wird gegen POL getauscht
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
                  className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:border-red-500 focus:outline-none"
                  value={slippageSell}
                  onChange={(e) => setSlippageSell(e.target.value)}
                  disabled={isSellingDfaith}
                />
                <div className="flex gap-1">
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippageSell("0.5")}
                    disabled={isSellingDfaith}
                  >
                    0.5%
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippageSell("1")}
                    disabled={isSellingDfaith}
                  >
                    1%
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                    onClick={() => setSlippageSell("3")}
                    disabled={isSellingDfaith}
                  >
                    3%
                  </button>
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Höhere Slippage = höhere Erfolgswahrscheinlichkeit
              </div>
            </div>
            
            {/* Estimated Output */}
            {sellAmountDfaith && parseFloat(sellAmountDfaith) > 0 && dfaithPrice && (
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Geschätzte POL:</span>
                  <span className="text-purple-400 font-bold">
                    ~{(parseFloat(sellAmountDfaith) / dfaithPrice).toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Slippage: {slippageSell}% | Minimum: ~{(parseFloat(sellAmountDfaith) / dfaithPrice * (1 - parseFloat(slippageSell)/100)).toFixed(4)}
                </div>
              </div>
            )}
            
            {/* Info wenn keine D.FAITH verfügbar */}
            {parseFloat(dfaithBalance) <= 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xs">⚠️</span>
                  <div className="text-sm text-yellow-400">
                    Sie besitzen keine D.FAITH Token
                  </div>
                </div>
                <div className="text-xs text-yellow-300/70 mt-1">
                  Kaufen Sie zuerst D.FAITH Token
                </div>
              </div>
            )}
            
            {/* Transaction Status */}
            {sellTxStatus && (
              <div className={`mb-4 p-3 rounded-lg text-center ${
                sellTxStatus === "success" ? "bg-green-500/20 text-green-400" :
                sellTxStatus === "error" ? "bg-red-500/20 text-red-400" :
                sellTxStatus === "confirming" ? "bg-blue-500/20 text-blue-400" :
                "bg-yellow-500/20 text-yellow-400"
              }`}>
                {sellTxStatus === "success" && (
                  <div>
                    <div className="font-bold">🎉 Verkauf erfolgreich!</div>
                    <div className="text-xs mt-1">D.FAITH wurde erfolgreich verkauft</div>
                  </div>
                )}
                {sellTxStatus === "error" && (
                  <div>
                    <div className="font-bold">❌ Verkauf fehlgeschlagen!</div>
                    <div className="text-xs mt-1">Bitte versuchen Sie es erneut</div>
                  </div>
                )}
                {sellTxStatus === "confirming" && (
                  <div>
                    <div className="font-bold">⏳ Bestätigung läuft...</div>
                    <div className="text-xs mt-1">Warte auf Blockchain-Bestätigung</div>
                  </div>
                )}
                {sellTxStatus === "pending" && (
                  <div>
                    <div className="font-bold">📝 Transaktion wird vorbereitet...</div>
                    <div className="text-xs mt-1">Bitte bestätigen Sie in Ihrem Wallet</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleDfaithSell}
                disabled={!sellAmountDfaith || parseFloat(sellAmountDfaith) <= 0 || isSellingDfaith || parseFloat(dfaithBalance) <= 0}
              >
                <FaPaperPlane className="inline mr-2" />
                {isSellingDfaith ? (
                  sellTxStatus === "pending" ? "Wallet-Bestätigung..." :
                  sellTxStatus === "confirming" ? "Bestätigung..." :
                  "Verkaufe..."
                ) : parseFloat(dfaithBalance) <= 0 ? "Keine D.FAITH verfügbar" :
                  `${sellAmountDfaith || "0"} D.FAITH → POL (${slippageSell}%)`}
              </Button>
              
              <Button
                className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl"
                onClick={() => {
                  setShowDfaithSellModal(false);
                  setSellAmountDfaith("");
                  setSlippageSell("1");
                  setSellTxStatus(null);
                }}
                disabled={isSellingDfaith}
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rest des ursprünglichen Codes... */}
      {/* Normales Sende-Interface hier */}
      
    </div>
  );
}
