import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaLock, FaUnlock, FaCoins, FaClock } from "react-icons/fa";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall, resolveMethod, readContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { useSendTransaction } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc20";

const STAKING_CONTRACT = "0xe730555afA4DeA022976DdDc0cC7DBba1C98568A";
const DINVEST_TOKEN = "0x72a428F03d7a301cEAce084366928b99c4d757bD";
const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID! });

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
  const [currentRewardStage, setCurrentRewardStage] = useState<{ stage: number; description: string } | null>(null);
  const [totalStaked, setTotalStaked] = useState("0");
  const [poolInfo, setPoolInfo] = useState<{
    totalStakers: number;
    rewardRate: string;
    stakingToken: string;
    rewardToken: string;
  } | null>(null);

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
        
        console.log("D.INVEST Balance Raw:", dinvestBalanceResult);
        
        // D.INVEST hat 18 Decimals im Contract, wird aber nur als ganze Zahlen angezeigt
        const dinvestFormatted = Math.floor(Number(dinvestBalanceResult) / Math.pow(10, 18));
        console.log("D.INVEST Balance Formatted (als ganze Zahl):", dinvestFormatted);
        setAvailable(dinvestFormatted.toString());
        
        // Staking Contract für gestakte Balance und Rewards
        const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
        
        // Gestakte Balance abrufen (mit getStakeInfo)
        try {
          const stakeInfo = await readContract({
            contract: staking,
            method: "function getStakeInfo(address) view returns (uint256, uint256)",
            params: [account.address]
          });
          // stakeInfo[0] ist amount, stakeInfo[1] ist lastClaimed
          // D.INVEST hat 18 decimals im Contract, wird aber als ganze Zahl angezeigt
          const stakedFormatted = Math.floor(Number(stakeInfo[0]) / Math.pow(10, 18));
          setStaked(stakedFormatted.toString());
        } catch (e) {
          console.error("Fehler beim Abrufen der gestakten Balance:", e);
          setStaked("0");
        }
        
        // Rewards abrufen (earned function)
        try {
          const earned = await readContract({
            contract: staking,
            method: "function earned(address) view returns (uint256)",
            params: [account.address]
          });
          // Rewards sind in rewardToken (D.FAITH) mit 18 decimals
          const rewardsFormatted = Number(earned) / Math.pow(10, 18);
          setRewards(rewardsFormatted.toFixed(6));
        } catch (e) {
          console.error("Fehler beim Abrufen der Rewards:", e);
          setRewards("0");
        }
        
        // Total Staked und Current Reward Stage abrufen
        try {
          const totalStakedAmount = await readContract({
            contract: staking,
            method: "function getTotalStaked() view returns (uint256)",
            params: []
          });
          // Total Staked ebenfalls als ganze Zahl anzeigen
          const totalStakedFormatted = Math.floor(Number(totalStakedAmount) / Math.pow(10, 18));
          setTotalStaked(totalStakedFormatted.toString());
          
          const rewardStage = await readContract({
            contract: staking,
            method: "function getCurrentRewardStage() view returns (uint8, string)",
            params: []
          });
          setCurrentRewardStage({
            stage: Number(rewardStage[0]),
            description: rewardStage[1]
          });
          
          // Pool-Informationen sammeln
          try {
            // Versuche weitere Pool-Daten abzurufen (falls verfügbar)
            setPoolInfo({
              totalStakers: 0, // Würde eine getTotalStakers() Funktion erfordern
              rewardRate: "Wöchentlich",
              stakingToken: "D.INVEST",
              rewardToken: "D.FAITH"
            });
          } catch (poolError) {
            console.log("Pool-Info nicht verfügbar:", poolError);
          }
          
        } catch (e) {
          console.error("Fehler beim Abrufen der Reward Stage:", e);
          setCurrentRewardStage(null);
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
      
      // D.INVEST hat 18 decimals im Contract, auch wenn wir sie als ganze Zahlen anzeigen
      const amountToStake = BigInt(Math.floor(parseFloat(stakeAmount)) * Math.pow(10, 18));
      
      // 1. Approve den Staking Contract
      const approveTx = prepareContractCall({
        contract: dinvest,
        method: "function approve(address,uint256) returns (bool)",
        params: [STAKING_CONTRACT, amountToStake]
      });
      await sendTransaction(approveTx);
      
      // 2. Stake die Token
      const stakeTx = prepareContractCall({
        contract: staking,
        method: "function stake(uint256)",
        params: [amountToStake]
      });
      await sendTransaction(stakeTx);
      
      setTxStatus("success");
      setStakeAmount("");
    } catch (e) {
      console.error("Stake Fehler:", e);
      setTxStatus("error");
    }
  };

  // Unstake
  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      
      // D.INVEST hat 18 decimals im Contract
      const amountToUnstake = BigInt(Math.floor(parseFloat(unstakeAmount)) * Math.pow(10, 18));
      
      const unstakeTx = prepareContractCall({
        contract: staking,
        method: "function unstake(uint256)",
        params: [amountToUnstake]
      });
      await sendTransaction(unstakeTx);
      
      setTxStatus("success");
      setUnstakeAmount("");
    } catch (e) {
      console.error("Unstake Fehler:", e);
      setTxStatus("error");
    }
  };

  // Claim Rewards
  const handleClaim = async () => {
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      
      const claimTx = prepareContractCall({
        contract: staking,
        method: "function claimReward()",
        params: []
      });
      await sendTransaction(claimTx);
      
      setTxStatus("success");
    } catch (e) {
      console.error("Claim Fehler:", e);
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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-4 border border-zinc-700 text-center">
          <div className="text-center">
            <div className="text-sm text-zinc-500 mb-1">Pool Total</div>
            <div className="text-xl font-bold text-blue-400">
              {loading ? "Laden..." : totalStaked}
            </div>
            <div className="text-xs text-zinc-500">D.INVEST</div>
          </div>
        </div>
      </div>

      {/* Current Reward Stage Info */}
      {currentRewardStage && (
        <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold text-blue-400 mb-1">Aktuelle Reward-Stufe {currentRewardStage.stage}</div>
              <div className="text-sm text-zinc-300">{currentRewardStage.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400">Pool Status</div>
              <div className="text-lg font-bold text-blue-400">{totalStaked} Token</div>
              <div className="text-xs text-zinc-500">gesamt gestaked</div>
            </div>
          </div>
          
          {/* Pool Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-700/30">
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-300">Token</div>
              <div className="text-xs text-zinc-400">D.INVEST → D.FAITH</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-300">Frequenz</div>
              <div className="text-xs text-zinc-400">Wöchentlich</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-300">Meine Rewards</div>
              <div className="text-xs text-zinc-400">{rewards} D.FAITH</div>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Overview */}
      <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
        <h3 className="text-lg font-bold text-amber-400 mb-4 text-center">Meine Staking Übersicht</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400 mb-1">Wöchentlich</div>
            <div className="text-sm text-zinc-400">Reward-Auszahlung</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400 mb-1">5 Stufen</div>
            <div className="text-sm text-zinc-400">Reward-System</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 mb-1">{loading ? "..." : rewards}</div>
            <div className="text-sm text-zinc-400">Verfügbare D.FAITH</div>
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
            <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
              <div className="text-lg font-semibold text-amber-400 mb-4 text-center">
                Reward-System Übersicht
              </div>
              <div className="text-sm text-zinc-300 mb-4 text-center">
                Rewards pro D.INVEST Token pro Woche (abhängig von Pool-Größe):
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300 font-medium">Stufe 1 (Pool kleiner als 10.000)</span>
                  <span className="text-green-400 font-bold">0.1 D.FAITH/Woche</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300 font-medium">Stufe 2 (Pool kleiner als 20.000)</span>
                  <span className="text-green-400 font-bold">0.05 D.FAITH/Woche</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300 font-medium">Stufe 3 (Pool kleiner als 40.000)</span>
                  <span className="text-green-400 font-bold">0.025 D.FAITH/Woche</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300 font-medium">Stufe 4 (Pool kleiner als 60.000)</span>
                  <span className="text-green-400 font-bold">0.0125 D.FAITH/Woche</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300 font-medium">Stufe 5 (Pool kleiner als 80.000)</span>
                  <span className="text-green-400 font-bold">0.00625 D.FAITH/Woche</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-sm text-blue-300 font-medium">
                  💡 Ihre geschätzte wöchentliche Reward: 
                  <span className="text-blue-400 font-bold ml-2">
                    {currentRewardStage ? 
                      `≈ ${(parseFloat(stakeAmount) * (currentRewardStage.stage === 1 ? 0.1 : 
                                                        currentRewardStage.stage === 2 ? 0.05 : 
                                                        currentRewardStage.stage === 3 ? 0.025 : 
                                                        currentRewardStage.stage === 4 ? 0.0125 : 0.00625)).toFixed(4)} D.FAITH` 
                      : "Wird berechnet..."}
                  </span>
                </div>
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
          <div>Staking Token: D.INVEST (0 Decimals)</div>
          <div>Reward Token: D.FAITH (18 Decimals)</div>
          <div>Reward Calculation: Wöchentlich, stufenbasiert</div>
        </div>
      </div>
    </div>
  );
}
