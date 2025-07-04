import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaArrowUp, FaExchangeAlt } from "react-icons/fa";
import { useAccount, useWriteContract, useBalance } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseEther } from 'viem';

export default function SellTab() {
  const { address: account } = useAccount();
  const [sellAmount, setSellAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { writeContract } = useWriteContract();

  const handleSell = async () => {
    if (!account || !sellAmount) return;
    
    setIsLoading(true);
    try {
      // Hier würden Sie die spezifische Verkaufslogik für Base implementieren
      console.log(`Verkaufe ${sellAmount} D.FAITH auf Base`);
      
    } catch (error) {
      console.error("Fehler beim Verkauf:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
          <FaArrowUp className="text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-red-400 mb-2">D.FAITH verkaufen</h2>
        <p className="text-zinc-400">Verkaufe deine D.FAITH Token auf Base</p>
      </div>

      {/* Verkaufsformular */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Betrag (D.FAITH)
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-red-400 focus:outline-none"
          />
          <Button
            onClick={handleSell}
            disabled={!sellAmount || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Verkaufe..." : "Verkaufen"}
          </Button>
        </div>
      </div>

      {/* Info-Bereich */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-medium mb-2">🚧 In Entwicklung</p>
        <p className="text-zinc-300 text-sm">
          Die Verkaufsfunktion wird derzeit für das Base-Netzwerk implementiert.
        </p>
      </div>
    </div>
  );
}
