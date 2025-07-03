import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaLock } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { balanceOf } from "thirdweb/extensions/erc20";

export default function SendTab() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");
  const [isSending, setIsSending] = useState(false);
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Token-Konstanten mit neuen Adressen
  const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060";
  const DFAITH_DECIMALS = 2;
  const DINVEST_TOKEN = "0x0000000000000000000000000000000000000000"; // Ersetze ggf. durch echte Adresse
  const DINVEST_DECIMALS = 4;
  const POL_TOKEN = "0x0000000000000000000000000000000000001010";
  const POL_DECIMALS = 18;

  // Balances
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [dinvestBalance, setDinvestBalance] = useState("0.0000");
  const [polBalance, setPolBalance] = useState("0.0000");

  // Balances laden
  useEffect(() => {
    if (!account?.address) {
      setDfaithBalance("0.00");
      setDinvestBalance("0.0000");
      setPolBalance("0.0000");
      return;
    }
    // D.FAITH
    (async () => {
      try {
        const contract = getContract({ client, chain: polygon, address: DFAITH_TOKEN });
        const bal = await balanceOf({ contract, address: account.address });
        setDfaithBalance((Number(bal) / Math.pow(10, DFAITH_DECIMALS)).toFixed(2));
      } catch { setDfaithBalance("0.00"); }
    })();
    // D.INVEST
    (async () => {
      try {
        const contract = getContract({ client, chain: polygon, address: DINVEST_TOKEN });
        const bal = await balanceOf({ contract, address: account.address });
        setDinvestBalance((Number(bal) / Math.pow(10, DINVEST_DECIMALS)).toFixed(4));
      } catch { setDinvestBalance("0.0000"); }
    })();
    // POL (native)
    (async () => {
      try {
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
        setPolBalance((Number(BigInt(data.result)) / Math.pow(10, POL_DECIMALS)).toFixed(4));
      } catch { setPolBalance("0.0000"); }
    })();
  }, [account?.address, isSending]);

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

  // MAX-Button Logik
  const handleMax = () => {
    if (selectedToken === "DFAITH") setSendAmount(dfaithBalance);
    else if (selectedToken === "DINVEST") setSendAmount(dinvestBalance);
    else if (selectedToken === "POL") setSendAmount(polBalance);
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2 tracking-tight drop-shadow">
          Token senden
        </h2>
        <p className="text-zinc-400 text-base">Senden Sie Token an andere Wallets</p>
      </div>

      {/* Token Auswahl */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-zinc-300 mb-1">Token auswählen</label>
        <div className="flex gap-4 justify-center">
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 shadow transition-all duration-150 ${
              selectedToken === "DFAITH" 
                ? "bg-gradient-to-br from-amber-400/60 to-yellow-500/80 text-amber-900 border-amber-400 scale-105"
                : "bg-zinc-900/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800/80"
            }`}
            onClick={() => setSelectedToken("DFAITH")}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center shadow">
              <span className="text-lg font-bold text-black">DF</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold">D.FAITH</div>
              <div className="text-[11px] opacity-80">{dfaithBalance}</div>
            </div>
          </button>
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 shadow transition-all duration-150 ${
              selectedToken === "DINVEST" 
                ? "bg-gradient-to-br from-amber-400/60 to-yellow-500/80 text-amber-900 border-amber-400 scale-105"
                : "bg-zinc-900/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800/80"
            }`}
            onClick={() => setSelectedToken("DINVEST")}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center shadow">
              <FaLock className="text-black text-lg" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold">D.INVEST</div>
              <div className="text-[11px] opacity-80">{dinvestBalance}</div>
            </div>
          </button>
          <button 
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 shadow transition-all duration-150 ${
              selectedToken === "POL" 
                ? "bg-gradient-to-br from-purple-400/60 to-purple-600/80 text-purple-900 border-purple-400 scale-105"
                : "bg-zinc-900/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800/80"
            }`}
            onClick={() => setSelectedToken("POL")}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center shadow">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold">POL</div>
              <div className="text-[11px] opacity-80">{polBalance}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Sende-Interface */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 rounded-3xl p-8 border-2 border-zinc-800 shadow-xl space-y-8">
        {/* Empfänger Adresse */}
        <div>
          <label className="text-sm font-semibold text-zinc-300 mb-2 block">Empfänger Adresse</label>
          <input 
            type="text"
            placeholder="0x..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-4 px-5 text-zinc-200 font-mono text-base focus:border-amber-500 focus:outline-none transition"
            value={sendToAddress}
            onChange={(e) => setSendToAddress(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Betrag */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-zinc-300">Betrag</label>
            <span className="text-xs text-zinc-500">
              Verfügbar: <span className={selectedToken === "POL" ? "text-purple-400" : "text-amber-400"}>
                {selectedToken === "DFAITH" ? dfaithBalance : selectedToken === "DINVEST" ? dinvestBalance : polBalance} {selectedToken}
              </span>
            </span>
          </div>
          <div className="relative">
            <input 
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-4 px-5 pr-20 text-zinc-200 text-lg font-bold focus:border-amber-500 focus:outline-none transition"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              autoComplete="off"
            />
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition"
              onClick={handleMax}
              type="button"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Transaktionsdetails */}
        <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 rounded-xl p-5 border border-zinc-700 shadow-inner">
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
          className={`w-full py-4 font-extrabold rounded-2xl text-lg shadow-lg transition-all ${
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
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 shadow flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
          <span className="text-yellow-400 text-base">⚠</span>
        </div>
        <div>
          <div className="font-semibold text-yellow-400 mb-1">Wichtiger Hinweis</div>
          <div className="text-sm text-zinc-400">
            Überprüfen Sie die Empfängeradresse sorgfältig. Blockchain-Transaktionen können nicht rückgängig gemacht werden.
          </div>
        </div>
      </div>
    </div>
  );
}
