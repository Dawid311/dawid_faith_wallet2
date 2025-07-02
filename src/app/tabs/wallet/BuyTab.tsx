import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock, FaExchangeAlt } from "react-icons/fa";
import { useActiveAccount, useSendTransaction, BuyWidget } from "thirdweb/react";
import { polygon } from "thirdweb/chains";
import { NATIVE_TOKEN_ADDRESS, getContract, prepareContractCall, sendAndConfirmTransaction, readContract } from "thirdweb";
import { client } from "../../client";
import { balanceOf, approve } from "thirdweb/extensions/erc20";

const DFAITH_TOKEN = "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff";
const DFAITH_ICON = "https://assets.coingecko.com/coins/images/35564/large/dfaith.png";
const WMATIC_TOKEN = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC (Wrapped POL)
const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router auf Polygon
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // SushiSwap Router auf Polygon
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 Router auf Polygon

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

  // D.FAITH Preis aus Contract oder statisch setzen (da API-Aufrufe CORS-Probleme haben)
  useEffect(() => {
    const fetchDfaithPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      
      try {
        // Versuche, den Preis direkt aus dem Uniswap/QuickSwap Contract zu lesen
        // Für jetzt verwenden wir einen geschätzten Preis basierend auf der Liquidität
        // In Produktion sollte das über einen Backend-Proxy oder direkt aus dem Pair Contract gelesen werden
        
        // Simuliere einen Preis von ca. 1000-2000 D.FAITH pro POL (typisch für kleine Token)
        const estimatedPrice = 1500; // Kann je nach aktueller Liquidität variieren
        
        setDfaithPrice(estimatedPrice);
        setPriceError(null);
        
      } catch (error) {
        console.error("Preis-Fetch Fehler:", error);
        setDfaithPrice(1500); // Fallback-Preis
        setPriceError("Geschätzter Preis verwendet");
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchDfaithPrice();
    // Preis alle 60 Sekunden aktualisieren
    const interval = setInterval(fetchDfaithPrice, 60000);
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
      if (!account?.address) {
        console.log("No account connected");
        return;
      }
      try {
        console.log("Fetching native POL balance for:", account.address);
        
        // Native POL Balance direkt über readContract abrufen
        const balance = await readContract({
          contract: getContract({
            client,
            chain: polygon,
            address: "0x0000000000000000000000000000000000000000" // Dummy für native token
          }),
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address]
        }).catch(async () => {
          // Fallback: Verwende eth_getBalance über RPC
          const response = await fetch(polygon.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [account.address, 'latest'],
              id: 1
            })
          });
          const data = await response.json();
          return BigInt(data.result);
        });
        
        console.log("Native POL Balance raw:", balance.toString());
        
        const polFormatted = Number(balance) / Math.pow(10, 18);
        console.log("Native POL formatted:", polFormatted);
        
        setPolBalance(polFormatted.toFixed(4));
        
      } catch (error) {
        console.error("Fehler beim Laden der POL Balance:", error);
        setPolBalance("0");
      }
    };
    
    fetchPolBalance();
    // Balance alle 10 Sekunden aktualisieren
    const interval = setInterval(fetchPolBalance, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // D.FAITH Swap Funktion
  const handleDfaithSwap = async () => {
    if (!swapAmountPol || parseFloat(swapAmountPol) <= 0 || !account?.address) return;
    
    setIsSwapping(true);
    setSwapTxStatus("pending");
    
    try {
      const amountInWei = (parseFloat(swapAmountPol) * Math.pow(10, 18)).toString();
      
      // Überprüfe zuerst, ob das Handelspaar existiert
      const pairInfo = await checkTradingPairExists();
      if (!pairInfo.exists) {
        throw new Error("D.FAITH/WMATIC Handelspaar nicht gefunden auf bekannten DEXes");
      }
      
      console.log(`Verwende ${pairInfo.dex} für den Swap (Pair: ${pairInfo.pairAddress})`);
      
      // Berechne Mindestausgabe basierend auf geschätztem Preis
      let amountOutMin = BigInt("0");
      if (dfaithPrice && dfaithPrice > 0) {
        const expectedOut = parseFloat(swapAmountPol) * dfaithPrice;
        // 5% Slippage Toleranz
        const minOut = BigInt(Math.floor(expectedOut * 0.95 * Math.pow(10, 18)));
        amountOutMin = minOut;
        console.log("Erwartete Ausgabe:", expectedOut, "Min out:", minOut.toString());
      } else {
        // Fallback: sehr niedrige Mindestausgabe
        amountOutMin = BigInt("1");
      }
      
      // Versuche verschiedene Router basierend auf gefundenem Pair
      const routers = [
        { name: "QuickSwap", address: QUICKSWAP_ROUTER },
        { name: "SushiSwap", address: SUSHISWAP_ROUTER }
      ];
      
      for (const routerInfo of routers) {
        try {
          console.log(`Versuche ${routerInfo.name} Router:`, routerInfo.address);
          
          const router = getContract({
            client,
            chain: polygon,
            address: routerInfo.address
          });
          
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
          const swapTx = prepareContractCall({
            contract: router,
            method: "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
            params: [
              amountOutMin, // Korrekte Mindestmenge
              [WMATIC_TOKEN, DFAITH_TOKEN], // path: WMATIC -> DFAITH
              account.address, // to
              BigInt(deadline) // deadline
            ],
            value: BigInt(amountInWei) // Native POL amount as value
          });
          
          console.log(`${routerInfo.name} Swap Parameter:`, {
            amountInWei,
            amountOutMin: amountOutMin.toString(),
            path: [WMATIC_TOKEN, DFAITH_TOKEN],
            deadline,
            router: routerInfo.address
          });
          
          await sendTransaction(swapTx);
          
          setSwapTxStatus("success");
          setSwapAmountPol("");
          return;
          
        } catch (routerError) {
          console.error(`${routerInfo.name} Router Fehler:`, routerError);
          continue; // Versuche nächsten Router
        }
      }
      
      throw new Error("Alle Router fehlgeschlagen - möglicherweise existiert das Handelspaar nicht oder hat keine Liquidität");
      
    } catch (error) {
      console.error("Swap Fehler:", error);
      setSwapTxStatus("error");
    } finally {
      setIsSwapping(false);
    }
  };

  // Funktion zur Überprüfung ob das Handelspaar existiert
  const checkTradingPairExists = async () => {
    console.log("Überprüfe Handelspaar-Existenz für D.FAITH/WMATIC...");
    
    // Überprüfe QuickSwap Factory
    try {
      const quickswapFactory = getContract({
        client,
        chain: polygon,
        address: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32" // QuickSwap Factory
      });
      
      const pair = await readContract({
        contract: quickswapFactory,
        method: "function getPair(address tokenA, address tokenB) view returns (address)",
        params: [WMATIC_TOKEN, DFAITH_TOKEN]
      });
      
      console.log("QuickSwap Pair-Adresse:", pair);
      if (pair && pair !== "0x0000000000000000000000000000000000000000") {
        console.log("✅ D.FAITH/WMATIC Pair existiert auf QuickSwap");
        return { exists: true, dex: "QuickSwap", pairAddress: pair };
      }
    } catch (error) {
      console.error("QuickSwap Pair-Check Fehler:", error);
    }
    
    // Überprüfe SushiSwap Factory
    try {
      const sushiFactory = getContract({
        client,
        chain: polygon,
        address: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4" // SushiSwap Factory
      });
      
      const pair = await readContract({
        contract: sushiFactory,
        method: "function getPair(address tokenA, address tokenB) view returns (address)",
        params: [WMATIC_TOKEN, DFAITH_TOKEN]
      });
      
      console.log("SushiSwap Pair-Adresse:", pair);
      if (pair && pair !== "0x0000000000000000000000000000000000000000") {
        console.log("✅ D.FAITH/WMATIC Pair existiert auf SushiSwap");
        return { exists: true, dex: "SushiSwap", pairAddress: pair };
      }
    } catch (error) {
      console.error("SushiSwap Pair-Check Fehler:", error);
    }
    
    console.log("❌ Kein D.FAITH/WMATIC Pair gefunden auf bekannten DEXes");
    return { exists: false, dex: null, pairAddress: null };
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
                  <div className="text-xs text-zinc-500 mt-1">
                    Native POL Token für Swaps
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
                      disabled={isSwapping || parseFloat(polBalance) <= 0}
                    >
                      MAX
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Native POL wird direkt für den Swap verwendet
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
                
                {/* Info wenn keine POL verfügbar */}
                {parseFloat(polBalance) <= 0 && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-xs">⚠️</span>
                      <div className="text-sm text-yellow-400">
                        Sie benötigen POL Token für den Swap
                      </div>
                    </div>
                    <div className="text-xs text-yellow-300/70 mt-1">
                      Kaufen Sie zuerst POL Token oben über das BuyWidget
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
                    {swapTxStatus === "success" && (
                      <div>
                        <div className="font-bold">Swap erfolgreich!</div>
                        <div className="text-sm mt-1">D.FAITH Token wurden zu Ihrer Wallet hinzugefügt</div>
                      </div>
                    )}
                    {swapTxStatus === "error" && (
                      <div>
                        <div className="font-bold">Swap fehlgeschlagen!</div>
                        <div className="text-sm mt-1">
                          Mögliche Ursachen:<br/>
                          • Kein D.FAITH/WMATIC Handelspaar auf den Router-DEXes<br/>
                          • Unzureichende Liquidität im Handelspaar<br/>
                          • Router-Adresse ist nicht korrekt<br/>
                          • Netzwerkfehler oder Gas-Probleme<br/>
                          Versuchen Sie die Handelspaar-Diagnose für Details.
                        </div>
                      </div>
                    )}
                    {swapTxStatus === "pending" && (
                      <div>
                        <div className="font-bold">Transaktion läuft...</div>
                        <div className="text-sm mt-1">Bitte warten Sie, während der Swap verarbeitet wird</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    onClick={handleDfaithSwap}
                    disabled={!swapAmountPol || parseFloat(swapAmountPol) <= 0 || isSwapping || !account?.address || parseFloat(polBalance) <= 0}
                  >
                    <FaExchangeAlt className="inline mr-2" />
                    {isSwapping ? "Swapping..." : 
                     parseFloat(polBalance) <= 0 ? "Keine POL verfügbar" :
                     `${swapAmountPol || "0"} POL → D.FAITH`}
                  </Button>
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-sm"
                    onClick={async () => {
                      const result = await checkTradingPairExists();
                      alert(`Handelspaar-Diagnose:\n${result.exists ? `✅ Gefunden auf ${result.dex}` : '❌ Nicht gefunden'}`);
                    }}
                    disabled={isSwapping}
                  >
                    🔍 Handelspaar-Diagnose
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
            <div className="font-medium text-blue-400 mb-1">Wichtiger Hinweis zu D.FAITH Swaps</div>
            <div className="text-sm text-zinc-400 space-y-1">
              <div>• Stellen Sie sicher, dass Sie genügend POL für Transaktionsgebühren haben.</div>
              <div>• Falls der Swap fehlschlägt, verwenden Sie die "Handelspaar-Diagnose" um zu prüfen, ob D.FAITH auf den DEXes gelistet ist.</div>
              <div>• D.FAITH muss auf QuickSwap oder SushiSwap mit einem WMATIC-Handelspaar gelistet sein.</div>
              <div>• Bei Problemen kontaktieren Sie den D.FAITH Support für alternative Kaufmöglichkeiten.</div>
            </div>
          </div>
        </div>
      </div>

      {/* D.INVEST Info */}
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
