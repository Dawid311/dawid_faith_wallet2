import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaExchangeAlt } from "react-icons/fa";
import { useAccount, useWriteContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseEther } from 'viem';

export default function BuyTab() {
  const { address: account } = useAccount();
  const [buyAmount, setBuyAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { writeContract } = useWriteContract();

  const handleBuy = async () => {
    if (!account || !buyAmount) return;
    
    setIsLoading(true);
    try {
      // Hier würden Sie die spezifische Kauflogik für Base implementieren
      // z.B. über einen DEX wie Uniswap V3 auf Base oder andere DEXes
      console.log(`Kaufe D.FAITH für ${buyAmount} ETH auf Base`);
      
      // Beispiel-Implementation würde hier sein
      // await writeContract({...});
      
    } catch (error) {
      console.error("Fehler beim Kauf:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
          <FaCoins className="text-black text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-amber-400 mb-2">D.FAITH kaufen</h2>
        <p className="text-zinc-400">Kaufe D.FAITH Token auf dem Base-Netzwerk</p>
      </div>

      {/* Kaufformular */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Betrag (ETH)
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
          />
          <Button
            onClick={handleBuy}
            disabled={!buyAmount || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Kaufe..." : "Kaufen"}
          </Button>
        </div>
      </div>

      {/* Info-Bereich */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaExchangeAlt className="text-blue-400" />
          <span className="text-blue-400 font-medium">Base-Netzwerk Info</span>
        </div>
        <p className="text-zinc-300 text-sm">
          Sie kaufen D.FAITH Token auf dem Base-Netzwerk. Stellen Sie sicher, dass Sie genügend ETH für Transaktionsgebühren haben.
        </p>
      </div>

      {/* Platzhalter für DEX-Integration */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-medium mb-2">🚧 In Entwicklung</p>
        <p className="text-zinc-300 text-sm">
          Die DEX-Integration für Base wird derzeit implementiert. Contract-Adressen und Liquiditätspools müssen für das Base-Netzwerk konfiguriert werden.
        </p>
      </div>
    </div>
  );
}
