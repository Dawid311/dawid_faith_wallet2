import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaArrowDown, FaExchangeAlt, FaCoins, FaLock } from "react-icons/fa";
import { useActiveAccount } from "thirdweb/react";

type Transaction = {
  id: string;
  type: "send" | "receive";
  token: string;
  amount: string;
  address: string;
  hash: string;
  time: string;
  status: "success" | "pending" | "failed";
};

export default function HistoryTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const account = useActiveAccount();

  // Feste Wallet-Adresse für das Modal
  const targetAddress = "0x651BACc1A1579f2FaaeDA2450CE59bB5E7D26e7d";
  
  // Verwende entweder die verbundene Wallet oder die feste Adresse
  const userAddress = account?.address || targetAddress;

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userAddress) {
        setTransactions([]);
        return;
      }

      setIsLoading(true);
      setError("");
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;
        
        if (!apiKey) {
          throw new Error("Basescan API-Key nicht konfiguriert");
        }
        
        console.log("Using Basescan API Key:", apiKey ? "✓ Configured" : "✗ Missing");
        
        // API-Endpunkte für Basescan (Base Network)
        const endpoints = [
          // Native ETH Transaktionen auf Base
          `https://api.basescan.org/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`,
          // ERC20 Token Transaktionen auf Base
          `https://api.basescan.org/api?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`,
          // Interne Transaktionen auf Base
          `https://api.basescan.org/api?module=account&action=txlistinternal&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
        ];

        // Parallele API-Aufrufe
        const responses = await Promise.allSettled(
          endpoints.map(url => fetch(url).then(res => res.json()))
        );

        let allTransactions: any[] = [];

        // Normale Transaktionen verarbeiten
        if (responses[0].status === 'fulfilled' && responses[0].value.status === "1") {
          const normalTxs = responses[0].value.result.map((tx: any) => ({
            ...tx,
            _type: "normal",
            _category: "POL Transfer"
          }));
          allTransactions.push(...normalTxs);
        }

        // ERC20 Token Transaktionen verarbeiten
        if (responses[1].status === 'fulfilled' && responses[1].value.status === "1") {
          const erc20Txs = responses[1].value.result.map((tx: any) => ({
            ...tx,
            _type: "erc20",
            _category: "Token Transfer"
          }));
          allTransactions.push(...erc20Txs);
        }

        // Interne Transaktionen verarbeiten
        if (responses[2].status === 'fulfilled' && responses[2].value.status === "1") {
          const internalTxs = responses[2].value.result.map((tx: any) => ({
            ...tx,
            _type: "internal",
            _category: "Contract Call"
          }));
          allTransactions.push(...internalTxs);
        }

        // Nach Zeitstempel sortieren (neueste zuerst)
        allTransactions.sort((a, b) => Number(b.timeStamp) - Number(a.timeStamp));

        // Auf unser Transaction-Format mappen
        const mappedTransactions: Transaction[] = allTransactions.slice(0, 50).map((tx: any) => {
          const timestamp = Number(tx.timeStamp) * 1000;
          const date = new Date(timestamp);
          const time = date.toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });

          let type: "send" | "receive" = "send";
          let token = "POL";
          let amount = "0";
          let address = "";
          let decimals = 18;

          // Transaktionsrichtung und Details bestimmen
          if (tx._type === "erc20") {
            token = tx.tokenSymbol || tx.tokenName || "TOKEN";
            decimals = Number(tx.tokenDecimal) || 18;
            
            const value = Number(tx.value) / Math.pow(10, decimals);
            const isReceived = tx.to?.toLowerCase() === userAddress.toLowerCase();
            
            type = isReceived ? "receive" : "send";
            amount = (isReceived ? "+" : "-") + value.toFixed(decimals > 6 ? 6 : decimals);
            address = isReceived ? (tx.from || "") : (tx.to || "");
            
          } else if (tx._type === "internal") {
            token = "POL";
            const value = Number(tx.value) / Math.pow(10, 18);
            const isReceived = tx.to?.toLowerCase() === userAddress.toLowerCase();
            
            type = isReceived ? "receive" : "send";
            amount = (isReceived ? "+" : "-") + value.toFixed(6);
            address = isReceived ? (tx.from || "") : (tx.to || "");
            
          } else {
            // Normal ETH transaction on Base
            token = "ETH";
            const value = Number(tx.value) / Math.pow(10, 18);
            const isReceived = tx.to?.toLowerCase() === userAddress.toLowerCase();
            
            type = isReceived ? "receive" : "send";
            amount = (isReceived ? "+" : "-") + value.toFixed(6);
            address = isReceived ? (tx.from || "") : (tx.to || "");
          }

          // Status bestimmen
          let status: "success" | "pending" | "failed" = "success";
          if (tx.isError === "1" || tx.txreceipt_status === "0") {
            status = "failed";
          } else if (Number(tx.confirmations || 0) === 0) {
            status = "pending";
          }

          return {
            id: tx.hash,
            type,
            token,
            amount,
            address,
            hash: tx.hash,
            time,
            status,
          };
        });

        setTransactions(mappedTransactions);
        
      } catch (err) {
        console.error("Fehler beim Laden der Transaktionen:", err);
        setError("Fehler beim Laden der Transaktionsdaten");
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [userAddress]);

  // Hilfsfunktionen für Anzeige
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "send":
        return <FaPaperPlane className="text-white text-xs" />;
      case "receive":
        return <FaArrowDown className="text-white text-xs" />;
      default:
        return <FaCoins className="text-white text-xs" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "send":
        return "from-red-400 to-red-600";
      case "receive":
        return "from-green-400 to-green-600";
      default:
        return "from-zinc-400 to-zinc-600";
    }
  };

  const getAmountColor = (amount: string) => {
    if (amount.startsWith("+")) return "text-green-400";
    if (amount.startsWith("-")) return "text-red-400";
    return "text-amber-400";
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Transaktionshistorie
        </h2>
        <p className="text-zinc-400">Basescan API Integration - Live Daten</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <span className="ml-3 text-zinc-400">Lade Transaktionen...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !userAddress && (
        <div className="text-center py-8">
          <p className="text-zinc-400">Keine Wallet-Adresse verfügbar.</p>
        </div>
      )}

      {/* No Transactions */}
      {!isLoading && !error && userAddress && transactions.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <FaCoins className="text-4xl text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg mb-2">Keine Transaktionen gefunden</p>
            <p className="text-zinc-500 text-sm">
              Diese Wallet-Adresse hat noch keine aufgezeichneten Transaktionen auf Base Network.
            </p>
          </div>
        </div>
      )}

      {/* Transaktionsliste */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 hover:border-zinc-600 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getTransactionColor(tx.type)} flex items-center justify-center shadow-lg`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <div className="font-medium text-amber-400 capitalize text-lg">
                      {tx.type === "send" && "Gesendet"}
                      {tx.type === "receive" && "Empfangen"}
                    </div>
                    <div className="text-xs text-zinc-500">{tx.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${getAmountColor(tx.amount)}`}>
                    {tx.amount}
                  </div>
                  <div className="text-sm font-semibold text-zinc-400">{tx.token}</div>
                </div>
              </div>
              
              <div className="text-sm text-zinc-400 space-y-2 bg-zinc-900/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {tx.type === "send" ? "An:" : "Von:"}
                  </span>
                  <span className="font-mono text-amber-400">
                    {formatAddress(tx.address)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tx Hash:</span>
                  <span className="font-mono text-blue-400">
                    {formatAddress(tx.hash)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-between items-center mt-4">
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  tx.status === "success" 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : tx.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {tx.status === "success" && "✓ Erfolgreich"}
                  {tx.status === "pending" && "⏳ Ausstehend"}
                  {tx.status === "failed" && "✗ Fehlgeschlagen"}
                </span>
                <a
                  href={`https://basescan.org/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 transition underline font-medium bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 hover:border-amber-500/40"
                >
                  Basescan ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-center py-6">
          <div className="bg-red-500/20 text-red-400 rounded-lg p-4 border border-red-500/30">
            <p className="font-semibold mb-1">Fehler beim Laden</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
            <div className="text-2xl font-bold text-amber-400 mb-1">
              {transactions.length}
            </div>
            <div className="text-xs text-zinc-500">Gesamt</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {transactions.filter(tx => tx.status === "success").length}
            </div>
            <div className="text-xs text-zinc-500">Erfolgreich</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {transactions.filter(tx => tx.status === "failed").length}
            </div>
            <div className="text-xs text-zinc-500">Fehlgeschlagen</div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold px-6 py-2 rounded-lg transition-all"
          disabled={isLoading}
        >
          {isLoading ? "Lädt..." : "Aktualisieren"}
        </Button>
      </div>
    </div>
  );
}
