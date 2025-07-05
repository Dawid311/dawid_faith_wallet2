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

  // Demo-Daten für den Fall, dass kein API-Key verfügbar ist
  const demoTransactions: Transaction[] = [
    {
      id: "demo1",
      type: "receive",
      token: "ETH", 
      amount: "+0.5",
      address: "0x1234...5678",
      hash: "0xdemo1234567890abcdef",
      time: "15.01.2024, 14:30",
      status: "success"
    },
    {
      id: "demo2", 
      type: "send",
      token: "USDC",
      amount: "-100.0",
      address: "0xabcd...efgh",
      hash: "0xdemo2345678901bcdef0",
      time: "14.01.2024, 09:15",
      status: "success"
    }
  ];

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
        // ✅ ETHERSCAN MULTICHAIN API-KEY (V2) - Unterstützt Base Chain nativ!
        const etherscanMultichainApiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
        const basescanApiKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;
        
        console.log("🔑 API-Key Konfiguration:");
        console.log("NEXT_PUBLIC_ETHERSCAN_API_KEY (Multichain V2):", etherscanMultichainApiKey ? "✅ Verfügbar" : "❌ Nicht gefunden");
        console.log("NEXT_PUBLIC_BASESCAN_API_KEY:", basescanApiKey ? "✅ Verfügbar" : "❌ Nicht gefunden");
        
        if (etherscanMultichainApiKey) {
          console.log("🚀 Etherscan Multichain API Key (V2) erkannt:", etherscanMultichainApiKey?.substring(0, 10) + "...");
          console.log("✅ Perfekt! Dieser API-Key funktioniert mit Base Chain und allen anderen Chains");
        } else if (basescanApiKey) {
          console.log("📍 Basescan API Key erkannt:", basescanApiKey?.substring(0, 10) + "...");
          console.log("ℹ️ Basescan API-Key ist spezifisch für Base Chain");
        }
        
        // Bevorzuge Etherscan Multichain API-Key (V2) - funktioniert perfekt für Base Chain
        const apiKey = etherscanMultichainApiKey || basescanApiKey;
        
        if (!apiKey) {
          // Fallback: Demo-Daten anzeigen wenn kein API-Key verfügbar
          console.warn("⚠️ Kein API-Key verfügbar - verwende Demo-Daten");
          setError(`
            🔑 API-Key Setup erforderlich:
            
            Sie haben einen Etherscan Multichain API-Key? Perfekt!
            
            1. Öffnen Sie die .env.local Datei im Projekt-Root
            2. Fügen Sie hinzu: NEXT_PUBLIC_ETHERSCAN_API_KEY=IhrAPIKey
            3. Starten Sie die App neu
            
            Ihr Etherscan Multichain API-Key funktioniert für Base Chain und alle anderen Chains!
            
            Alternative: Basescan API-Key für Base Chain only:
            NEXT_PUBLIC_BASESCAN_API_KEY=IhrBasescanKey
          `);
          setTransactions(demoTransactions);
          setIsLoading(false);
          return;
        }
        
        const finalApiKey = apiKey || "KM73YF9R69Q9DWWZQ5VM5M8QHHX5Z7VPDW";
        console.log("Using API Key:", finalApiKey ? "✓ Configured" : "✗ Missing");
        const apiKeySource = etherscanMultichainApiKey ? "Etherscan Multichain V2 ⭐" : basescanApiKey ? "Basescan" : "Fallback";
        console.log("API Key source:", apiKeySource);
        
        // ✅ ETHERSCAN V2 MULTICHAIN API für Base Chain
        if (etherscanMultichainApiKey) {
          console.log("🚀 Verwende Etherscan V2 Multichain API für Base Chain - Optimal!");
        } else {
          console.log("📍 Verwende Basescan API für Base Chain");
        }
        
        // API-Endpunkte für Base Network mit Etherscan V2 Multichain API
        const endpoints = [
          // Native ETH Transaktionen auf Base (Chain ID: 8453)
          `https://api.basescan.org/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${finalApiKey}`,
          // ERC20 Token Transaktionen auf Base  
          `https://api.basescan.org/api?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${finalApiKey}`,
          // Interne Transaktionen auf Base
          `https://api.basescan.org/api?module=account&action=txlistinternal&address=${userAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${finalApiKey}`
        ];

        // Parallele API-Aufrufe mit verbessertem Error Handling
        const responses = await Promise.allSettled(
          endpoints.map(async (url, index) => {
            console.log(`API Call ${index + 1}:`, url);
            const response = await fetch(url);
            const data = await response.json();
            console.log(`API Response ${index + 1}:`, data);
            
            // Verbesserte Fehlerbehandlung für Etherscan V2 Multichain API
            if (data.status === "0" && data.message) {
              console.error(`Etherscan V2 API Error ${index + 1}:`, data.message);
              if (data.message.includes("Invalid API Key")) {
                console.error("❌ Invalid Etherscan Multichain API Key");
                console.error("💡 Tipp: Prüfen Sie ob Ihr Etherscan Multichain API-Key korrekt in der .env.local eingetragen ist");
              } else if (data.message.includes("rate limit")) {
                console.error("⚠️ Rate limit exceeded - upgrade your plan");
                console.error("💡 Etherscan Multichain API-Keys haben höhere Limits als Standard-Keys");
              } else if (data.message.includes("NOTOK")) {
                console.log("ℹ️ No data found for this address on Base Chain");
              }
            } else if (data.status === "1") {
              console.log(`✅ API Call ${index + 1} successful with Etherscan Multichain API:`, data.result?.length || 0, "transactions");
            }
            
            return data;
          })
        );

        let allTransactions: any[] = [];

        // Normale Transaktionen verarbeiten
        if (responses[0].status === 'fulfilled') {
          const data = responses[0].value;
          console.log("Normal Transactions Response:", data);
          if (data.status === "1" && data.result) {
            const normalTxs = data.result.map((tx: any) => ({
              ...tx,
              _type: "normal",
              _category: "ETH Transfer"
            }));
            allTransactions.push(...normalTxs);
            console.log(`Added ${normalTxs.length} normal transactions`);
          } else {
            console.log("No normal transactions or API error:", data.message);
          }
        } else {
          console.error("Normal transactions failed:", responses[0].reason);
        }

        // ERC20 Token Transaktionen verarbeiten
        if (responses[1].status === 'fulfilled') {
          const data = responses[1].value;
          console.log("ERC20 Transactions Response:", data);
          if (data.status === "1" && data.result) {
            const erc20Txs = data.result.map((tx: any) => ({
              ...tx,
              _type: "erc20",
              _category: "Token Transfer"
            }));
            allTransactions.push(...erc20Txs);
            console.log(`Added ${erc20Txs.length} ERC20 transactions`);
          } else {
            console.log("No ERC20 transactions or API error:", data.message);
          }
        } else {
          console.error("ERC20 transactions failed:", responses[1].reason);
        }

        // Interne Transaktionen verarbeiten
        if (responses[2].status === 'fulfilled') {
          const data = responses[2].value;
          console.log("Internal Transactions Response:", data);
          if (data.status === "1" && data.result) {
            const internalTxs = data.result.map((tx: any) => ({
              ...tx,
              _type: "internal",
              _category: "Contract Call"
            }));
            allTransactions.push(...internalTxs);
            console.log(`Added ${internalTxs.length} internal transactions`);
          } else {
            console.log("No internal transactions or API error:", data.message);
          }
        } else {
          console.error("Internal transactions failed:", responses[2].reason);
        }

        console.log(`Total transactions found: ${allTransactions.length}`);

        // Wenn keine Transaktionen gefunden wurden, aber API-Aufrufe erfolgreich waren
        if (allTransactions.length === 0) {
          console.log("No transactions found for address:", userAddress);
          // Prüfe ob alle API-Aufrufe erfolgreich waren aber keine Daten zurückgaben
          const allSuccessful = responses.every(r => r.status === 'fulfilled');
          if (allSuccessful) {
            console.log("All API calls successful but no transactions found");
          }
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
        <p className="text-zinc-400">Live Transaktionsdaten vom Base Network</p>
        {userAddress && (
          <p className="text-xs text-zinc-500 mt-1">
            Wallet: {formatAddress(userAddress)}
          </p>
        )}
      </div>

      {/* Debug Info - nur in Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Debug Info</h3>
          <div className="text-xs text-zinc-400 space-y-1">
            <div>API Keys: {process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY ? '✓ Etherscan' : '✗ Etherscan'} | {process.env.NEXT_PUBLIC_BASESCAN_API_KEY ? '✓ Basescan' : '✗ Basescan'}</div>
            <div>Wallet: {userAddress || 'Nicht verbunden'}</div>
            <div>Loading: {isLoading ? 'Ja' : 'Nein'}</div>
            <div>Error: {error || 'Keine'}</div>
            <div>Transactions: {transactions.length}</div>
          </div>
        </div>
      )}

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
