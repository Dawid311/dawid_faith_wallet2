import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane, FaArrowDown, FaExchangeAlt, FaCoins, FaLock } from "react-icons/fa";

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

export default function HistoryTab() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Adresse aus Context/Prop holen!
  const userAddress = ""; // TODO: Hier die Wallet-Adresse einfügen

  useEffect(() => {
    if (!userAddress) {
      setTransactions([]);
      return;
    }

    // Polygonscan API Call
    const fetchTx = async () => {
      try {
        const apiKey = "V6Q5223DMWPP3HQJE9IJ8UIHSP3NUHID5K";
        // Alle Transaktionen (MATIC + ERC20)
        const urlNormal = `https://api.polygonscan.com/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        const urlErc20 = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

        const [resNormal, resErc20] = await Promise.all([fetch(urlNormal), fetch(urlErc20)]);
        const dataNormal = await resNormal.json();
        const dataErc20 = await resErc20.json();

        let txs: any[] = [];
        if (dataNormal.status === "1" && Array.isArray(dataNormal.result)) {
          txs = txs.concat(
            dataNormal.result.map((tx: any) => ({
              ...tx,
              _type: "native",
            }))
          );
        }
        if (dataErc20.status === "1" && Array.isArray(dataErc20.result)) {
          txs = txs.concat(
            dataErc20.result.map((tx: any) => ({
              ...tx,
              _type: "erc20",
            }))
          );
        }

        // Sortieren nach Zeitstempel (absteigend)
        txs.sort((a, b) => Number(b.timeStamp) - Number(a.timeStamp));

        // Mapping auf unser Transaction-Format
        const mapped: Transaction[] = txs.map((tx: any) => {
          let type = "send";
          let token = "POL";
          let amount = "";
          let address = "";
          let hash = tx.hash;
          let status = "pending";
          let decimals = 18;

          // Zeit
          const time = new Date(Number(tx.timeStamp) * 1000).toLocaleString();

          if (tx._type === "erc20") {
            // ERC20-Transfer
            token = tx.tokenSymbol || "TOKEN";
            decimals = Number(tx.tokenDecimal) || 18;
            const toAddr: string = tx.to ? String(tx.to) : "";
            const userAddr: string = userAddress ? String(userAddress) : "";
            if (
              toAddr &&
              userAddr &&
              typeof toAddr === "string" &&
              typeof userAddr === "string" &&
              toAddr.toLowerCase?.() === userAddr.toLowerCase?.()
            ) {
              type = "receive";
              amount = "+" + (Number(tx.value) / Math.pow(10, decimals)).toFixed(4);
              address = tx.from;
            } else {
              type = "send";
              amount = "-" + (Number(tx.value) / Math.pow(10, decimals)).toFixed(4);
              address = tx.to;
            }
          } else {
            // Native MATIC
            token = "POL";
            decimals = 18;
            const toAddr = tx.to ? String(tx.to) : "";
            const userAddr = userAddress ? String(userAddress) : "";
            if (
              toAddr &&
              userAddr &&
              typeof toAddr === "string" &&
              typeof userAddr === "string" &&
              toAddr.toLowerCase?.() === userAddr.toLowerCase?.()
            ) {
              type = "receive";
              amount = "+" + (Number(tx.value) / Math.pow(10, decimals)).toFixed(4);
              address = tx.from;
            } else {
              type = "send";
              amount = "-" + (Number(tx.value) / Math.pow(10, decimals)).toFixed(4);
              address = tx.to;
            }
          }

          // Status
          if (tx.isError === "0" && Number(tx.confirmations) > 0) status = "success";
          if (tx.isError === "1") status = "failed";

          return {
            id: hash,
            type,
            token,
            amount,
            address,
            hash,
            time,
            status,
          };
        });

        setTransactions(mapped);
      } catch (e) {
        setTransactions([]);
      }
    };

    fetchTx();
  }, [userAddress]);

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

  const filteredTransactions = transactions.filter(tx => {
    if (activeFilter === "all") return true;
    if (activeFilter === "dfaith") return tx.token.includes("D.FAITH");
    if (activeFilter === "dinvest") return tx.token.includes("D.INVEST");
    if (activeFilter === "pol") return tx.token.includes("POL");
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Transaktionshistorie
        </h2>
        <p className="text-zinc-400">Alle Ihre Wallet-Aktivitäten im Überblick</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-6">
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === "all" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => setActiveFilter("all")}
        >
          Alle
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === "dfaith" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => setActiveFilter("dfaith")}
        >
          D.FAITH
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === "dinvest" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => setActiveFilter("dinvest")}
        >
          D.INVEST
        </button>
        <button 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === "pol" 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-zinc-700/50 text-zinc-400 border border-zinc-600 hover:bg-zinc-600/50"
          }`}
          onClick={() => setActiveFilter("pol")}
        >
          POL
        </button>
      </div>

      {/* Transaktionsliste */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredTransactions.map((tx) => (
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
                {tx.type === "send" && `An: ${tx.address}`}
                {tx.type === "receive" && `Von: ${tx.address}`}
                {(tx.type === "swap" || tx.type === "bridge" || tx.type === "stake" || tx.type === "reward") && `Via: ${tx.address}`}
              </div>
              <div className="font-mono">Hash: {tx.hash}</div>
            </div>

            {/* Status Badge */}
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
              
              <button className="text-xs text-amber-400 hover:text-amber-300 transition">
                Details anzeigen →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      <Button className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 font-medium py-3 rounded-xl border border-zinc-600 transition-all">
        Weitere Transaktionen laden
      </Button>

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

// Hilfsfunktion zum Speichern
function saveTransaction(tx: Transaction) {
  const history = JSON.parse(localStorage.getItem("walletHistory") || "[]");
  history.unshift(tx); // Neueste zuerst
  localStorage.setItem("walletHistory", JSON.stringify(history));
}

// Beispiel-Aufruf nach erfolgreicher Aktion:
// saveTransaction({
//   id: Date.now(),
//   type: "send",
//   token: "D.FAITH",
//   amount: "-250.0000",
//   address: "0x8A7b...C4d9",
//   hash: "0xa1b2...c3d4",
//   time: "gerade eben",
//   status: "success"
// });
//   hash: "0xa1b2...c3d4",
//   time: "gerade eben",
//   status: "success"
// });
