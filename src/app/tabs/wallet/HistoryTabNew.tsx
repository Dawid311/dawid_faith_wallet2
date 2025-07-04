import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaHistory } from "react-icons/fa";
import { useAccount } from 'wagmi';
import { base } from 'wagmi/chains';

export default function HistoryTab() {
  const { address: account } = useAccount();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactionHistory = async () => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      // Hier würden Sie die Transaktionshistorie vom Base-Netzwerk laden
      // z.B. über Basescan API oder andere Blockchain-Explorer
      console.log(`Lade Transaktionshistorie für ${account} auf Base`);
      
    } catch (error) {
      console.error("Fehler beim Laden der Historie:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
          <FaHistory className="text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Transaktionshistorie</h2>
        <p className="text-zinc-400">Deine D.FAITH-Transaktionen auf Base</p>
      </div>

      {/* Lade-Button */}
      <div className="text-center">
        <Button
          onClick={loadTransactionHistory}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Lade..." : "Historie laden"}
        </Button>
      </div>

      {/* Transaktionsliste */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">Keine Transaktionen gefunden</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <div key={index} className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                {/* Transaktionsdetails würden hier angezeigt */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info-Bereich */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-medium mb-2">🚧 In Entwicklung</p>
        <p className="text-zinc-300 text-sm">
          Die Transaktionshistorie wird derzeit für das Base-Netzwerk implementiert. Integration mit Basescan API geplant.
        </p>
      </div>
    </div>
  );
}
