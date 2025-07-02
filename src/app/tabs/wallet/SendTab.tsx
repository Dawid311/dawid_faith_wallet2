import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaLock } from "react-icons/fa";

export default function SendTab() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");
  const [isSending, setIsSending] = useState(false);

  // Token-Konstanten mit neuen Adressen
  const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060"; // Neue D.FAITH Token-Adresse
  const DFAITH_DECIMALS = 2; // Neue Dezimalstellen

  const handleSend = async () => {
    if (!sendAmount || !sendToAddress) return;
    
    setIsSending(true);
    try {
      // Simuliere Transaktion
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
              <div className="text-[10px] opacity-75">0.00</div>
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

      {/* Sende-Interface */}
      <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700 space-y-6">
        {/* Empfänger Adresse */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-2 block">Empfänger Adresse</label>
          <input 
            type="text"
            placeholder="0x..."
            className="w-full bg-zinc-900/80 border border-zinc-600 rounded-xl py-3 px-4 text-zinc-300 font-mono text-sm focus:border-amber-500 focus:outline-none"
            value={sendToAddress}
            onChange={(e) => setSendToAddress(e.target.value)}
          />
        </div>

        {/* Betrag */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-zinc-300">Betrag</label>
            <span className="text-xs text-zinc-500">
              Verfügbar: <span className={selectedToken === "POL" ? "text-purple-400" : "text-amber-400"}>
                0.00 {selectedToken}
              </span>
            </span>
          </div>
          <div className="relative">
            <input 
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full bg-zinc-900/80 border border-zinc-600 rounded-xl py-3 px-4 pr-16 text-zinc-300 focus:border-amber-500 focus:outline-none"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition"
              onClick={() => setSendAmount("0.00")}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Transaktionsdetails */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Netzwerkgebühren:</span>
              <span className="text-zinc-300">~0.001 POL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Gesamtkosten:</span>
              <span className="text-zinc-300">
                {sendAmount || "0.00"} {selectedToken} + 0.001 POL
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Geschätzte Zeit:</span>
              <span className="text-zinc-300">~30 Sekunden</span>
            </div>
          </div>
        </div>

        {/* Senden Button */}
        <Button
          className={`w-full py-3 font-bold rounded-xl transition-all ${
            parseFloat(sendAmount) > 0 && sendToAddress && !isSending
              ? selectedToken === "POL" 
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:opacity-90"
                : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:opacity-90"
              : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
          }`}
          onClick={handleSend}
          disabled={parseFloat(sendAmount) <= 0 || !sendToAddress || isSending}
        >
          {isSending ? (
            <div className="flex justify-center items-center gap-2">
              <div className={`w-5 h-5 border-t-2 border-r-2 ${
                selectedToken === "POL" ? "border-white" : "border-black"
              } rounded-full animate-spin`}></div>
              <span>Wird gesendet...</span>
            </div>
          ) : parseFloat(sendAmount) <= 0 || !sendToAddress ? (
            "Betrag und Adresse eingeben"
          ) : (
            <>
              <FaPaperPlane className="inline mr-2" />
              {selectedToken} senden
            </>
          )}
        </Button>
      </div>

      {/* Warnung */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
            <span className="text-yellow-400 text-xs">⚠</span>
          </div>
          <div>
            <div className="font-medium text-yellow-400 mb-1">Wichtiger Hinweis</div>
            <div className="text-sm text-zinc-400">
              Überprüfen Sie die Empfängeradresse sorgfältig. Blockchain-Transaktionen können nicht rückgängig gemacht werden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
