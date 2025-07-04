import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaLock, FaUnlock } from "react-icons/fa";
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { CONTRACTS } from '../../onchainConfig';

export default function StakeTab() {
  const { address: account } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  
  const { writeContract } = useWriteContract();

  // Gestakte Balance lesen (falls Staking-Contract verfügbar)
  const { data: stakedBalance } = useReadContract({
    address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
    abi: [{
      inputs: [{ name: 'user', type: 'address' }],
      name: 'stakedBalance',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    }],
    functionName: 'stakedBalance',
    args: account ? [account] : undefined,
    chainId: base.id,
  });

  const handleStake = async () => {
    if (!account || !stakeAmount) return;
    
    setIsStaking(true);
    try {
      // Hier würden Sie die Staking-Logik implementieren
      console.log(`Stake ${stakeAmount} D.INVEST auf Base`);
      
    } catch (error) {
      console.error("Fehler beim Staking:", error);
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!account || !unstakeAmount) return;
    
    setIsUnstaking(true);
    try {
      // Hier würden Sie die Unstaking-Logik implementieren
      console.log(`Unstake ${unstakeAmount} D.INVEST auf Base`);
      
    } catch (error) {
      console.error("Fehler beim Unstaking:", error);
    } finally {
      setIsUnstaking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
          <FaLock className="text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">D.INVEST Staking</h2>
        <p className="text-zinc-400">Stake deine D.INVEST Token und verdiene Belohnungen</p>
      </div>

      {/* Gestakte Balance */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
        <h3 className="text-green-400 font-medium mb-2">Gestakte Balance</h3>
        <div className="text-3xl font-bold text-green-400">
          {stakedBalance ? stakedBalance.toString() : "0"} D.INVEST
        </div>
      </div>

      {/* Staking-Formular */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 space-y-4">
        <h3 className="text-lg font-bold text-zinc-200 mb-4">Staken</h3>
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Betrag (D.INVEST)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-green-400 focus:outline-none"
            />
            <Button
              onClick={handleStake}
              disabled={!stakeAmount || isStaking}
              className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isStaking ? "Stake..." : <><FaLock className="mr-2" /> Staken</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Unstaking-Formular */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 space-y-4">
        <h3 className="text-lg font-bold text-zinc-200 mb-4">Unstaken</h3>
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Betrag (D.INVEST)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-400 focus:outline-none"
            />
            <Button
              onClick={handleUnstake}
              disabled={!unstakeAmount || isUnstaking}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isUnstaking ? "Unstake..." : <><FaUnlock className="mr-2" /> Unstaken</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Staking-Informationen */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">Staking-Belohnungen</h4>
        <p className="text-zinc-300 text-sm mb-2">
          • APR: ~12% (geschätzt)
        </p>
        <p className="text-zinc-300 text-sm mb-2">
          • Belohnungen werden täglich verteilt
        </p>
        <p className="text-zinc-300 text-sm">
          • Kein Lock-up-Zeitraum - jederzeit unstaken möglich
        </p>
      </div>

      {/* Info-Bereich */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-amber-400 font-medium mb-2">🚧 In Entwicklung</p>
        <p className="text-zinc-300 text-sm">
          Das Staking-System wird derzeit für das Base-Netzwerk implementiert. Contract-Deployment und Tests laufen.
        </p>
      </div>
    </div>
  );
}
