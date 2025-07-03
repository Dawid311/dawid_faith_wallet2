import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaLock, FaUnlock, FaCoins, FaClock } from "react-icons/fa";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall, resolveMethod, readContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { useSendTransaction } from "thirdweb/react";
import { balanceOf, approve } from "thirdweb/extensions/erc20";

const STAKING_CONTRACT = "0x651BACc1A1579f2FaaeDA2450CE59bB5E7D26e7d"; // Neue Staking Contract-Adresse
const DINVEST_TOKEN = "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383"; // Neue D.INVEST Token-Adresse
const DFAITH_TOKEN = "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060"; // D.FAITH Token-Adresse
const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID! });

export default function StakeTab() {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [available, setAvailable] = useState("0");
  const [staked, setStaked] = useState("0");
  const [claimableRewards, setClaimableRewards] = useState("0");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(1);
  const [currentRewardRate, setCurrentRewardRate] = useState(0);
  const [totalRewardsDistributed, setTotalRewardsDistributed] = useState("0");
  const [totalStakedTokens, setTotalStakedTokens] = useState("0");
  const [userCount, setUserCount] = useState(0);

  // Fetch balances und Contract-Status
  useEffect(() => {
    if (!account?.address) return;
    setLoading(true);
    (async () => {
      try {
        // D.INVEST Balance (0 Decimals)
        const dinvest = getContract({ client, chain: polygon, address: DINVEST_TOKEN });
        const dinvestBalanceResult = await balanceOf({
          contract: dinvest,
          address: account.address
        });
        
        // D.INVEST hat 0 Decimals
        setAvailable(dinvestBalanceResult.toString());
        
        // Staking Contract Daten abrufen
        const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
        
        // User's Stake Info abrufen
        try {
          const stakeInfo = await readContract({
            contract: staking,
            method: "function stakers(address) view returns (uint256, uint256)",
            params: [account.address]
          });
          // stakeInfo[0] ist amount, stakeInfo[1] ist lastClaimed
          setStaked(stakeInfo[0].toString());
        } catch (e) {
          console.error("Fehler beim Abrufen der Stake Info:", e);
          setStaked("0");
        }
        
        // Claimable Rewards abrufen
        try {
          const claimable = await readContract({
            contract: staking,
            method: "function getClaimableReward(address) view returns (uint256)",
            params: [account.address]
          });
          // Rewards sind in D.FAITH mit 2 Decimals
          const rewardsFormatted = Number(claimable) / Math.pow(10, 2);
          setClaimableRewards(rewardsFormatted.toFixed(2));
        } catch (e) {
          console.error("Fehler beim Abrufen der Claimable Rewards:", e);
          setClaimableRewards("0.00");
        }
        
        // Staking Status abrufen
        try {
          const stakingStatus = await readContract({
            contract: staking,
            method: "function getStakingStatus() view returns (uint8, uint256, uint256)",
            params: []
          });
          setCurrentStage(Number(stakingStatus[0]));
          setCurrentRewardRate(Number(stakingStatus[1]));
          setTotalRewardsDistributed((Number(stakingStatus[2]) / Math.pow(10, 2)).toFixed(2));
        } catch (e) {
          console.error("Fehler beim Abrufen des Staking Status:", e);
        }
        
        // Total Staked Tokens und User Count
        try {
          const totalStaked = await readContract({
            contract: staking,
            method: "function totalStakedTokens() view returns (uint256)",
            params: []
          });
          setTotalStakedTokens(totalStaked.toString());
          
          const users = await readContract({
            contract: staking,
            method: "function userCount() view returns (uint256)",
            params: []
          });
          setUserCount(Number(users));
        } catch (e) {
          console.error("Fehler beim Abrufen der Contract Stats:", e);
        }
        
      } catch (e) {
        console.error("Fehler beim Abrufen der Daten:", e);
        setAvailable("0"); 
        setStaked("0"); 
        setClaimableRewards("0.00");
      } finally {
        setLoading(false);
      }
    })();
  }, [account?.address, txStatus]);

  // Stake Function
  const handleStake = async () => {
    if (!stakeAmount || parseInt(stakeAmount) <= 0) return;
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      const dinvest = getContract({ client, chain: polygon, address: DINVEST_TOKEN });
      
      // D.INVEST hat 0 decimals
      const amountToStake = BigInt(parseInt(stakeAmount));
      
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

  // Unstake Function (unstakes all)
  const handleUnstake = async () => {
    setTxStatus("pending");
    try {
      const staking = getContract({ client, chain: polygon, address: STAKING_CONTRACT });
      
      const unstakeTx = prepareContractCall({
        contract: staking,
        method: "function unstake()",
        params: []
      });
      await sendTransaction(unstakeTx);
      
      setTxStatus("success");
    } catch (e) {
      console.error("Unstake Fehler:", e);
      setTxStatus("error");
    }
  };

  // Claim Rewards Function
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

  // Reward Rate formatieren
  const formatRewardRate = (rate: number) => {
    return (rate / 100).toFixed(2);
  };

  // Hilfsfunktion für den User-Reward pro Woche
  const getUserWeeklyReward = () => {
    // staked ist ein String, currentRewardRate ist z.B. 150 für 1.5%
    const stakedNum = parseInt(staked) || 0;
    return ((stakedNum * currentRewardRate) / 100).toFixed(2);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          D.INVEST Staking
        </h2>
        <p className="text-zinc-400">Verdienen Sie wöchentlich D.FAITH Token durch Staking</p>
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

      {/* Kompakte Rewards-Übersicht */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-900/60 to-green-800/60 rounded-xl p-4 border border-green-700/40 text-center">
          <div className="text-xs text-zinc-400 mb-1">Ihr aktueller Reward/Woche</div>
          <div className="text-2xl font-bold text-green-400 mb-1">
            {getUserWeeklyReward()} D.FAITH
          </div>
          <div className="text-xs text-zinc-500">bei {staked} gestaked</div>
        </div>
        <div className="bg-gradient-to-br from-amber-900/60 to-amber-800/60 rounded-xl p-4 border border-amber-700/40 text-center">
          <div className="text-xs text-zinc-400 mb-1">Verfügbare Rewards</div>
          <div className="text-2xl font-bold text-amber-400 mb-1">
            {loading ? "Laden..." : claimableRewards} D.FAITH
          </div>
          <div className="text-xs text-zinc-500">sofort einforderbar</div>
        </div>
      </div>

      {/* Aktuelle Reward-Stufe */}
      <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-4 border border-blue-700/50 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-blue-400">Aktuelle Reward-Stufe</div>
            <div className="text-xs text-zinc-500">
              {formatRewardRate(currentRewardRate)} D.FAITH pro D.INVEST pro Woche
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-400">Stufe {currentStage}</div>
            <div className="text-xs text-zinc-500">Total verteilt: {totalRewardsDistributed} D.FAITH</div>
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
                  disabled={loading || parseInt(available) <= 0}
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
              onChange={(e) => setStakeAmount(Math.floor(Number(e.target.value)).toString())}
            />
          </div>

          {/* Reward Stages Erklärung */}
          {stakeAmount && parseInt(stakeAmount) > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <div className="text-xs text-zinc-400 mb-1">
                Ihr wöchentlicher Reward (Stufe {currentStage}):
              </div>
              <div className="text-lg font-bold text-amber-400">
                {parseInt(stakeAmount) * (currentRewardRate / 100)} D.FAITH
              </div>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            disabled={!stakeAmount || parseInt(stakeAmount) <= 0}
            onClick={handleStake}
          >
            <FaLock className="inline mr-2" />
            {!stakeAmount || parseInt(stakeAmount) <= 0 ? "Betrag eingeben" : `${stakeAmount} D.INVEST staken`}
          </Button>
        </div>
      )}

      {/* Unstake Interface */}
      {activeTab === "unstake" && (
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700 space-y-6">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-orange-400 text-xs">⚠</span>
              </div>
              <div className="text-sm text-zinc-300">
                <div className="font-medium">Vollständiges Unstaking</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Alle gestakten Token ({staked} D.INVEST) werden unstaked. 
                  Mindestens 1 Woche Staking-Zeit erforderlich.
                </div>
              </div>
            </div>
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
            disabled={staked === "0"}
            onClick={handleUnstake}
          >
            <FaUnlock className="inline mr-2" />
            {staked === "0" ? "Keine Token gestaked" : `Alle ${staked} D.INVEST unstaken`}
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
              <h3 className="font-bold text-amber-400">Verfügbare Belohnungen</h3>
              <p className="text-xs text-zinc-500">Verdiente D.FAITH Token (wöchentlich)</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-amber-400">{claimableRewards}</div>
            <div className="text-xs text-zinc-500">D.FAITH</div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          disabled={parseFloat(claimableRewards) <= 0 || isPending}
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
          <div>Staking Contract: {STAKING_CONTRACT}</div>
          <div>Network: Polygon (MATIC)</div>
          <div>Staking Token: D.INVEST (0 Decimals)</div>
          <div>Reward Token: D.FAITH (2 Decimals)</div>
          <div>Reward System: Wöchentlich, stufenbasiert</div>
          <div>Total Staked: {totalStakedTokens} D.INVEST</div>
        </div>
      </div>
    </div>
  );
}
