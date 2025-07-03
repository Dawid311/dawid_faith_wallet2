import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaArrowDown, FaExchangeAlt, FaCoins, FaLock, FaExternalLinkAlt } from "react-icons/fa";
import { useAddress } from "@thirdweb-dev/react";

type Transaction = {
  id: string | number;
  type: string;
  token: string;
  amount: string;
  address: string;
  hash: string;
  time: string;
  status: string;
};

// Polygonscan API-Typen
interface PolygonScanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export default function HistoryTab() {
  const address = useAddress();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Erlaubte Filtertypen als Typ definieren
  type FilterKey = "all" | "dfaith" | "dinvest" | "pol";

  // Token-Adressliste für Filter
  const TOKEN_ADDRESSES: Record<Exclude<FilterKey, "all">, string> = {
    dfaith: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060".toLowerCase(),
    dinvest: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383".toLowerCase(),
    pol: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase()
  };

  // Polygonscan API Konfiguration
  const POLYGONSCAN_API_KEY = "V6Q5223DMWPP3HQJE9IJ8UIHSP3NUHID5K";
  const POLYGONSCAN_API_BASE = "https://api.polygonscan.com/api";

  useEffect(() => {
    if (address) {
      fetchTransactions();
    }
  }, [address, activeFilter, page]);

  // Funktion zum Abrufen der Transaktionen von Polygonscan
  const fetchTransactions = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // API-Endpunkt und Parameter aufbauen
      const endpoint = activeFilter === "all" 
        ? "account" 
        : "token";
      
