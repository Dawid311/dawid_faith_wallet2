import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaLock, FaTimes, FaCheck, FaExternalLinkAlt, FaSpinner } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { getContract, prepareContractCall, prepareTransaction, toWei } from "thirdweb";
import { client } from "../../client";
import { fetchAllBalances, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "../../utils/balanceUtils";

export default function SendTab() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");
  const [isSending, setIsSending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
    if (!sendAmount || !sendToAddress || !account?.address) {
      setErrorMessage("Bitte alle Felder ausfüllen und Wallet verbinden.");
      setShowErrorModal(true);
      return;
    }
    
    setIsSending(true);
    try {
      let transaction;
      const amount = parseFloat(sendAmount);
      
      if (selectedToken === "ETH") {
        // Native ETH Transfer
        const ethTransaction = prepareTransaction({
          client,
          chain: base,
          to: sendToAddress,
          value: toWei(sendAmount),
        });
        
        transaction = await sendTransaction(ethTransaction);
      } else {
        // ERC20 Token Transfer
        const tokenAddress = selectedToken === "DFAITH" ? DFAITH_TOKEN : DINVEST_TOKEN;
        const decimals = selectedToken === "DFAITH" ? DFAITH_DECIMALS : DINVEST_DECIMALS;
        
        const contract = getContract({
          client,
          chain: base,
          address: tokenAddress,
        });

        const transferCall = prepareContractCall({
          contract,
          method: "function transfer(address to, uint256 amount) returns (bool)",
          params: [
            sendToAddress,
            BigInt(Math.floor(amount * Math.pow(10, decimals))),
          ],
        });

        transaction = await sendTransaction(transferCall);
      }

      // Erfolg
      setTransactionHash(transaction.transactionHash);
      setShowSuccessModal(true);
      setSendAmount("");
      setSendToAddress("");
      
    } catch (error: any) {
      console.error("Fehler beim Senden:", error);
      setErrorMessage(error.message || "Transaktion fehlgeschlagen. Bitte versuchen Sie es erneut.");
      setShowErrorModal(true);
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

  // Validierungsfunktionen
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getCurrentBalance = () => {
    if (selectedToken === "DFAITH") return parseFloat(dfaithBalance.replace(",", "."));
    if (selectedToken === "DINVEST") return parseFloat(dinvestBalance.replace(",", "."));
    return parseFloat(ethBalance.replace(",", "."));
  };

  const tokenOptions = [
    { key: "DFAITH", label: "D.FAITH", balance: dfaithBalance },
    { key: "DINVEST", label: "D.INVEST", balance: dinvestBalance },
    { key: "ETH", label: "ETH", balance: ethBalance },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
        Token senden
      </h2>

      {/* Erfolgs-Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md shadow-2xl animate-pulse">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaCheck className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-green-400 mb-2">Transaktion erfolgreich!</h3>
              <p className="text-zinc-300 mb-4">
                {sendAmount} {selectedToken} wurde erfolgreich gesendet.
              </p>
              
              {/* Transaction Details */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Betrag:</span>
                    <span className="text-green-400 font-semibold">{sendAmount} {selectedToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">An:</span>
                    <span className="text-amber-400 font-mono text-xs">
                      {sendToAddress.slice(0, 6)}...{sendToAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">TX Hash:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-mono text-xs">
                        {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                      </span>
                      <a
                        href={`https://basescan.org/tx/${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 transition"
                      >
                        <FaExternalLinkAlt className="text-xs" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fehler-Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl border border-red-500/30 p-6 w-full max-w-md shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaTimes className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Transaktion fehlgeschlagen</h3>
              <p className="text-zinc-300 mb-4">
                {errorMessage}
              </p>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">
                  ⚠ Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.
                </p>
              </div>

              <Button
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token-Auswahl als Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Token auswählen:</label>
        <div className="relative">
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-zinc-200 focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
          >
            {tokenOptions.map((t) => (
              <option key={t.key} value={t.key} className="bg-zinc-900 text-zinc-200">
                {t.label} - {t.balance} verfügbar
              </option>
            ))}
          </select>
          {/* Custom Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {/* Balance-Info für den ausgewählten Token */}
        <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
            <span className="text-sm font-medium text-zinc-300">
              {tokenOptions.find(t => t.key === selectedToken)?.label}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-amber-400">
              <span className="inline-flex items-center gap-1">
                {tokenOptions.find(t => t.key === selectedToken)?.balance}
                {isLoadingBalances && (
                  <span className="animate-spin text-xs opacity-60">↻</span>
                )}
              </span>
            </div>
            <div className="text-xs text-zinc-500">Verfügbar</div>
          </div>
        </div>
      </div>

      {/* Betrag mit Balance-Validierung */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-zinc-300">Betrag:</label>
          <div className="text-xs text-zinc-500">
            Verfügbar: <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
              <span>
                {selectedToken === "DFAITH" ? dfaithBalance : 
                 selectedToken === "DINVEST" ? dinvestBalance : ethBalance} {selectedToken}
              </span>
              {isLoadingBalances && (
                <span className="animate-spin text-xs opacity-60">↻</span>
              )}
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
              sendAmount && parseFloat(sendAmount) > getCurrentBalance()
                ? 'border-red-500 focus:border-red-400' 
                : 'border-zinc-700 focus:border-amber-500'
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
        {sendAmount && parseFloat(sendAmount) > getCurrentBalance() && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            ❌ Nicht genügend {selectedToken} verfügbar
          </div>
        )}
      </div>

      {/* Empfängerfeld mit Validierung */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Empfängeradresse:</label>
        <input
          type="text"
          placeholder="0x... (Base Adresse)"
          className={`w-full bg-zinc-900 border rounded-lg px-3 py-3 text-zinc-200 font-mono text-sm ${
            sendToAddress && !isValidAddress(sendToAddress) 
              ? 'border-red-500 focus:border-red-400' 
              : 'border-zinc-700 focus:border-amber-500'
          } focus:outline-none transition-colors`}
          value={sendToAddress}
          onChange={e => setSendToAddress(e.target.value.trim())}
          autoComplete="off"
          inputMode="text"
        />
        {/* Adressvalidierung */}
        {sendToAddress && !isValidAddress(sendToAddress) && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 flex items-center gap-2">
            <span>❌</span>
            <span>Ungültige Ethereum-Adresse (muss mit 0x beginnen und 42 Zeichen lang sein)</span>
          </div>
        )}
        {sendToAddress && isValidAddress(sendToAddress) && (
          <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded p-2 flex items-center gap-2">
            <span>✅</span>
            <span>Gültige Adresse</span>
          </div>
        )}
      </div>

      {/* Kompakte Transaktionsdetails */}
      <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 justify-between px-1">
        <span>Netzwerkgebühr: ~0.001 ETH</span>
        <span>Gesamt: {sendAmount || "0.00"} {selectedToken}</span>
        <span>Zeit: ~30s</span>
      </div>

      {/* Wallet-Verbindungscheck */}
      {!account?.address && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <FaLock className="text-yellow-400 text-2xl mx-auto mb-2" />
          <p className="text-yellow-400 font-semibold mb-1">Wallet nicht verbunden</p>
          <p className="text-zinc-400 text-sm">Bitte verbinden Sie Ihre Wallet, um Transaktionen durchzuführen.</p>
        </div>
      )}

      {/* Senden Button mit verbesserter Validierung */}
      <Button
        className={`w-full py-3 font-bold rounded-xl text-base shadow transition-all duration-200 ${
          parseFloat(sendAmount) > 0 && 
          sendToAddress && 
          isValidAddress(sendToAddress) &&
          account?.address &&
          !isSending &&
          parseFloat(sendAmount) <= getCurrentBalance()
            ? selectedToken === "ETH"
              ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
        }`}
        onClick={handleSend}
        disabled={
          parseFloat(sendAmount) <= 0 || 
          !sendToAddress || 
          !isValidAddress(sendToAddress) ||
          !account?.address ||
          isSending ||
          parseFloat(sendAmount) > getCurrentBalance()
        }
      >
        {!account?.address ? (
          <span className="flex items-center justify-center gap-2">
            <FaLock className="text-sm" />
            Wallet verbinden
          </span>
        ) : isSending ? (
          <span className="flex items-center justify-center gap-2">
            <FaSpinner className="animate-spin" />
            Wird gesendet...
          </span>
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
