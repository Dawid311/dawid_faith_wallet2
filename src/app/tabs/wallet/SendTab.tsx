import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaLock, FaCoins, FaEthereum, FaExchangeAlt, FaWallet } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { base } from "thirdweb/chains";
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

  // Token-Konstanten mit neuen Adressen auf Base
  const DFAITH_TOKEN = TOKEN_ADDRESSES.DFAITH;
  const DFAITH_DECIMALS = TOKEN_DECIMALS.DFAITH;
  const DINVEST_TOKEN = TOKEN_ADDRESSES.DINVEST;
  const DINVEST_DECIMALS = TOKEN_DECIMALS.DINVEST;
  const ETH_TOKEN = TOKEN_ADDRESSES.NATIVE_ETH;
  const ETH_DECIMALS = TOKEN_DECIMALS.ETH;

  // Balances
  const [dfaithBalance, setDfaithBalance] = useState("0.00");
  const [dinvestBalance, setDinvestBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0.0000");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  useEffect(() => {
    if (!account?.address) {
      setDfaithBalance("0.00");
      setDinvestBalance("0");
      setEthBalance("0.0000");
      return;
    }

    const loadBalances = async () => {
      setIsLoadingBalances(true);
      try {
        const balances = await fetchAllBalances(account.address);
        console.log("SendTab: Geladene Balances:", balances);
        
        // Nur die Balances aktualisieren wenn sie erfolgreich geladen wurden
        if (balances.dfaith !== undefined) setDfaithBalance(balances.dfaith);
        if (balances.dinvest !== undefined) setDinvestBalance(balances.dinvest);
        if (balances.eth !== undefined) setEthBalance(balances.eth);
      } catch (error) {
        console.error("Fehler beim Laden der Balances:", error);
        // Bei Fehlern die alten Werte beibehalten, nicht auf "0" setzen
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadBalances();
    const interval = setInterval(loadBalances, 10000); // Update alle 10 Sekunden
    return () => clearInterval(interval);
  }, [account?.address]);

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
    } else if (selectedToken === "ETH") {
      maxValue = ethBalance.replace(",", ".");
    }
    setSendAmount(maxValue);
  };

  const tokenOptions = [
    { 
      key: "DFAITH", 
      label: "D.FAITH", 
      symbol: "DFAITH",
      balance: dfaithBalance,
      icon: "🚀",
      color: "from-amber-400 to-yellow-500",
      description: "Faith Token"
    },
    { 
      key: "DINVEST", 
      label: "D.INVEST", 
      symbol: "DINVEST",
      balance: dinvestBalance,
      icon: "💎",
      color: "from-blue-400 to-blue-600",
      description: "Investment Token"
    },
    { 
      key: "ETH", 
      label: "Ethereum", 
      symbol: "ETH",
      balance: ethBalance,
      icon: "⟠",
      color: "from-purple-400 to-purple-600",
      description: "Native ETH"
    },
  ];

  const getTokenIcon = (tokenKey: string) => {
    switch (tokenKey) {
      case "DFAITH":
        return <FaCoins className="text-amber-400" />;
      case "DINVEST":
        return <FaWallet className="text-blue-400" />;
      case "ETH":
        return <FaEthereum className="text-purple-400" />;
      default:
        return <FaCoins className="text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token senden
        </h2>
        <p className="text-zinc-400 text-sm">Wähle einen Token und sende ihn sicher an eine andere Wallet</p>
      </div>

      {/* Wallet Status */}
      {!account?.address && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
          <FaLock className="text-red-400 text-2xl mx-auto mb-2" />
          <p className="text-red-400 font-medium">Wallet nicht verbunden</p>
          <p className="text-red-300 text-sm">Verbinde deine Wallet um Token zu senden</p>
        </div>
      )}

      {account?.address && (
        <>
          {/* Token-Auswahl Grid */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <FaCoins className="text-amber-400" />
              Token auswählen:
            </label>
            <div className="grid gap-3">
              {tokenOptions.map((token) => (
                <div
                  key={token.key}
                  onClick={() => setSelectedToken(token.key)}
                  className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
                    selectedToken === token.key
                      ? `bg-gradient-to-r ${token.color}/20 border-current shadow-lg transform scale-[1.02]`
                      : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/70"
                  }`}
                  style={selectedToken === token.key ? { 
                    borderImage: `linear-gradient(135deg, rgb(251 191 36), rgb(234 179 8)) 1` 
                  } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${token.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {getTokenIcon(token.key)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{token.label}</h3>
                        <p className="text-zinc-400 text-xs">{token.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400 text-lg flex items-center gap-1">
                        {isLoadingBalances ? (
                          <span className="animate-spin">↻</span>
                        ) : (
                          token.balance
                        )}
                      </div>
                      <div className="text-zinc-500 text-xs font-medium">{token.symbol}</div>
                    </div>
                  </div>
                  {selectedToken === token.key && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-black text-xs font-bold">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ausgewählter Token Info */}
          {selectedToken && (
            <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${tokenOptions.find(t => t.key === selectedToken)?.color} flex items-center justify-center`}>
                    {getTokenIcon(selectedToken)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {tokenOptions.find(t => t.key === selectedToken)?.label}
                    </h4>
                    <p className="text-zinc-400 text-xs">Ausgewählt zum Senden</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold flex items-center gap-1">
                    {isLoadingBalances ? (
                      <span className="animate-spin">↻</span>
                    ) : (
                      tokenOptions.find(t => t.key === selectedToken)?.balance
                    )}
                  </div>
                  <div className="text-zinc-500 text-xs">Verfügbar</div>
                </div>
              </div>
            </div>
          )}

          {/* Betrag Eingabe */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <FaExchangeAlt className="text-amber-400" />
              Betrag eingeben:
            </label>
            
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-700 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step={selectedToken === "DINVEST" ? "1" : "0.000001"}
                    className={`w-full bg-transparent text-2xl font-bold text-white placeholder-zinc-500 focus:outline-none ${
                      sendAmount && parseFloat(sendAmount) > parseFloat(
                        selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
                        selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
                        ethBalance.replace(",", ".")
                      ) ? 'text-red-400' : 'text-white'
                    }`}
                    value={sendAmount}
                    onChange={e => {
                      let val = e.target.value.replace(",", ".");
                      if (selectedToken === "DINVEST") val = val.replace(/\..*$/, "");
                      setSendAmount(val);
                    }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-zinc-400 text-sm">
                      Verfügbar: {tokenOptions.find(t => t.key === selectedToken)?.balance} {selectedToken}
                    </span>
                    <button
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-4 py-1 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                      type="button"
                      onClick={handleMax}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Balance-Validierung */}
              {sendAmount && parseFloat(sendAmount) > parseFloat(
                selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
                selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
                ethBalance.replace(",", ".")
              ) && (
                <div className="mt-2 text-sm text-red-400 bg-red-500/20 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
                  <span>❌</span>
                  <span>Nicht genügend {selectedToken} verfügbar</span>
                </div>
              )}
            </div>
          </div>

          {/* Empfänger Eingabe */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <FaWallet className="text-amber-400" />
              Empfänger Adresse:
            </label>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-700 p-4">
              <input
                type="text"
                placeholder="0x... oder ENS Name"
                className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none font-mono"
                value={sendToAddress}
                onChange={e => setSendToAddress(e.target.value)}
                autoComplete="off"
                inputMode="text"
              />
              <div className="text-xs text-zinc-500 mt-2">
                Base Network Adresse eingeben
              </div>
            </div>
          </div>

          {/* Transaktionsübersicht */}
          {sendAmount && sendToAddress && (
            <div className="bg-gradient-to-r from-zinc-800/60 to-zinc-900/60 rounded-xl p-4 border border-zinc-600/50">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <FaPaperPlane className="text-amber-400" />
                Transaktionsübersicht
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Du sendest:</span>
                  <span className="text-white font-semibold">{sendAmount} {selectedToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">An:</span>
                  <span className="text-amber-400 font-mono text-xs">
                    {sendToAddress.slice(0, 8)}...{sendToAddress.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Netzwerkgebühr:</span>
                  <span className="text-zinc-300">~0.001 ETH</span>
                </div>
                <div className="border-t border-zinc-600 pt-2 flex justify-between">
                  <span className="text-zinc-300 font-semibold">Geschätzte Zeit:</span>
                  <span className="text-green-400 font-semibold">~30 Sekunden</span>
                </div>
              </div>
            </div>
          )}

          {/* Senden Button */}
          <Button
            className={`w-full py-4 font-bold rounded-xl text-lg shadow-lg transition-all ${
              parseFloat(sendAmount) > 0 && 
              sendToAddress && 
              !isSending &&
              parseFloat(sendAmount) <= parseFloat(
                selectedToken === "DFAITH" ? dfaithBalance.replace(",", ".") : 
                selectedToken === "DINVEST" ? dinvestBalance.replace(",", ".") : 
                ethBalance.replace(",", ".")
              )
                ? `bg-gradient-to-r ${tokenOptions.find(t => t.key === selectedToken)?.color} text-black hover:opacity-90 transform hover:scale-[1.02]`
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
                ethBalance.replace(",", ".")
              )
            }
          >
            {isSending ? (
              <div className="flex items-center justify-center gap-2">
                <span className="animate-spin">↻</span>
                <span>Wird gesendet...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FaPaperPlane />
                <span>
                  {sendAmount || "0"} {selectedToken} senden
                </span>
              </div>
            )}
          </Button>

          {/* Sicherheitshinweis */}
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <div>
                <p className="text-yellow-200 font-semibold mb-1">Wichtiger Sicherheitshinweis</p>
                <p className="text-yellow-100 text-xs leading-relaxed">
                  Überprüfe die Empfängeradresse sorgfältig. Blockchain-Transaktionen sind irreversibel und können nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
