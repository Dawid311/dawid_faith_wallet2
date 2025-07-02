"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { FaArrowRight, FaCheckCircle, FaExchangeAlt, FaArrowDown, FaInfoCircle, FaSpinner } from "react-icons/fa";
import { useActiveAccount } from "thirdweb/react";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { useDfaithToPolSwap, useSwapQuote, useTokenApproval, checkAllowance } from "../tabs/thirdwebUniversalBridge";

interface SwapModalContentProps {
  sellAmount: string;
  selectedSellToken: { name: string; symbol: string; address: string; decimals: number };
  selectedBuyToken: { name: string; symbol: string; address: string; decimals: number };
  estimatedReceiveAmount: string;
  onClose: () => void;
  onAmountChange: (amount: string) => void;
  onTokenSwitch: () => void;
}

export function SwapModalContent({
  sellAmount,
  selectedSellToken,
  selectedBuyToken,
  estimatedReceiveAmount,
  onClose,
  onAmountChange,
  onTokenSwitch,
}: SwapModalContentProps) {
  const account = useActiveAccount();
  const [isApproved, setIsApproved] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [slippage, setSlippage] = useState("1"); // 1% default slippage
  const [currentAllowance, setCurrentAllowance] = useState("0");

  // Thirdweb SDK instance
  const sdk = typeof window !== "undefined" && account?.address
    ? new ThirdwebSDK("polygon", { clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID })
    : null;

  // Convert amount to Wei
  const amountWei = sellAmount && parseFloat(sellAmount) > 0 
    ? (parseFloat(sellAmount) * Math.pow(10, selectedSellToken.decimals)).toLocaleString("fullwide", {useGrouping:false})
    : "0";

  // Real-time quote hook
  const { 
    data: quoteData, 
    isLoading: isLoadingQuote, 
    error: quoteError 
  } = useSwapQuote(
    selectedSellToken.address,
    selectedBuyToken.address,
    amountWei,
    parseFloat(slippage)
  );

  // Swap hooks
  const swapMutation = useDfaithToPolSwap(sdk, selectedSellToken.address, selectedBuyToken.address);
  const approvalMutation = useTokenApproval(sdk, selectedSellToken.address);

  // Check allowance when amount or tokens change
  useEffect(() => {
    const checkTokenAllowance = async () => {
      if (!account?.address || !sellAmount || !sdk || parseFloat(sellAmount) <= 0) {
        setNeedsApproval(false);
        setCurrentAllowance("0");
        return;
      }
      
      try {
        const allowance = await checkAllowance(sdk, selectedSellToken.address, account.address);
        setCurrentAllowance(allowance);
        
        const required = BigInt(amountWei);
        const current = BigInt(allowance);
        setNeedsApproval(current < required);
      } catch (error) {
        console.error("Error checking allowance:", error);
        setNeedsApproval(true);
        setCurrentAllowance("0");
      }
    };
    
    checkTokenAllowance();
  }, [account?.address, sellAmount, sdk, selectedSellToken.address, amountWei]);

  const handleApprove = async () => {
    if (!account?.address || !sellAmount || !sdk) return;
    
    setSwapError(null);
    
    try {
      // Approve double the amount to avoid re-approvals for small changes
      const approveAmount = (parseFloat(sellAmount) * 2 * Math.pow(10, selectedSellToken.decimals)).toLocaleString("fullwide", {useGrouping:false});
      
      await approvalMutation.mutateAsync({ amount: approveAmount });
      setIsApproved(true);
      setNeedsApproval(false);
      
      // Refresh allowance
      const newAllowance = await checkAllowance(sdk, selectedSellToken.address, account.address);
      setCurrentAllowance(newAllowance);
    } catch (error: any) {
      console.error("Approval failed:", error);
      setSwapError(`Freigabe fehlgeschlagen: ${error?.message || error}`);
    }
  };

  const handleSwap = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0 || !account?.address) return;
    
    setSwapError(null);
    
    try {
      await swapMutation.mutateAsync({
        fromAddress: account.address,
        amount: amountWei,
        slippage: parseFloat(slippage)
      });
      
      setIsSwapped(true);
    } catch (error: any) {
      console.error("Swap failed:", error);
      setSwapError(`Swap fehlgeschlagen: ${error?.message || error}`);
    }
  };

  // Calculate estimated output from quote
  const realEstimatedOutput = quoteData 
    ? (parseFloat(quoteData.toAmount) / Math.pow(10, selectedBuyToken.decimals)).toFixed(6)
    : estimatedReceiveAmount;

  const exchangeRate = quoteData && sellAmount && parseFloat(sellAmount) > 0
    ? (parseFloat(realEstimatedOutput) / parseFloat(sellAmount)).toFixed(6)
    : "0.002000";

  if (isSwapped) {
    return (
      <div className="text-center">
        <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-4" />
        <h4 className="text-lg font-bold mb-2 text-white">Swap erfolgreich!</h4>
        <p className="text-zinc-400 mb-6">
          Du hast {sellAmount} {selectedSellToken.symbol} gegen {realEstimatedOutput} {selectedBuyToken.symbol} getauscht.
        </p>
        <Button 
          onClick={() => {
            setIsSwapped(false);
            setIsApproved(false);
            onAmountChange("");
            onClose();
          }}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3"
        >
          Schließen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(swapError || quoteError) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <FaInfoCircle className="text-red-400 text-sm" />
            <p className="text-red-400 text-sm">{swapError || quoteError?.message}</p>
          </div>
        </div>
      )}

      {/* Quote Loading Indicator */}
      {isLoadingQuote && sellAmount && parseFloat(sellAmount) > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <FaSpinner className="text-blue-400 text-sm animate-spin" />
            <p className="text-blue-400 text-sm">Lade aktuelle Marktpreise...</p>
          </div>
        </div>
      )}

      {/* Verkaufen Sektion */}
      <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400 text-sm">Du verkaufst</span>
          <span className="text-zinc-400 text-sm">Token: {selectedSellToken.symbol}</span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-white text-2xl font-bold outline-none"
            disabled={approvalMutation.isPending || swapMutation.isPending}
          />
          <div className="flex items-center space-x-2 bg-zinc-700 rounded-lg px-3 py-2">
            <div className="w-6 h-6 bg-amber-500 rounded-full"></div>
            <span className="text-white font-medium">{selectedSellToken.symbol}</span>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={onTokenSwitch}
          disabled={approvalMutation.isPending || swapMutation.isPending}
          className="bg-zinc-700 hover:bg-zinc-600 p-3 rounded-full transition-colors disabled:opacity-50"
        >
          <FaArrowDown className="text-white text-lg" />
        </button>
      </div>

      {/* Kaufen Sektion */}
      <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400 text-sm">Du erhältst (geschätzt)</span>
          <span className="text-zinc-400 text-sm">Token: {selectedBuyToken.symbol}</span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={realEstimatedOutput}
            readOnly
            placeholder="0.00"
            className="flex-1 bg-transparent text-white text-2xl font-bold outline-none"
          />
          <div className="flex items-center space-x-2 bg-zinc-700 rounded-lg px-3 py-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
            <span className="text-white font-medium">{selectedBuyToken.symbol}</span>
          </div>
        </div>
      </div>

      {/* Swap Details */}
      <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Geschätzter Kurs</span>
          <div className="flex items-center space-x-2">
            {isLoadingQuote && <FaSpinner className="text-zinc-400 text-xs animate-spin" />}
            <span className="text-white">1 {selectedSellToken.symbol} ≈ {exchangeRate} {selectedBuyToken.symbol}</span>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Netzwerkgebühr</span>
          <span className="text-white">{quoteData ? `~${(parseInt(quoteData.estimatedGas) * 30e-9).toFixed(4)} POL` : "~0.002 POL"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Preis-Impact</span>
          <span className={`${quoteData && quoteData.priceImpact > 1 ? 'text-red-400' : 'text-green-400'}`}>
            {quoteData ? `${quoteData.priceImpact.toFixed(2)}%` : "< 0.1%"}
          </span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-zinc-400">Slippage Toleranz</span>
          <select 
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-white"
            disabled={approvalMutation.isPending || swapMutation.isPending}
          >
            <option value="0.5">0.5%</option>
            <option value="1">1%</option>
            <option value="2">2%</option>
            <option value="3">3%</option>
            <option value="5">5%</option>
          </select>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Mindesterhalt</span>
          <span className="text-white">
            {quoteData 
              ? (parseFloat(quoteData.toAmountMin) / Math.pow(10, selectedBuyToken.decimals)).toFixed(6)
              : (parseFloat(realEstimatedOutput || "0") * (1 - parseFloat(slippage) / 100)).toFixed(6)
            } {selectedBuyToken.symbol}
          </span>
        </div>
      </div>

      {/* Approval Status */}
      {needsApproval && !isApproved && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <FaInfoCircle className="text-blue-400 text-sm" />
            <p className="text-blue-400 text-sm">
              Du musst zuerst {selectedSellToken.symbol} für den Swap freigeben.
            </p>
          </div>
          {currentAllowance !== "0" && (
            <p className="text-zinc-400 text-xs mt-2">
              Aktuelle Freigabe: {(parseFloat(currentAllowance) / Math.pow(10, selectedSellToken.decimals)).toFixed(2)} {selectedSellToken.symbol}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isApproved && needsApproval ? (
          <Button
            onClick={handleApprove}
            disabled={approvalMutation.isPending || !sellAmount || parseFloat(sellAmount) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 flex items-center justify-center space-x-2"
          >
            {approvalMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Genehmige {selectedSellToken.symbol}...</span>
              </>
            ) : (
              <>
                <FaCheckCircle />
                <span>Genehmige {selectedSellToken.symbol}</span>
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSwap}
            disabled={
              swapMutation.isPending || 
              !sellAmount || 
              parseFloat(sellAmount) <= 0 || 
              isLoadingQuote ||
              (quoteData && quoteData.priceImpact > 5) // Prevent swaps with >5% price impact
            }
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 flex items-center justify-center space-x-2"
          >
            {swapMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span>Führe Swap durch...</span>
              </>
            ) : (
              <>
                <FaExchangeAlt />
                <span>
                  {quoteData && quoteData.priceImpact > 5 
                    ? "Preis-Impact zu hoch" 
                    : "Swap bestätigen"
                  }
                </span>
              </>
            )}
          </Button>
        )}
        
        {/* Cancel/Reset Button */}
        <Button
          onClick={() => {
            setSwapError(null);
            setIsApproved(false);
            onAmountChange("");
            onClose();
          }}
          disabled={approvalMutation.isPending || swapMutation.isPending}
          className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-2"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
