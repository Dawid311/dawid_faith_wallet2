import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaPaperPlane } from "react-icons/fa";
import { useAccount, useWriteContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseEther } from 'viem';

export default function SendTab() {
  const { address: account } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { writeContract } = useWriteContract();

  const handleSend = async () => {
    if (!account || !recipient || !amount) return;
    
    setIsLoading(true);
    try {
      // Hier würden Sie die Sende-Logik implementieren
      console.log(`Sende ${amount} D.FAITH an ${recipient} auf Base`);
      
    } catch (error) {
      console.error("Fehler beim Senden:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
          <FaPaperPlane className="text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Token senden</h2>
        <p className="text-zinc-400">Sende D.FAITH an eine andere Adresse</p>
      </div>

      {/* Sendeformular */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Empfänger-Adresse
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-400 focus:outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Betrag (D.FAITH)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-400 focus:outline-none"
          />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!recipient || !amount || isLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Sende..." : "Senden"}
        </Button>
      </div>

      {/* Info-Bereich */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-medium mb-2">🚧 In Entwicklung</p>
        <p className="text-zinc-300 text-sm">
          Die Sende-Funktion wird derzeit für das Base-Netzwerk implementiert.
        </p>
      </div>
    </div>
  );
}
