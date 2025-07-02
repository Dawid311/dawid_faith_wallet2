import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaSpinner, FaArrowRight, FaExclamationTriangle } from "react-icons/fa";

interface BuyTokenModalProps {
  tokenType: 'DFAITH' | 'DINVEST' | 'POL';
  onClose: () => void;
  onConfirm: (amount: string, quote: any) => void;
}

export default function BuyTokenModal({ tokenType, onClose, onConfirm }: BuyTokenModalProps) {
  const [inputAmount, setInputAmount] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [error, setError] = useState("");

  const tokenConfig = {
    DFAITH: {
      name: "D.FAITH",
      payWith: "POL",
      minAmount: 0.001,
      icon: <FaCoins className="text-amber-400" />,
      gradient: "from-amber-400 to-yellow-500"
    },
    DINVEST: {
      name: "D.INVEST",
      payWith: "EUR",
      minAmount: 5,
      icon: <FaCoins className="text-amber-400" />,
      gradient: "from-amber-400 to-yellow-500"
    },
    POL: {
      name: "POL",
      payWith: "EUR",
      minAmount: 1,
      icon: <FaCoins className="text-blue-400" />,
      gradient: "from-blue-400 to-blue-600"
    }
  };

  const config = tokenConfig[tokenType];

  // Quote für D.FAITH holen
  const fetchQuote = async (amount: string) => {
    if (!amount || parseFloat(amount) < config.minAmount) return;

    setIsLoadingQuote(true);
    setError("");

    try {
      if (tokenType === 'DFAITH') {
        // Paraswap Quote für POL -> D.FAITH
        const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
        const response = await fetch(
          `https://apiv5.paraswap.io/prices?srcToken=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&destToken=0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff&amount=${amountWei}&srcDecimals=18&destDecimals=18&network=137&side=SELL`
        );
        
        if (response.ok) {
          const data = await response.json();
          setQuote({
            inputAmount: amount,
            outputAmount: (Number(data.priceRoute.destAmount) / Math.pow(10, 18)).toFixed(4),
            priceImpact: data.priceRoute.gasCostUSD || "0",
            route: data.priceRoute
          });
        } else {
          throw new Error("Keine Quote verfügbar");
        }
      } else if (tokenType === 'DINVEST') {
        // Fester Preis: 5€ pro D.INVEST
        const tokens = parseFloat(amount) / 5;
        setQuote({
          inputAmount: amount,
          outputAmount: tokens.toFixed(4),
          priceImpact: "0",
          route: null
        });
      } else if (tokenType === 'POL') {
        // Fester Preis: ~0.50€ pro POL
        const tokens = parseFloat(amount) / 0.50;
        setQuote({
          inputAmount: amount,
          outputAmount: tokens.toFixed(4),
          priceImpact: "0",
          route: null
        });
      }
    } catch (error) {
      console.error("Quote-Fehler:", error);
      setError("Fehler beim Abrufen der Quote. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Quote automatisch laden wenn sich der Input ändert
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputAmount && parseFloat(inputAmount) >= config.minAmount) {
        fetchQuote(inputAmount);
      } else {
        setQuote(null);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [inputAmount, tokenType]);

  const handleInputChange = (value: string) => {
    // Nur Zahlen und einen Dezimalpunkt erlauben
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputAmount(value);
      setError("");
    }
  };

  const handleConfirm = () => {
    if (quote && inputAmount) {
      onConfirm(inputAmount, quote);
    }
  };

  const isValidAmount = inputAmount && parseFloat(inputAmount) >= config.minAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`p-3 bg-gradient-to-r ${config.gradient} rounded-full`}>
            {config.icon}
          </div>
          <h3 className="text-2xl font-bold text-white">
            {config.name} kaufen
          </h3>
        </div>
        <p className="text-zinc-400">
          Zahlen mit {config.payWith} • Minimum: {config.minAmount} {config.payWith}
        </p>
      </div>

      {/* Input Sektion */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Sie zahlen ({config.payWith})
        </label>
        <div className="relative">
          <input
            type="text"
            value={inputAmount}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Mindestens ${config.minAmount}`}
            className="w-full px-4 py-4 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-xl font-bold focus:border-amber-400 focus:outline-none transition-colors"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 font-medium">
            {config.payWith}
          </span>
        </div>
        
        {inputAmount && parseFloat(inputAmount) < config.minAmount && (
          <p className="text-red-400 text-sm mt-2">
            Mindestbetrag: {config.minAmount} {config.payWith}
          </p>
        )}
      </div>

      {/* Quote Anzeige */}
      {isValidAmount && (
        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Sie erhalten
          </label>
          
          {isLoadingQuote ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <FaSpinner className="animate-spin" />
              <span>Quote wird geladen...</span>
            </div>
          ) : quote ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {quote.outputAmount}
                </span>
                <span className="text-zinc-400 font-medium">
                  {config.name}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <FaArrowRight className="text-xs" />
                <span>
                  1 {config.payWith} = {tokenType === 'DFAITH' 
                    ? (parseFloat(quote.outputAmount) / parseFloat(quote.inputAmount)).toFixed(2)
                    : tokenType === 'DINVEST' 
                    ? '0.2' 
                    : '2'
                  } {config.name}
                </span>
              </div>

              {tokenType === 'DFAITH' && quote.priceImpact !== "0" && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <FaExclamationTriangle className="text-xs" />
                  <span>Geschätzte Gebühren: ~${quote.priceImpact}</span>
                </div>
              )}
            </div>
          ) : error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onClose}
          className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium rounded-xl transition-colors"
        >
          Abbrechen
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={!quote || isLoadingQuote || !!error}
          className={`flex-1 py-3 font-bold rounded-xl transition-all ${
            quote && !isLoadingQuote && !error
              ? `bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`
              : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {isLoadingQuote ? (
            <div className="flex items-center gap-2">
              <FaSpinner className="animate-spin" />
              <span>Laden...</span>
            </div>
          ) : quote ? (
            `${config.name} kaufen`
          ) : (
            'Betrag eingeben'
          )}
        </Button>
      </div>

      {/* Hinweis */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-400 text-xs">ℹ</span>
          </div>
          <div className="text-sm text-zinc-400">
            {tokenType === 'DFAITH' ? (
              <>Stellen Sie sicher, dass Sie genügend POL für die Transaktion und Gebühren haben.</>
            ) : (
              <>Die Transaktion wird über eine sichere Zahlungsschnittstelle abgewickelt.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
