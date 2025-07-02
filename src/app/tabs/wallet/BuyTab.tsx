import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt } from "react-icons/fa";
import { useActiveAccount, useSendTransaction, BuyWidget } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { NATIVE_TOKEN_ADDRESS } from "thirdweb";
import { client } from "../../client";
import { getContract, sendAndConfirmTransaction } from "thirdweb";
import { JsonRpcProvider, parseUnits, Contract } from "ethers";

// ABIs als const deklarieren
const erc20Abi = [
  {
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [
      { name: "", type: "bool" }
    ],
    stateMutability: "nonpayable" as const,
    type: "function" as const
  }
] as const;

const quickswapRouterAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" }
    ],
    name: "swapExactTokensForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" }
    ],
    stateMutability: "nonpayable" as const,
    type: "function" as const
  }
] as const;

// Uniswap V3 Router (Polygon)
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

// Uniswap V3 ABI für exactInputSingle
const uniswapV3RouterAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" }
        ],
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple"
      }
    ],
    name: "exactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" }
    ],
    stateMutability: "payable" as const,
    type: "function" as const
  }
] as const;

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const POL_TOKEN = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const DFAITH_TOKEN = "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff";

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

  // Approve + Swap State
  const [swapStep, setSwapStep] = useState<'input'|'approving'|'swapping'|'success'|'error'>("input");
  const [swapErrorMsg, setSwapErrorMsg] = useState<string|null>(null);

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token kaufen
        </h2>
        <p className="text-zinc-400">Wählen Sie den Token, den Sie kaufen möchten</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* POL kaufen mit Thirdweb Bridge Widget */}
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
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">Universal Bridge</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-purple-400 font-bold">~0.50€ pro POL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Bridge:</span>
              <span className="text-zinc-300">Ethereum → Polygon</span>
            </div>
          </div>
          
          <div className="w-full mt-4">
      {showPolBuyModal ? (
        <div className="bg-zinc-800 rounded-xl p-2 sm:p-4 border border-purple-500 w-full max-w-full overflow-hidden">
          <div className="text-center text-white mb-2 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold">POL kaufen</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-4">Direkt POL kaufen mit Fiat oder Bridge von anderen Chains</p>
          </div>
          
          {/* Thirdweb BuyWidget für POL - Mobile optimiert */}
          <div className="buy-widget-container mb-2 sm:mb-4 w-full relative">
            <div className="w-full overflow-hidden rounded-lg">
              <div className="w-full">
                <BuyWidget
                  client={client}
                  chain={polygon}
                  tokenAddress={NATIVE_TOKEN_ADDRESS}
                  amount="1"
                  theme="dark"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <Button
            className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl mt-2 sm:mt-4"
            onClick={() => setShowPolBuyModal(false)}
          >
            Schließen
          </Button>
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
          <div className="w-full mt-4">
            {showBuyModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-zinc-900 rounded-xl p-6 max-w-xs w-full border border-amber-400 text-center">
                  <div className="mb-4 text-amber-400 text-2xl font-bold">D.FAITH Swap</div>
                  <div className="mb-4 text-zinc-300 text-sm">
                    {swapStep === "input" && (
                      <>
                        <div className="mb-2">Wie viel <span className="text-purple-400 font-bold">POL</span> möchtest du swappen?</div>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-lg font-bold text-purple-400 mb-2"
                          placeholder="0.01 POL"
                          value={swapAmount}
                          onChange={e => setSwapAmount(e.target.value)}
                          disabled={swapStep !== "input"}
                        />
                        <Button
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-2 rounded-xl mt-2"
                          onClick={async () => {
                            if (!account?.address) {
                              setSwapErrorMsg("Bitte Wallet verbinden.");
                              return;
                            }
                            setSwapStep("approving");
                            setSwapErrorMsg(null);
                            try {
                              // Provider von thirdweb client holen (ggf. anpassen)
                              const provider = new JsonRpcProvider((window as any).ethereum);
                              const signer = await provider.getSigner();
                              const router = new Contract(UNISWAP_V3_ROUTER, uniswapV3RouterAbi, signer);
                              const tokenA = new Contract(POL_TOKEN, erc20Abi, signer);
                              // Approve
                              const approveTx = await tokenA.approve.populateTransaction(router.address, parseUnits(swapAmount, 18));
                              const approveResponse = await signer.sendTransaction(approveTx);
                              await approveResponse.wait();
                              setSwapStep("swapping");
                              // Swap über Uniswap V3
                              const params = {
                                tokenIn: POL_TOKEN,
                                tokenOut: DFAITH_TOKEN,
                                fee: 3000, // 0.3% Pool, ggf. anpassen
                                recipient: account.address,
                                deadline: Math.floor(Date.now() / 1000) + 60 * 20,
                                amountIn: parseUnits(swapAmount, 18),
                                amountOutMinimum: 0,
                                sqrtPriceLimitX96: 0n
                              };
                              const swapTx = await router.exactInputSingle.populateTransaction(params, { value: 0 });
                              const swapResponse = await signer.sendTransaction(swapTx);
                              await swapResponse.wait();
                              setSwapStep("success");
                            } catch (e: any) {
                              setSwapErrorMsg(e.message || "Fehler beim Swap");
                              setSwapStep("error");
                            }
                          }}
                          disabled={!swapAmount || parseFloat(swapAmount) <= 0}
                        >
                          Swappen & Bestätigen
                        </Button>
                        {swapErrorMsg && <div className="text-red-400 text-xs mt-2">{swapErrorMsg}</div>}
                      </>
                    )}
                    {swapStep === "approving" && <div className="text-yellow-400">Genehmigung läuft...</div>}
                    {swapStep === "swapping" && <div className="text-yellow-400">Swap läuft...</div>}
                    {swapStep === "success" && <div className="text-green-400">Swap erfolgreich!</div>}
                    {swapStep === "error" && <div className="text-red-400">Swap fehlgeschlagen! {swapErrorMsg}</div>}
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 rounded-xl mt-4"
                    onClick={() => { setShowBuyModal(false); setSwapStep("input"); setSwapErrorMsg(null); }}
                    autoFocus
                    disabled={swapStep === "approving" || swapStep === "swapping"}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => setShowBuyModal(true)}
              >
                D.FAITH kaufen
              </Button>
            )}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
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
