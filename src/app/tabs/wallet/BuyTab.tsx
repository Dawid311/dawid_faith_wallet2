import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt } from "react-icons/fa";

export default function BuyTab() {
  const [dfaithPrice, setDfaithPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // D.FAITH Preis von Paraswap holen
  useEffect(() => {
    const fetchDfaithPrice = async () => {
      try {
        setIsLoadingPrice(true);
        // Paraswap Quote API für D.FAITH/POL Paar
        const response = await fetch(
          `https://apiv5.paraswap.io/prices?srcToken=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&destToken=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&amount=1000000000000000000&srcDecimals=18&destDecimals=18&network=137`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Berechne D.FAITH pro POL basierend auf der Quote
          const dfaithPerPol = Number(data.priceRoute.destAmount) / Math.pow(10, 18);
          setDfaithPrice(dfaithPerPol);
        } else {
          // Fallback Preis wenn API nicht verfügbar
          setDfaithPrice(500);
        }
      } catch (error) {
        console.error("Fehler beim Abrufen des D.FAITH Preises:", error);
        // Fallback Preis
        setDfaithPrice(500);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchDfaithPrice();
    // Preis alle 30 Sekunden aktualisieren
    const interval = setInterval(fetchDfaithPrice, 30000);
    return () => clearInterval(interval);
  }, []);
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
              <div className="p-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full">
                <FaExchangeAlt className="text-white text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-blue-400">POL Token</h3>
                <p className="text-xs text-zinc-500">Polygon Native Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-blue-400">~0.50€ pro POL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">1 EUR</span>
            </div>
          </div>
          
          <Button className="w-full mt-4 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
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
                ) : (
                  `1 POL = ${dfaithPrice?.toFixed(0) || 500} D.FAITH`
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">0.001 POL</span>
            </div>
          </div>
          
          <Button className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
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
          
          <Button className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
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
    </div>
  );
}