      let apiUrl = `${POLYGONSCAN_API_BASE}?module=account&action=${endpoint}txlist&address=${address}&page=${page}&offset=10&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;
      
      // Wenn nach Token gefiltert wird, Token-Adresse hinzufügen
      if (activeFilter !== "all") {
        apiUrl = `${POLYGONSCAN_API_BASE}?module=account&action=tokentx&contractaddress=${TOKEN_ADDRESSES[activeFilter]}&address=${address}&page=${page}&offset=10&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;
      }

      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === "1") {
        // Wenn keine Ergebnisse mehr vorhanden sind
        if (data.result.length === 0) {
          setHasMore(false);
        } else {
          // Transaktionen in unser Format konvertieren
          const formattedTx = data.result.map((tx: PolygonScanTransaction) => {
            // Bestimmen des Transaktionstyps
            let type = "unknown";
            let amount = "0";
            
            // Für ERC20 Token-Transaktionen
            if (tx.tokenSymbol) {
              if (tx.from.toLowerCase() === address.toLowerCase()) {
                type = "send";
                amount = `-${(parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toFixed(2)}`;
              } else {
                type = "receive";
                amount = `+${(parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toFixed(2)}`;
              }
            } else {
              // Für normale POL Transaktionen
              if (tx.from.toLowerCase() === address.toLowerCase()) {
                type = "send";
                amount = `-${(parseInt(tx.value) / 1e18).toFixed(4)} POL`;
              } else {
                type = "receive";
                amount = `+${(parseInt(tx.value) / 1e18).toFixed(4)} POL`;
              }
            }

            // Token ermitteln
            const token = tx.tokenSymbol || "POL";

            // Zeit formatieren
            const txDate = new Date(parseInt(tx.timeStamp) * 1000);
            const timeAgo = getTimeAgo(txDate);
            
            return {
              id: tx.hash,
              type,
              token,
              amount,
              address: type === "send" ? tx.to : tx.from,
              hash: tx.hash,
              time: timeAgo,
              status: parseInt(tx.confirmations) > 12 ? "success" : "pending"
            };
          });
          
          // Wenn es die erste Seite ist, ersetzen wir die Transaktionen, sonst fügen wir hinzu
          if (page === 1) {
            setTransactions(formattedTx);
          } else {
            setTransactions(prev => [...prev, ...formattedTx]);
          }
        }
      } else {
        setError(`Fehler beim Laden der Transaktionen: ${data.message}`);
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Transaktionshistorie:", err);
      setError("Netzwerkfehler beim Laden der Transaktionen.");
    } finally {
      setIsLoading(false);
    }
  };

  // Hilfsfunktion für "Zeit vergangen" Anzeige
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) return "gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    if (diffHour < 24) return `vor ${diffHour} Std.`;
    if (diffDay < 7) return `vor ${diffDay} Tagen`;
    
    return date.toLocaleDateString('de-DE');
  };

  // Funktion zum Laden weiterer Transaktionen
  const loadMoreTransactions = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "send":
        return <FaPaperPlane className="text-white text-xs" />;
      case "receive":
        return <FaArrowDown className="text-white text-xs" />;
      case "swap":
      case "bridge":
        return <FaExchangeAlt className="text-white text-xs" />;
      case "stake":
        return <FaLock className="text-white text-xs" />;
      case "reward":
        return <FaCoins className="text-white text-xs" />;
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
      case "swap":
        return "from-orange-400 to-orange-600";
      case "bridge":
        return "from-cyan-400 to-cyan-600";
      case "stake":
        return "from-purple-400 to-purple-600";
      case "reward":
        return "from-yellow-400 to-yellow-600";
      default:
        return "from-zinc-400 to-zinc-600";
    }
  };

  const getAmountColor = (amount: string) => {
    if (amount.startsWith("+")) return "text-green-400";
    if (amount.startsWith("-")) return "text-red-400";
    return "text-amber-400";
  };

  // Link zum Polygonscan erstellen
  const getPolygonscanLink = (hash: string) => {
    return `https://polygonscan.com/tx/${hash}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Transaktionshistorie
        </h2>
        <p className="text-zinc-400">Alle Ihre Wallet-Aktivitäten im Überblick</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex overflow-x-auto pb-2 gap-3 mb-6">
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
            activeFilter === "all" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => {
            setActiveFilter("all");
            setPage(1);
            setHasMore(true);
          }}
        >
          Alle
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
            activeFilter === "dfaith" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => {
            setActiveFilter("dfaith");
            setPage(1);
            setHasMore(true);
          }}
        >
          D.FAITH
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
            activeFilter === "dinvest" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => {
            setActiveFilter("dinvest");
            setPage(1);
            setHasMore(true);
          }}
        >
          D.INVEST
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
            activeFilter === "pol" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => {
            setActiveFilter("pol");
            setPage(1);
            setHasMore(true);
          }}
        >
          POL
        </button>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Ladeanzeige */}
      {isLoading && page === 1 && (
        <div className="flex justify-center p-8">
          <div className="w-12 h-12 border-4 border-t-amber-400 border-zinc-700 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Transaktionsliste */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {transactions.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-zinc-500">
            Keine Transaktionen gefunden
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 hover:border-zinc-600 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getTransactionColor(tx.type)} flex items-center justify-center shadow-lg`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <div className="font-medium text-amber-400 capitalize">
                      {tx.type === "send" && "Gesendet"}
                      {tx.type === "receive" && "Empfangen"}
                      {tx.type === "swap" && "Getauscht"}
                      {tx.type === "bridge" && "Bridge"}
                      {tx.type === "stake" && "Gestaked"}
                      {tx.type === "reward" && "Belohnung"}
                    </div>
                    <div className="text-xs text-zinc-500">{tx.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${getAmountColor(tx.amount)}`}>
                    {tx.amount}
                  </div>
                  <div className="text-xs text-zinc-500">{tx.token}</div>
                </div>
              </div>
              
              <div className="text-xs text-zinc-500 space-y-1">
                <div>
                  {tx.type === "send" && `An: ${tx.address.substring(0, 6)}...${tx.address.substring(tx.address.length - 4)}`}
                  {tx.type === "receive" && `Von: ${tx.address.substring(0, 6)}...${tx.address.substring(tx.address.length - 4)}`}
                  {(tx.type === "swap" || tx.type === "bridge" || tx.type === "stake" || tx.type === "reward") && 
                    `Via: ${tx.address.substring(0, 6)}...${tx.address.substring(tx.address.length - 4)}`}
                </div>
                <div className="font-mono">Hash: {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 6)}</div>
              </div>

              {/* Status Badge und Polygonscan Link */}
              <div className="flex justify-between items-center mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tx.status === "success" 
                    ? "bg-green-500/20 text-green-400" 
                    : tx.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {tx.status === "success" && "Erfolgreich"}
                  {tx.status === "pending" && "Ausstehend"}
                  {tx.status === "failed" && "Fehlgeschlagen"}
                </span>
                
                <a 
                  href={getPolygonscanLink(tx.hash)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                >
                  Auf Polygonscan <FaExternalLinkAlt size={10} />
                </a>
              </div>
            </div>
          ))
        )}
        
        {/* Lade-Indikator für weitere Transaktionen */}
        {isLoading && page > 1 && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-2 border-t-amber-400 border-zinc-700 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && transactions.length > 0 && (
        <Button 
          onClick={loadMoreTransactions}
          disabled={isLoading}
          className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 font-medium py-3 rounded-xl border border-zinc-600 transition-all disabled:opacity-50"
        >
          {isLoading ? "Wird geladen..." : "Weitere Transaktionen laden"}
        </Button>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
          <div className="text-2xl font-bold text-amber-400 mb-1">
            {transactions.length}
          </div>
          <div className="text-xs text-zinc-500">Gesamt-Transaktionen</div>
        </div>
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {transactions.filter(tx => tx.status === "success").length}
          </div>
          <div className="text-xs text-zinc-500">Erfolgreich</div>
        </div>
      </div>
    </div>
  );
}
