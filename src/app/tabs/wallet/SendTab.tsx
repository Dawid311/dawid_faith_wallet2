import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaLock } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { fetchAllBalances, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "../../utils/balanceUtils";

export default function SendTab() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");
  const [isSending, setIsSending] = useState(false);
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Token-Konstanten mit neuen Adressen
  const DFAITH_TOKEN = TOKEN_ADDRESSES.DFAITH;
  const DFAITH_DECIMALS = TOKEN_DECIMALS.DFAITH;
  const DINVEST_TOKEN = TOKEN_ADDRESSES.DINVEST;
  const DINVEST_DECIMALS = TOKEN_DECIMALS.DINVEST;
  const POL_TOKEN = TOKEN_ADDRESSES.NATIVE_POL;
  const POL_DECIMALS = TOKEN_DECIMALS.POL;

  // Balances
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [dinvestBalance, setDinvestBalance] = useState("0");
  const [polBalance, setPolBalance] = useState("0.0000");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  useEffect(() => {
    if (!account?.address) {
      setDfaithBalance("0.00");
      setDinvestBalance("0");
      setPolBalance("0.0000");
      return;
    }

    const loadBalances = async () => {
      setIsLoadingBalances(true);
      try {
        const balances = await fetchAllBalances(account.address);
        console.log("SendTab: Geladene Balances:", balances);
        setDfaithBalance(balances.dfaith);
        setDinvestBalance(balances.dinvest);
        setPolBalance(balances.pol);
      } catch (error) {
        console.error("Fehler beim Laden der Balances:", error);
        setDfaithBalance("0.00");
        setDinvestBalance("0");
        setPolBalance("0.0000");
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadBalances();
    const interval = setInterval(loadBalances, 10000); // Update alle 10 Sekunden
    return () => clearInterval(interval);
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
    let maxValue = "";
    if (selectedToken === "DFAITH") {
      maxValue = dfaithBalance.replace(",", ".");
    } else if (selectedToken === "DINVEST") {
      maxValue = dinvestBalance.replace(",", ".");
    } else if (selectedToken === "POL") {
      maxValue = polBalance.replace(",", ".");
    }
    setSendAmount(maxValue);
  };

  const tokenOptions = [
    { key: "DFAITH", label: "D.FAITH", balance: dfaithBalance },
    { key: "DINVEST", label: "D.INVEST", balance: dinvestBalance },
    { key: "POL", label: "POL", balance: polBalance },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
        Token senden
      </h2>

      {/* Token-Auswahl als Buttons mit verbesserter Balance-Anzeige */}
      <div className="space-y-3 mb-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">Token auswählen:</div>
        <div className="grid grid-cols-1 gap-2">
          {tokenOptions.map((t) => (
            <button
              key={t.key}
              className={`w-full p-3 rounded-lg font-medium text-sm transition border flex justify-between items-center
                ${selectedToken === t.key
                  ? "bg-amber-500/20 text-amber-400 border-amber-400"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/60"}
              `}
              onClick={() => setSelectedToken(t.key)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  selectedToken === t.key ? 'bg-amber-400' : 'bg-zinc-600'
                }`}></div>
                <span className="font-semibold">{t.label}</span>
              </div>
              <div className="text-right">
                <div className={`font-bold ${selectedToken === t.key ? 'text-amber-300' : 'text-zinc-200'}`}>
                  {isLoadingBalances ? (
                    <span className="animate-pulse">Laden...</span>
                  ) : (
                    t.balance
                  )}
                </div>
                <div className="text-xs text-zinc-500">Verfügbar</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Betrag mit Balance-Validierung */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-zinc-300">Betrag:</label>
          <div className="text-xs text-zinc-500">
            Verfügbar: <span className="text-amber-400 font-semibold">
              {selectedToken === "DFAITH" ? dfaithBalance : 
               selectedToken === "DINVEST" ? dinvestBalance : polBalance} {selectedToken}
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Betrag"
            min="0"
            step={selectedToken === "DINVEST" ? "1" : "0.01"}
            className={`flex-1 bg-zinc-900 border rounded px-3 py-2 text-zinc-200 ${
              sendAmount && parseFloat(sendAmount) > parseFloat(
                selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
                selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
                polBalance.replace(",", ".")
              ) ? 'border-red-500 focus:border-red-400' : 'border-zinc-700 focus:border-amber-500'
            } focus:outline-none`}
            value={sendAmount}
            onChange={e => {
              let val = e.target.value.replace(",", "."); // Komma durch Punkt ersetzen
              if (selectedToken === "DINVEST") val = val.replace(/\..*$/, ""); // Nur ganze Zahlen
              setSendAmount(val);
            }}
          />
          <button
            className="bg-amber-500/20 text-amber-400 px-3 py-2 rounded hover:bg-amber-500/30 transition-colors font-medium"
            type="button"
            onClick={handleMax}
          >
            MAX
          </button>
        </div>
        {/* Balance-Validierung */}
        {sendAmount && parseFloat(sendAmount) > parseFloat(
          selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
          selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
          polBalance.replace(",", ".")
        ) && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            ❌ Nicht genügend {selectedToken} verfügbar
          </div>
        )}
      </div>

      {/* Empfängerfeld */}
      <input
        type="text"
        placeholder="Empfänger (0x...)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200"
        value={sendToAddress}
        onChange={e => setSendToAddress(e.target.value)}
        autoComplete="off"
        inputMode="text"
      />

      {/* Kompakte Transaktionsdetails */}
      <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 justify-between px-1">
        <span>Netzwerkgebühr: ~0.001 POL</span>
        <span>Gesamt: {sendAmount || "0.00"} {selectedToken}</span>
        <span>Zeit: ~30s</span>
      </div>

      {/* Senden Button mit verbesserter Validierung */}
      <Button
        className={`w-full py-3 font-bold rounded-xl text-base shadow ${
          parseFloat(sendAmount) > 0 && 
          sendToAddress && 
          !isSending &&
          parseFloat(sendAmount) <= parseFloat(
            selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
            selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
            polBalance.replace(",", ".")
          )
            ? selectedToken === "POL"
              ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:opacity-90"
              : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:opacity-90"
            : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
        }`}
        onClick={handleSend}
        disabled={
          parseFloat(sendAmount) <= 0 || 
          !sendToAddress || 
          isSending ||
          parseFloat(sendAmount) > parseFloat(
            selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
            selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
            polBalance.replace(",", ".")
          )
        }
      >
        {isSending ? (
          <span>Wird gesendet...</span>
        ) : (
          <>
            <FaPaperPlane className="inline mr-2" />
            {sendAmount || "0"} {selectedToken} senden
          </>
        )}
      </Button>

      {/* Warnung */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs flex items-center gap-2 mt-2">
        <span className="text-yellow-400">⚠</span>
        <span>Empfängeradresse sorgfältig prüfen. Transaktionen sind endgültig.</span>
      </div>
    </div>
  );
}
