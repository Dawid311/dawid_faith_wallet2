import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaLock, FaUnlock, FaCoins, FaClock } from "react-icons/fa";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall, resolveMethod } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { useSendTransaction } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc20";

const STAKING_CONTRACT = "0xe730555afA4DeA022976DdDc0cC7DBba1C98568A";
const DINVEST_TOKEN = "0x72a428F03d7a301cEAce084366928b99c4d757bD";
const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID! });

// Hilfsfunktion für Contract-Reads
async function contractRead(contract: any, method: string, args: any[] = []) {
  if (!contract) return undefined;
  if (contract.read && typeof contract.read[method] === "function") {
    return await contract.read[method](...args);
  }
  return await contract[method](...args);
}

export default function StakeTab() {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [available, setAvailable] = useState("0");
  const [staked, setStaked] = useState("0");
  const [rewards, setRewards] = useState("0");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [dinvestDecimals, setDinvestDecimals] = useState(18);

  // Fetch balances
  useEffect(() => {
    if (!account?.address) return;
    setLoading(true);
    (async () => {
      try {
        // D.INVEST Balance mit der korrekten balanceOf Funktion abrufen
        const dinvest = getContract({ client, chain: polygon, address: DINVEST_TOKEN });
        const dinvestBalanceResult = await balanceOf({
          contract: dinvest,
          address: account.address
        });
        
        // Balance formatieren
        const dinvestFormatted = Number(dinvestBalanceResult) / Math.pow(10, 18);
        setAvailable(dinvestFormatted.toFixed(4));
        
        // Staking Contract für gestakte Balance und Rewards
        const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
        
        // Gestakte Balance abrufen
        try {
          const stakedBal = await contractRead(staking, "balanceOf", [account.address]);
          setStaked((Number(stakedBal) / Math.pow(10, 18)).toFixed(4));
        } catch (e) {
          console.error("Fehler beim Abrufen der gestakten Balance:", e);
          setStaked("0");
        }
        
        // Rewards abrufen
        try {
          const earned = await contractRead(staking, "earned", [account.address]);
          setRewards((Number(earned) / Math.pow(10, 18)).toFixed(4));
        } catch (e) {
          console.error("Fehler beim Abrufen der Rewards:", e);
          setRewards("0");
        }
        
      } catch (e) {
        console.error("Fehler beim Abrufen der D.INVEST Balance:", e);
        setAvailable("0"); 
        setStaked("0"); 
        setRewards("0");
      } finally {
        setLoading(false);
      }
    })();
  }, [account?.address, txStatus]);

  // Stake
  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      const dinvest = getContract({ client, chain: polygon, address: DINVEST_TOKEN });
      const amountWei = (parseFloat(stakeAmount) * Math.pow(10, 18)).toString();
      // Approve
      await sendTransaction(prepareContractCall({ contract: dinvest, method: resolveMethod("approve"), params: [STAKING_CONTRACT, amountWei] }));
      // Stake
      await sendTransaction(prepareContractCall({ contract: staking, method: resolveMethod("stake"), params: [amountWei] }));
      setTxStatus("success");
      setStakeAmount("");
    } catch (e) {
      setTxStatus("error");
    }
  };

  // Unstake
  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      const amountWei = (parseFloat(unstakeAmount) * Math.pow(10, 18)).toString();
      await sendTransaction(prepareContractCall({ contract: staking, method: resolveMethod("withdraw"), params: [amountWei] }));
      setTxStatus("success");
      setUnstakeAmount("");
    } catch (e) {
      setTxStatus("error");
    }
  };

  // Claim Rewards
  const handleClaim = async () => {
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      await sendTransaction(prepareContractCall({ contract: staking, method: resolveMethod("getReward"), params: [] }));
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          D.INVEST Staking
        </h2>
        <p className="text-zinc-400">Verdienen Sie Belohnungen durch Staking Ihrer D.INVEST Token</p>
      </div>

      {/* Staking Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
          <div className="text-center">
            <div className="text-sm text-zinc-500 mb-1">Verfügbar</div>
            <div className="text-xl font-bold text-amber-400">
              {loading ? "Laden..." : available}
            </div>
            <div className="text-xs text-zinc-500">D.INVEST</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
          <div className="text-center">
            <div className="text-sm text-zinc-500 mb-1">Gestaked</div>
            <div className="text-xl font-bold text-purple-400">
              {loading ? "Laden..." : staked}
            </div>
            <div className="text-xs text-zinc-500">D.INVEST</div>
          </div>
        </div>
      </div>

      {/* APR und Details */}
      <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400 mb-1">15.5%</div>
            <div className="text-xs text-zinc-500">Jährlicher Ertrag</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400 mb-1">30 Tage</div>
            <div className="text-xs text-zinc-500">Mindest-Lock</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 mb-1">{loading ? "Laden..." : rewards}</div>
            <div className="text-xs text-zinc-500">Belohnungen</div>
          </div>
        </div>
      </div>

      {/* Stake/Unstake Tabs */}
      <div className="flex bg-zinc-800/50 rounded-xl p-1 mb-6">
        <button 
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === "stake" 
              ? "bg-amber-500/20 text-amber-400" 
              : "text-zinc-400 hover:text-zinc-300"
          }`}
          onClick={() => setActiveTab("stake")}
        >
          <FaLock className="inline mr-2" />
          Staken
        </button>
        <button 
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === "unstake" 
              ? "bg-amber-500/20 text-amber-400" 
              : "text-zinc-400 hover:text-zinc-300"
          }`}
          onClick={() => setActiveTab("unstake")}
        >
          <FaUnlock className="inline mr-2" />
          Unstaken
        </button>
      </div>

      {/* Stake Interface */}
      {activeTab === "stake" && (
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-zinc-300">D.INVEST Betrag</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Verfügbar: {loading ? "Laden..." : available}</span>
                <button 
                  className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setStakeAmount(available)}
                  disabled={loading || parseFloat(available) <= 0}
                >
                  MAX
                </button>
              </div>
            </div>
            <input 
              type="number"
              placeholder="0"
              className="w-full bg-zinc-900/80 border border-zinc-600 rounded-xl py-4 px-4 text-lg font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
          </div>

          {/* Staking Berechnung */}
          {stakeAmount && parseFloat(stakeAmount) > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 space-y-2">
              <div className="text-sm text-zinc-400 mb-3">Erwartete Erträge:</div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Täglich:</span>
                <span className="text-green-400">
                  ~{((parseFloat(stakeAmount) * 0.155) / 365).toFixed(4)} D.INVEST
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Monatlich:</span>
                <span className="text-green-400">
                  ~{((parseFloat(stakeAmount) * 0.155) / 12).toFixed(2)} D.INVEST
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Jährlich:</span>
                <span className="text-green-400">
                  ~{(parseFloat(stakeAmount) * 0.155).toFixed(2)} D.INVEST
                </span>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
            onClick={handleStake}
          >
            <FaLock className="inline mr-2" />
            {!stakeAmount || parseFloat(stakeAmount) <= 0 ? "Betrag eingeben" : `${stakeAmount} D.INVEST staken`}
          </Button>
        </div>
      )}

      {/* Unstake Interface */}
      {activeTab === "unstake" && (
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-zinc-300">D.INVEST Betrag</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Gestaked: {staked}</span>
                <button 
                  className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-600/50 transition"
                  onClick={() => setUnstakeAmount(staked)}
                  disabled={staked === "0"}
                >
                  MAX
                </button>
              </div>
            </div>
            <input 
              type="number"
              placeholder="0"
              className="w-full bg-zinc-900/80 border border-zinc-600 rounded-xl py-4 px-4 text-lg font-bold text-zinc-400 focus:border-zinc-500 focus:outline-none"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              disabled={staked === "0"}
            />
          </div>

          {staked === "0" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-xs">ℹ</span>
                </div>
                <div className="text-sm text-zinc-400">
                  Sie haben derzeit keine D.INVEST Token gestaked.
                </div>
              </div>
            </div>
          )}

          <Button 
            className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 font-bold py-3 rounded-xl border border-zinc-600 transition-all"
            disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || staked === "0"}
            onClick={handleUnstake}
          >
            <FaUnlock className="inline mr-2" />
            {staked === "0" ? "Keine Token gestaked" : 
             !unstakeAmount || parseFloat(unstakeAmount) <= 0 ? "Betrag eingeben" : 
             `${unstakeAmount} D.INVEST unstaken`}
          </Button>
        </div>
      )}

      {/* Rewards Section */}
      <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
              <FaCoins className="text-black text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-amber-400">Staking Belohnungen</h3>
              <p className="text-xs text-zinc-500">Verdiente D.FAITH Token</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-amber-400">{rewards}</div>
            <div className="text-xs text-zinc-500">D.FAITH</div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          disabled={parseFloat(rewards) <= 0 || isPending}
          onClick={handleClaim}
        >
          <FaCoins className="inline mr-2" />
          {isPending ? "Wird ausgeführt..." : "Belohnungen einfordern"}
        </Button>
        {txStatus === "success" && (
          <div className="mt-2 text-green-400 text-sm text-center">Transaktion erfolgreich!</div>
        )}
        {txStatus === "error" && (
          <div className="mt-2 text-red-400 text-sm text-center">Transaktion fehlgeschlagen!</div>
        )}
        {txStatus === "pending" && (
          <div className="mt-2 text-yellow-400 text-sm text-center">Transaktion läuft...</div>
        )}
      </div>

      {/* Contract Info */}
      <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700">
        <div className="flex items-center gap-2 mb-2">
          <FaClock className="text-amber-400 text-sm" />
          <span className="text-sm font-medium text-zinc-300">Smart Contract Info</span>
        </div>
        <div className="text-xs text-zinc-500 space-y-1">
          <div>Contract: 0xe730555afA4DeA022976DdDc0cC7DBba1C98568A</div>
          <div>Network: Polygon (MATIC)</div>
          <div>Lock Period: Minimum 30 Tage</div>
        </div>
      </div>
    </div>
  );
}
