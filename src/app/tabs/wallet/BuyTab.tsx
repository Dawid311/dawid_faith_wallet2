import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt } from "react-icons/fa";
import { useActiveAccount, useSendTransaction, BuyWidget } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { NATIVE_TOKEN_ADDRESS, getContract, prepareContractCall, sendAndConfirmTransaction } from "thirdweb";
import { client } from "../../client";
import { balanceOf, approve } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff";
const DFAITH_ICON = "https://assets.coingecko.com/coins/images/35564/large/dfaith.png";
const POL_TOKEN = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC/POL
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router auf Polygon

export default function BuyTab() {
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const account = useActiveAccount();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showPolBuyModal, setShowPolBuyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const { mutate: sendTransaction, isPending: isSwapPending } = useSendTransaction();
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  // D.FAITH Preis von mehreren Quellen holen
  useEffect(() => {
    const fetchDfaithPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      let price: number | null = null;
      let errorMsg = "";
      // 1. Paraswap
      try {
        const response = await fetch(
          `https://apiv5.paraswap.io/transactions/1/price?srcToken=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&destToken=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&amount=1000000000000000000&srcDecimals=18&destDecimals=18&network=137`
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.priceRoute && data.priceRoute.destAmount) {
            price = Number(data.priceRoute.destAmount) / Math.pow(10, 18);
          }
        } else {
          errorMsg = "Paraswap: " + response.status;
        }
      } catch (e) {
        errorMsg = "Paraswap Fehler";
      }
      // 2. 1inch (nur wenn Paraswap fehlschlägt)
      if (!price) {
        try {
          const response = await fetch(
            `https://api.1inch.dev/swap/v5.2/137/quote?src=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&dst=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&amount=1000000000000000000`,
            { headers: { 'Authorization': 'Bearer gkpYwoz5c9Uzh3o01jQXiAd6GwQSzBbo' } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.toTokenAmount) {
              price = Number(data.toTokenAmount) / Math.pow(10, 18);
            }
          } else {
            errorMsg += " | 1inch: " + response.status;
          }
        } catch (e) {
          errorMsg += " | 1inch Fehler";
        }
      }
      // 3. OpenOcean (nur wenn beide fehlschlagen)
      if (!price) {
        try {
          const response = await fetch(
            `https://open-api.openocean.finance/v3/polygon/quote?inTokenAddress=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&outTokenAddress=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&amount=1000000000000000000` // 1 POL
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.data && data.data.outAmount) {
              price = Number(data.data.outAmount) / Math.pow(10, 18);
            }
          } else {
            errorMsg += " | OpenOcean: " + response.status;
          }
        } catch (e) {
          errorMsg += " | OpenOcean Fehler";
        }
      }
      // 4. Uniswap (nur wenn alle fehlschlagen)
      if (!price) {
        try {
          const response = await fetch(
            `https://api.uniswap.org/v1/quote?protocols=v3&tokenInAddress=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&tokenInChainId=137&tokenOutAddress=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&tokenOutChainId=137&amount=1000000000000000000&type=exactIn`
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.quote && data.quote.tokenOutAmount) {
              price = Number(data.quote.tokenOutAmount) / Math.pow(10, 18);
            }
          } else {
            errorMsg += " | Uniswap: " + response.status;
          }
        } catch (e) {
          errorMsg += " | Uniswap Fehler";
        }
      }
      if (price) {
        setDfaithPrice(price);
        setPriceError(null);
      } else {
        setDfaithPrice(null);
        setPriceError(errorMsg || "Preis nicht verfügbar");
      }
      setIsLoadingPrice(false);
    };

    fetchDfaithPrice();
    // Preis alle 30 Sekunden aktualisieren
    const interval = setInterval(fetchDfaithPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInvestBuy = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
    }
    setShowInvestModal(true);
  };

  const handleInvestContinue = () => {
    setShowInvestModal(false);
    window.open('https://dein-stripe-link.de', '_blank');
  };

  // State für D.FAITH Swap
  const [showDfaithBuyModal, setShowDfaithBuyModal] = useState(false);
  const [swapAmountPol, setSwapAmountPol] = useState("");
  const [polBalance, setPolBalance] = useState("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxStatus, setSwapTxStatus] = useState<string | null>(null);

  // POL Balance laden
  useEffect(() => {
    const fetchPolBalance = async () => {
      if (!account?.address) return;
      try {
        const polContract = getContract({
          client,
          chain: polygon,
          address: POL_TOKEN
        });
        const balance = await balanceOf({
          contract: polContract,
          address: account.address
        });
        const formatted = (Number(balance) / Math.pow(10, 18)).toFixed(4);
        setPolBalance(formatted);
      } catch (error) {
        console.error("Fehler beim Laden der POL Balance:", error);
        setPolBalance("0");
      }
    };
    
    fetchPolBalance();
  }, [account?.address]);

  // D.FAITH Swap Funktion
  const handleDfaithSwap = async () => {
    if (!swapAmountPol || parseFloat(swapAmountPol) <= 0 || !account?.address) return;
    
    setIsSwapping(true);
    setSwapTxStatus("pending");
    
    try {
      const amountInWei = (parseFloat(swapAmountPol) * Math.pow(10, 18)).toString();
      
      // 1. POL Token Contract
      const polContract = getContract({
        client,
        chain: polygon,
        address: POL_TOKEN
      });
      
      // 2. Approve Router to spend POL using the approve extension
      const approveTx = approve({
        contract: polContract,
        spender: UNISWAP_ROUTER,
        amount: amountInWei
      });
      
      await sendTransaction(approveTx);
      
      // 3. Router Contract
      const router = getContract({
        client,
        chain: polygon,
        address: UNISWAP_ROUTER
      });
      
      // 4. Perform Swap
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const swapTx = prepareContractCall({
        contract: router,
        method: "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
        params: [
          BigInt(amountInWei), // amountIn
          BigInt("0"), // amountOutMin (should be calculated properly in production)
          [POL_TOKEN, DFAITH_TOKEN], // path
          account.address, // to
          BigInt(deadline) // deadline
        ]
      });
      
      await sendTransaction(swapTx);
      
      setSwapTxStatus("success");
      setSwapAmountPol("");
      
    } catch (error) {
      console.error("Swap Fehler:", error);
      setSwapTxStatus("error");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token kaufen
        </h2>
        <p className="text-zinc-400">Wählen Sie den Token, den Sie kaufen möchten</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* POL kaufen */}
        <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-6 border border-blue-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full">
                <span className="text-purple-400 text-lg font-bold">POL</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-400">POL Token</h3>
                <p className="text-xs text-zinc-500">Polygon Native Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-purple-400 font-bold">~0.50€ pro POL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">1 EUR</span>
            </div>
          </div>
          
          <div className="w-full mt-4">
            {showPolBuyModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60">
                <div className="bg-zinc-900 rounded-xl p-4 max-w-full w-full sm:max-w-xs border border-purple-500 text-center overflow-y-auto h-[90vh] flex flex-col items-center justify-center">
                  <div className="mb-4 text-purple-400 text-2xl font-bold">POL kaufen</div>
                  <div className="w-full flex-1 flex items-center justify-center">
                    <BuyWidget
                      client={client}
                      tokenAddress={NATIVE_TOKEN_ADDRESS}
                      chain={polygon}
                      amount="1"
                      theme="dark"
                      className="w-full"
                    />
                  </div>
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl mt-4"
                    onClick={() => setShowPolBuyModal(false)}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => setShowPolBuyModal(true)}
              >
                POL kaufen
              </Button>
            )}
          </div>
        </div>

        {/* DFAITH kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.FAITH Token</h3>
                <p className="text-xs text-zinc-500">Dawid Faith Utility Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit POL kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-amber-400">
                {isLoadingPrice ? (
                  <span className="animate-pulse">Laden...</span>
                ) : priceError ? (
                  <span className="text-red-400">{priceError}</span>
                ) : dfaithPrice ? (
                  `1 POL = ${dfaithPrice.toFixed(0)} D.FAITH`
                ) : (
                  "Preis nicht verfügbar"
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">0.001 POL</span>
            </div>
          </div>
          
          {/* D.FAITH kaufen Modal */}
          {showDfaithBuyModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60">
              <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-amber-400">
                <div className="mb-6 text-amber-400 text-2xl font-bold text-center">D.FAITH kaufen</div>
                
                {/* POL Balance */}
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Verfügbare POL:</span>
                    <span className="text-purple-400 font-bold">{polBalance}</span>
                  </div>
                </div>
                
                {/* Swap Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">POL Betrag</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3 px-4 text-lg font-bold text-purple-400 focus:border-amber-500 focus:outline-none"
                      value={swapAmountPol}
                      onChange={(e) => setSwapAmountPol(e.target.value)}
                      disabled={isSwapping}
                    />
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition"
                      onClick={() => setSwapAmountPol((parseFloat(polBalance) * 0.95).toFixed(4))} // 95% für Gas
                      disabled={isSwapping}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                
                {/* Estimated Output */}
                {swapAmountPol && parseFloat(swapAmountPol) > 0 && dfaithPrice && (
                  <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Geschätzte D.FAITH:</span>
                      <span className="text-amber-400 font-bold">
                        ~{(parseFloat(swapAmountPol) * dfaithPrice).toFixed(0)}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Transaction Status */}
                {swapTxStatus && (
                  <div className={`mb-4 p-3 rounded-lg text-center ${
                    swapTxStatus === "success" ? "bg-green-500/20 text-green-400" :
                    swapTxStatus === "error" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {swapTxStatus === "success" && "Swap erfolgreich!"}
                    {swapTxStatus === "error" && "Swap fehlgeschlagen!"}
                    {swapTxStatus === "pending" && "Transaktion läuft..."}
                  </div>
                )}
                
                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    onClick={handleDfaithSwap}
                    disabled={!swapAmountPol || parseFloat(swapAmountPol) <= 0 || isSwapping || !account?.address}
                  >
                    <FaExchangeAlt className="inline mr-2" />
                    {isSwapping ? "Swapping..." : `${swapAmountPol || "0"} POL → D.FAITH`}
                  </Button>
                  
                  <Button
                    className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl"
                    onClick={() => {
                      setShowDfaithBuyModal(false);
                      setSwapAmountPol("");
                      setSwapTxStatus(null);
                    }}
                    disabled={isSwapping}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              onClick={() => account?.address ? setShowDfaithBuyModal(true) : alert('Bitte Wallet verbinden!')}
              disabled={!account?.address}
            >
              D.FAITH kaufen
            </Button>
          )}
        </div>

        {/* D.INVEST kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaLock className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.INVEST Token</h3>
                <p className="text-xs text-zinc-500">Investment & Staking Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-amber-400">5€ pro D.INVEST</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">5 EUR</span>
            </div>
          </div>
          
          <Button
            className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={handleInvestBuy}
          >
            D.INVEST kaufen
          </Button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-400 text-xs">ℹ</span>
          </div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Hinweis</div>
            <div className="text-sm text-zinc-400">
              Stellen Sie sicher, dass Sie genügend POL für Transaktionsgebühren in Ihrem Wallet haben.
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal für D.INVEST */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/60">
          <div className="bg-zinc-900 rounded-xl p-8 max-w-xs w-full border border-amber-400 text-center">
            <div className="mb-4 text-amber-400 text-2xl font-bold">Wichtiger Hinweis</div>
            <div className="mb-4 text-zinc-300 text-sm">
              {copied
                ? "Deine Wallet-Adresse wurde kopiert. Bitte füge sie beim Stripe-Kauf als Verwendungszweck ein, damit wir dir die Token zuweisen können."
                : "Bitte stelle sicher, dass du eine Wallet verbunden hast."}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 rounded-xl mt-2"
              onClick={handleInvestContinue}
              autoFocus
            >
              Weiter zu Stripe
            </Button>
            <button
              className="w-full mt-2 text-zinc-400 text-xs underline"
              onClick={() => setShowInvestModal(false)}
            >Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}
