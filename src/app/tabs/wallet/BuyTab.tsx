import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt } from "react-icons/fa";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
// @ts-ignore
const { Buy } = require("thirdweb/react");
import { polygon } from "thirdweb/chains";
import { client } from "../../client";

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
            { headers: { 'Authorization': 'Bearer 1inch-api-key' } } // ggf. API-Key nötig
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
      // 3. Uniswap (nur wenn beide fehlschlagen)
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

  // Uniswap Quote holen
  const fetchUniswapQuote = async (amount: string) => {
    setSwapLoading(true);
    setSwapError(null);
    setSwapQuote(null);
    try {
      // POL (MATIC) -> D.FAITH
      const srcToken = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // POL/MATIC
      const destToken = "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff"; // D.FAITH
      const amountWei = (parseFloat(amount) * 1e18).toString();
      const url = `https://api.uniswap.org/v1/quote?protocols=v3&tokenInAddress=${srcToken}&tokenInChainId=137&tokenOutAddress=${destToken}&tokenOutChainId=137&amount=${amountWei}&type=exactIn`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Uniswap API Fehler");
      const data = await res.json();
      setSwapQuote(data);
    } catch (e: any) {
      setSwapError(e.message || "Fehler beim Abrufen der Quote");
    } finally {
      setSwapLoading(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!swapQuote || !swapQuote.transaction || !account?.address) return;
    setSwapStatus("pending");
    try {
      const tx = swapQuote.transaction;
      await sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : undefined,
        chain: polygon,
        client,
      });
      setSwapStatus("success");
    } catch (e) {
      setSwapStatus("error");
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
          
          <Button
            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={() => setShowPolBuyModal(true)}
          >
            POL kaufen
          </Button>
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
          
          <Button
            className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={() => setShowBuyModal(true)}
          >
            D.FAITH kaufen
          </Button>
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

      {/* Swap Modal für D.FAITH */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 rounded-xl p-8 max-w-xs w-full border border-amber-400 text-center">
            <div className="mb-4 text-amber-400 text-2xl font-bold">D.FAITH Swap</div>
            <div className="mb-4 text-zinc-300 text-sm">
              <div className="mb-2">Wie viel <span className="text-purple-400 font-bold">POL</span> möchtest du swappen?</div>
              <input
                type="number"
                min="0"
                step="0.001"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-lg font-bold text-purple-400 mb-2"
                placeholder="0.01 POL"
                value={swapAmount}
                onChange={e => setSwapAmount(e.target.value)}
                disabled={isSwapPending}
              />
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-2 rounded-xl mt-2"
                onClick={() => swapAmount && parseFloat(swapAmount) > 0 && fetchUniswapQuote(swapAmount)}
                disabled={swapLoading || !swapAmount || parseFloat(swapAmount) <= 0 || isSwapPending}
              >
                {swapLoading ? "Lade Quote..." : "Quote holen"}
              </Button>
              {swapError && <div className="text-red-400 text-xs mt-2">{swapError}</div>}
              {swapQuote && (
                <div className="mt-4 text-left text-xs bg-zinc-800 rounded-lg p-3">
                  <div><b>Du erhältst:</b> <span className="text-amber-400 font-bold">{(Number(swapQuote.quote.tokenOutAmount) / 1e18).toFixed(4)} D.FAITH</span></div>
                  <div><b>Slippage:</b> {swapQuote.quote.slippagePercent || "-"}%</div>
                  <div><b>Route:</b> {swapQuote.route?.map((r: any) => r.tokenInSymbol + "→" + r.tokenOutSymbol).join(", ")}</div>
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 rounded-xl mt-4"
                    onClick={handleExecuteSwap}
                    disabled={isSwapPending}
                  >
                    {isSwapPending ? "Sende Swap..." : "Swap ausführen"}
                  </Button>
                  {swapStatus === "success" && <div className="text-green-400 text-xs mt-2">Swap erfolgreich!</div>}
                  {swapStatus === "error" && <div className="text-red-400 text-xs mt-2">Swap fehlgeschlagen!</div>}
                  {swapStatus === "pending" && <div className="text-yellow-400 text-xs mt-2">Transaktion läuft...</div>}
                </div>
              )}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 rounded-xl mt-4"
              onClick={() => setShowBuyModal(false)}
              autoFocus
              disabled={isSwapPending}
            >
              Schließen
            </Button>
          </div>
        </div>
      )}

      {/* Thirdweb Buy Modal für POL */}
      {showPolBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-xs w-full border border-purple-500 text-center">
            <div className="mb-4 text-purple-400 text-2xl font-bold">POL kaufen</div>
            <Buy
              client={client}
              chain={polygon}
              token="0x0000000000000000000000000000000000001010" // POL/MATIC
              onClose={() => setShowPolBuyModal(false)}
              modalSize="compact"
            />
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-2 rounded-xl mt-4"
              onClick={() => setShowPolBuyModal(false)}
            >
              Schließen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
