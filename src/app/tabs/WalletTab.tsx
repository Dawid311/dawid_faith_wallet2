import { useEffect, useState, useRef } from "react";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useSendTransaction } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { balanceOf, approve, allowance, transfer } from "thirdweb/extensions/erc20";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy } from "react-icons/fa";
import { FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaExchangeAlt, FaCheckCircle, FaInfoCircle, FaArrowRight } from "react-icons/fa";
import Script from "next/script";

// Modal mit dunklem Farbschema
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 rounded-2xl p-8 min-w-[340px] shadow-2xl relative border border-zinc-700">
        <button className="absolute top-3 right-4 text-2xl text-zinc-500 hover:text-zinc-300" onClick={onClose}>&times;</button>
        <h3 className="font-bold mb-6 text-center text-xl text-amber-400">{title}</h3>
        {children}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    SwapWidget: any;
  }
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID!,
});

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "email", // Email als erste Option für einfachen Zugang
        "google",
        "facebook",
        "apple",
        "x", // Twitter
        "phone",
        // Optionale weitere Optionen
        "discord",
        "telegram",
        "passkey",
        "coinbase",
        // Weniger häufig genutzte Optionen weiter unten
        "twitch",
        "steam",
        "github",
      ],
    },
  }),
  // Gängige Web3 Wallets zuerst
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  // Weitere Wallets
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const { mutate: sendTransaction, data: transactionResult, isPending: isTransactionPending } = useSendTransaction();

  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  
  // Modale State
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showStake, setShowStake] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const uniswapWidgetRef = useRef<HTMLDivElement>(null);
  const [uniswapLoaded, setUniswapLoaded] = useState(false);

  // Neue States für den Swap - vereinfacht nur für Thirdweb
  const [swapAmount, setSwapAmount] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("0.002"); // Fixer Rate für Demo
  const [slippage, setSlippage] = useState("1"); // Default 1%
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [swapStep, setSwapStep] = useState<"input" | "approve" | "swap" | "success" | "error">("input");
  const [swapError, setSwapError] = useState<string | null>(null);
  
  // Neue States für das Senden Modal
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedSendToken, setSelectedSendToken] = useState("DFAITH"); // "DFAITH", "DINVEST", "POL"
  const [isSending, setIsSending] = useState(false);
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff", // D.FAITH Token-Contract
    decimals: 18,
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0x72a428F03d7a301cEAce084366928b99c4d757bD", // D.INVEST Token-Contract
    decimals: 18,
    symbol: "D.INVEST"
  };

  const STAKING_CONTRACT = {
    address: "0xe730555afA4DeA022976DdDc0cC7DBba1C98568A", // D.INVEST Staking Contract
    name: "D.INVEST Staking"
  };

  const POL_TOKEN = {
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    decimals: 18,
    symbol: "POL"
  };

  useEffect(() => {
    fetchBalances();
  }, [account?.address]);

  // Uniswap Widget initialisieren, wenn Modal geöffnet wird
  useEffect(() => {
    if (showSell && uniswapWidgetRef.current && uniswapLoaded && window.SwapWidget) {
      try {
        const widget = new window.SwapWidget({
          width: "100%",
          theme: {
            primary: "#1c1c1c",
            secondary: "#2c2c2c",
            interactive: "#fbbf24",
            container: "#18181b",
            module: "#27272a",
            accent: "#f59e0b",
            outline: "#3f3f46",
            dialog: "#18181b",
            fontFamily: "Inter"
          },
          defaultInputTokenAddress: "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff", // D.FAITH Token-Contract-Adresse
          defaultInputAmount: 1,
          defaultOutputTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC auf Polygon
          jsonRpcEndpoint: "https://polygon-rpc.com", // Expliziten RPC Endpoint angeben
          tokenList: [
            {
              "name": "D.FAITH Token",
              "address": "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff", // D.FAITH Token-Contract
              "symbol": "D.FAITH",
              "decimals": 18,
              "chainId": 137,
              "logoURI": "https://placehold.co/200x200/gold/black?text=DF"
            },
            {
              "name": "Wrapped Matic",
              "address": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
              "symbol": "WMATIC",
              "decimals": 18,
              "chainId": 137,
              "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png"
            }
          ]
        });
        
        // Widget zum Container hinzufügen
        const container = uniswapWidgetRef.current;
        container.innerHTML = "";
        widget.render(container);
        
        return () => {
          if (container) container.innerHTML = "";
        };
      } catch (error) {
        console.error("Fehler beim Initialisieren des Uniswap Widgets:", error);
      }
    }
  }, [showSell, uniswapLoaded, account]);

  const copyWalletAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      // Optional: Snackbar statt alert für bessere UX
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Token-Freigabe behandeln mit echtem Thirdweb approve
  const handleApproval = async () => {
    if (!account?.address || !swapAmount) return;
    
    setSwapStep("approve");
    setIsApproving(true);
    
    try {
      const dfaithContract = getContract({
        client,
        chain: polygon,
        address: DFAITH_TOKEN.address
      });
      
      // 1inch Router Adresse für Polygon
      const ONEINCH_ROUTER = "0x111111125421cA6dc452d289314280a0f8842A65";
      
      // Bereite Approval-Transaktion vor
      const approvalAmount = parseFloat(swapAmount) * Math.pow(10, DFAITH_TOKEN.decimals);
      
      const transaction = approve({
        contract: dfaithContract,
        spender: ONEINCH_ROUTER,
        amount: approvalAmount.toString()
      });
      
      // Sende Transaktion über sendTransaction Hook
      sendTransaction(transaction, {
        onSuccess: (result) => {
          console.log("Token-Freigabe erfolgreich:", result);
          setNeedsApproval(false);
          setSwapStep("input");
          setSwapError(null);
          // Merke erfolgreiche Approval für spätere Checks
          localStorage.setItem(`approval_${account.address}_dfaith`, "true");
        },
        onError: (error) => {
          console.error("Freigabe fehlgeschlagen:", error);
          setSwapStep("error");
          setSwapError(`Freigabe fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
        }
      });
      
    } catch (error) {
      console.error("Fehler beim Vorbereiten der Freigabe:", error);
      setSwapStep("input");
    } finally {
      setIsApproving(false);
    }
  };

  // Echte Preisschätzung über 1inch oder andere DEX APIs
  const calculateEstimate = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0 || !account?.address) {
      setEstimatedOutput("0");
      return;
    }
    
    // Zeige Warnung bei zu kleinen Beträgen
    const minAmount = 10;
    if (parseFloat(swapAmount) < minAmount) {
      setEstimatedOutput("0");
      return;
    }
    
    try {
      // Verwende 1inch API für echte Preisschätzung auf Polygon
      const fromTokenAddress = DFAITH_TOKEN.address;
      const toTokenAddress = POL_TOKEN.address;
      const amount = BigInt(parseFloat(swapAmount) * Math.pow(10, DFAITH_TOKEN.decimals)).toString();
      
      const quoteUrl = `https://api.1inch.dev/swap/v6.0/137/quote?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amount}`;
      
      const response = await fetch(quoteUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY || ''}`,
          'accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const outputAmount = (parseFloat(data.dstAmount) / Math.pow(10, POL_TOKEN.decimals)).toFixed(6);
        setEstimatedOutput(outputAmount);
        
        // Berechne Exchange Rate
        const rate = (parseFloat(outputAmount) / parseFloat(swapAmount)).toFixed(6);
        setExchangeRate(rate);
      } else {
        // Bei API Fehlern: Zeige, dass Quote nicht verfügbar
        console.log("1inch Quote API Fehler:", response.status);
        setEstimatedOutput("0");
        setExchangeRate("0");
      }
      
    } catch (error) {
      console.error("Fehler beim Abrufen der Preisschätzung:", error);
      // Fallback: Zeige keine Schätzung bei Fehlern
      setEstimatedOutput("0");
      setExchangeRate("0");
    }
  };

  // Prüfe ob Token-Freigabe benötigt wird (echte Implementierung)
  const checkApprovalStatus = async () => {
    if (!account?.address || !swapAmount || parseFloat(swapAmount) <= 0) {
      setNeedsApproval(false);
      return;
    }
    
    try {
      const dfaithContract = getContract({
        client,
        chain: polygon,
        address: DFAITH_TOKEN.address
      });
      
      // 1inch Router Adresse für Polygon
      const ONEINCH_ROUTER = "0x111111125421cA6dc452d289314280a0f8842A65";
      
      const currentAllowance = await allowance({
        contract: dfaithContract,
        owner: account.address,
        spender: ONEINCH_ROUTER
      });
      
      const requiredAmount = BigInt(parseFloat(swapAmount) * Math.pow(10, DFAITH_TOKEN.decimals));
      setNeedsApproval(currentAllowance < requiredAmount);
      
    } catch (error) {
      console.error("Fehler beim Überprüfen der Allowance:", error);
      setNeedsApproval(true);
    }
  };

  // Echter Swap mit 1inch DEX
  const executeThirdwebSwap = async () => {
    if (!account?.address || !swapAmount || parseFloat(swapAmount) <= 0) return;
    
    // Validierung: Mindestbetrag für 1inch ist 10 D.FAITH
    const minAmount = 10;
    if (parseFloat(swapAmount) < minAmount) {
      setSwapStep("error");
      setSwapError(`Mindestbetrag für Swaps: ${minAmount} D.FAITH`);
      return;
    }
    
    // Validierung: Ausreichendes Guthaben
    const availableBalance = dfaithBalance ? Number(dfaithBalance.displayValue) : 0;
    if (parseFloat(swapAmount) > availableBalance) {
      setSwapStep("error");
      setSwapError(`Unzureichendes Guthaben. Verfügbar: ${availableBalance.toFixed(4)} D.FAITH`);
      return;
    }
    
    setIsLoading(true);
    setSwapStep("swap");
    
    try {
      const fromTokenAddress = DFAITH_TOKEN.address;
      const toTokenAddress = POL_TOKEN.address;
      const amount = BigInt(parseFloat(swapAmount) * Math.pow(10, DFAITH_TOKEN.decimals)).toString();
      const fromAddress = account.address;
      const slippagePercentage = parseFloat(slippage);
      
      // 1inch Swap API Aufruf
      const swapUrl = `https://api.1inch.dev/swap/v6.0/137/swap?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amount}&from=${fromAddress}&slippage=${slippagePercentage}`;
      
      const response = await fetch(swapUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY || ''}`,
          'accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const swapData = await response.json();
        
        // Bereite Raw-Transaktion für Thirdweb vor
        const transaction = {
          chain: polygon,
          client,
          to: swapData.tx.to,
          data: swapData.tx.data,
          value: BigInt(swapData.tx.value || "0"),
        };
        
        // Sende Transaktion über Thirdweb
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Swap erfolgreich:", result);
            setSwapStep("success");
            setSwapError(null);
            
            // Nach 3 Sekunden zurücksetzen
            setTimeout(() => {
              setSwapAmount("");
              setEstimatedOutput("0");
              setSwapStep("input");
              setShowSell(false);
              fetchBalances(); // Balances aktualisieren
            }, 3000);
          },
          onError: (error) => {
            console.error("Swap fehlgeschlagen:", error);
            setSwapStep("error");
            setSwapError(`Swap fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
          }
        });
        
      } else {
        // Fallback: Zeige Fehler, dass 1inch API nicht verfügbar ist
        console.log("1inch API nicht verfügbar oder fehlgeschlagen");
        setSwapStep("error");
        setSwapError("DEX-Service momentan nicht verfügbar. Bitte versuchen Sie es später erneut.");
      }
      
    } catch (error) {
      console.error("Swap fehlgeschlagen:", error);
      setSwapStep("error");
      setSwapError(`Swap fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Berechne Schätzung wenn sich Betrag ändert
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateEstimate();
      checkApprovalStatus();
    }, 300); // Schnellere Response
    
    return () => clearTimeout(timer);
  }, [swapAmount, exchangeRate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hauptfunktion für Swap-Prozess
  const handleSwapAction = async () => {
    if (!account?.address || !swapAmount || parseFloat(swapAmount) <= 0) return;
    
    if (needsApproval && swapStep === "input") {
      await handleApproval();
    } else if (!needsApproval || swapStep === "swap") {
      await executeThirdwebSwap();
    }
  };

  // Hilfsfunktion für Balance-Aktualisierung
  const fetchBalances = async () => {
    if (!account?.address) {
      setDfaithBalance(null);
      setDinvestBalance(null);
      return;
    }
    
    try {
      console.log("Wallet-Adresse:", account.address);
      console.log("Lade Balances...");
      
      // D.FAITH Balance abrufen
      const dfaithContract = getContract({
        client,
        chain: polygon,
        address: DFAITH_TOKEN.address
      });
      
      const dfaithBalanceResult = await balanceOf({
        contract: dfaithContract,
        address: account.address
      });
      
      // D.INVEST Balance abrufen
      const dinvestContract = getContract({
        client,
        chain: polygon,
        address: DINVEST_TOKEN.address
      });
      
      const dinvestBalanceResult = await balanceOf({
        contract: dinvestContract,
        address: account.address
      });
      
      // Balances formatieren und setzen
      const dfaithFormatted = Number(dfaithBalanceResult) / Math.pow(10, DFAITH_TOKEN.decimals);
      const dinvestFormatted = Number(dinvestBalanceResult) / Math.pow(10, DINVEST_TOKEN.decimals);
      
      setDfaithBalance({ displayValue: dfaithFormatted.toFixed(4) });
      setDinvestBalance({ displayValue: Math.floor(dinvestFormatted).toString() });
      
    } catch (error) {
      console.error("Fehler beim Abrufen der Balances:", error);
      setDfaithBalance({ displayValue: "0.0000" });
      setDinvestBalance({ displayValue: "0" });
    }
  };

  // Sende-Funktion
  const executeSend = async () => {
    if (!account?.address || !sendAmount || parseFloat(sendAmount) <= 0 || !sendToAddress) {
      return;
    }
    
    setIsSending(true);
    
    try {
      // Hier würde die Transaktion vorbereitet und gesendet werden
      // Diese Funktion benötigt die vollständige Web3-Integration
      
      alert(`In einer echten Implementierung würde jetzt ${sendAmount} ${selectedSendToken} an ${sendToAddress} gesendet werden.`);
      
      // Nach erfolgreichem Senden zurücksetzen
      setSendAmount("");
      setSendToAddress("");
      
    } catch (error) {
      console.error("Fehler beim Senden:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Hilfsfunktion um verfügbares Guthaben für gewählten Token zu bekommen
  const getAvailableBalance = () => {
    switch (selectedSendToken) {
      case "DFAITH":
        return dfaithBalance ? Number(dfaithBalance.displayValue) : 0;
      case "DINVEST":
        return dinvestBalance ? Number(dinvestBalance.displayValue) : 0;
      case "POL":
        return 0; // POL Balance würde hier abgerufen werden
      default:
        return 0;
    }
  };

  // --- NEU: Polygonscan API Transaktionshistorie ---
  const POLYGONSCAN_API_KEY = "V6Q5223DMWPP3HQJE9IJ8UIHSP3NUHID5K";
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<"ALL" | "DFAITH" | "DINVEST">("ALL");

  useEffect(() => {
    if (showHistory && account?.address) {
      fetchTransactions();
    }
    // eslint-disable-next-line
  }, [showHistory, account?.address]);

  const fetchTransactions = async () => {
    if (!account?.address) {
      setTransactions([]);
      return;
    }
    setTxLoading(true);
    setTxError(null);
    setTransactions([]);
    try {
      const url = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${account.address}&startblock=0&endblock=99999999&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "1" && Array.isArray(data.result)) {
        setTransactions(data.result);
      } else {
        setTransactions([]);
        setTxError("Keine Transaktionen gefunden");
      }
    } catch (e) {
      setTxError("Fehler beim Laden der Transaktionen");
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  if (status !== "connected" || !account?.address) {
    return (
      <div className="flex flex-col items-center min-h-[70vh] justify-center bg-black py-8">
        <Card className="w-full max-w-sm bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
          {/* Glanzeffekt/Highlight oben */}
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-t-3xl"></div>
          
          <CardContent className="p-8 relative z-10">
            {/* Logo/Header */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-xl" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                Dawid Faith Wallet
              </h2>
            </div>
            
            <p className="text-zinc-400 text-center mb-8">
              Verbinde dich, um auf deine Token zuzugreifen
            </p>
            
            {/* Angepasster Connect Button mit begrenzten Optionen - jetzt zentriert */}
            <div className="flex justify-center w-full">
              <ConnectButton
                client={client}
                connectButton={{ 
                  label: "Wallet verbinden",
                  className: "w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
                }}
                connectModal={{
                  size: "compact",
                  title: "Wallet verbinden", 
                  welcomeScreen: {
                    title: "Dawid Faith Wallet",
                    subtitle: "Wähle deine bevorzugte Anmeldemethode",
                    img: {
                      src: "https://placehold.co/400x200/gold/black?text=DFAITH",
                      width: 400,
                      height: 200
                    }
                  },
                }}
                wallets={[
                  inAppWallet({
                    auth: {
                      options: [
                        "email", 
                        "google",
                        "facebook",
                      ],
                    },
                  }),
                  createWallet("io.metamask"),
                  createWallet("com.coinbase.wallet"),
                ]}
                chain={{
                  id: 137,
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Script 
        src="https://unpkg.com/@uniswap/widgets@latest/dist/uniswap-widgets.js" 
        onLoad={() => setUniswapLoaded(true)}
      />
      
      <div className="flex justify-center min-h-[70vh] items-center py-8 bg-black">
        <Card className="w-full max-w-xl bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
          {/* Verbesserte Glanzeffekte */}
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 rounded-t-3xl"></div>
          <div className="absolute top-0 right-0 w-1/3 h-20 bg-amber-400/10 blur-3xl rounded-full"></div>
          
          <CardContent className="p-6 md:p-10 relative z-10">
            {/* Header mit verbessertem Gold-Akzent */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-lg shadow-amber-500/20">
                  <FaCoins className="text-black text-lg md:text-xl" />
                </div>
                <span className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Dawid Faith Wallet
                </span>
              </div>
              <ConnectButton
                client={client}
                connectButton={{ 
                  label: "", 
                  className: "bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
                }}
                connectModal={{ size: "compact" }}
                wallets={wallets}
                chain={{
                  id: 137,
                  rpc: "https://polygon-rpc.com",
                }}
              />
            </div>

            {/* Wallet Address mit besserem Styling */}
            <div className="flex justify-between items-center bg-zinc-800/70 backdrop-blur-sm rounded-xl p-3 mb-6 border border-zinc-700/80">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 mb-0.5">Wallet Adresse</span>
                <span className="font-mono text-zinc-300 text-sm">{formatAddress(account.address)}</span>
              </div>
              <button
                onClick={copyWalletAddress}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-all duration-200"
                title="Adresse kopieren"
              >
                <FaRegCopy /> Kopieren
              </button>
            </div>

            {/* DFAITH Token-Karte - jetzt mit D.FAITH */}
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full mb-6">
              <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.FAITH</span>
              <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
                {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.00"}
              </div>
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent my-3"></div>
              
              <div className="text-xs text-zinc-500">
                ≈ 0.00 EUR
              </div>
            </div>

            {/* Action Buttons mit besseren Gradienten */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowBuy(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowDown className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Kaufen</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSell(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaArrowUp className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Verkaufen</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowSend(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaPaperPlane className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Senden</span>
              </Button>
              <Button
                className="flex flex-col items-center justify-center gap-1 px-1 py-3.5 md:py-4.5 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
                onClick={() => setShowHistory(true)}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                  <FaCoins className="text-black text-sm" />
                </div>
                <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">History</span>
              </Button>
            </div>
            
            {/* D.INVEST immer anzeigen wenn Balance definiert ist */}
            {(() => {
              console.log("D.INVEST Render Check:", {
                dinvestBalance,
                displayValue: dinvestBalance?.displayValue,
                asNumber: dinvestBalance ? Number(dinvestBalance.displayValue) : 'undefined'
              });
              return dinvestBalance;
            })() && (
              <div className="flex flex-col p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="uppercase text-xs tracking-widest text-amber-500/80">D.INVEST</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                    {dinvestBalance ? parseInt(dinvestBalance.displayValue, 10) : 0}
                  </div>
                  
                  <button 
                    onClick={() => setShowStake(true)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 hover:from-amber-500/30 hover:to-amber-600/30 transition-all border border-amber-500/20"
                  >
                    <FaLock size={12} />
                    <span className="text-sm font-medium">Staken & Verdienen</span>
                  </button>
                </div>
                {/* Gestaked Anzeige */}
                <div className="text-xs text-zinc-500 mt-2">
                  Gestaked: <span className="text-amber-400/80">0</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kauf-Modal mit 3 Buttons */}
        <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Token kaufen">
          <div className="flex flex-col gap-5">
            {/* DFAITH mit POL kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">DFAITH</span>
                </div>
                <span className="text-xs text-zinc-400">mit POL kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2">
                DFAITH kaufen
              </Button>
            </div>
            
            {/* D.INVEST mit € kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaLock className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">D.INVEST</span>
                </div>
                <span className="text-xs text-zinc-400">mit € kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2">
                D.INVEST kaufen
              </Button>
            </div>
            
            {/* POL mit € kaufen */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-purple-400">POLYGON</span>
                </div>
                <span className="text-xs text-zinc-400">mit € kaufen</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-2">
                POL kaufen
              </Button>
            </div>
          </div>
          
          <Button className="mt-5 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowBuy(false)}>
            Schließen
          </Button>
        </Modal>

        {/* Komprimiertes Thirdweb Verkaufs-Modal */}
        <Modal open={showSell} onClose={() => {
          setShowSell(false);
          setSwapStep("input");
          setSwapAmount("");
          setEstimatedOutput("0");
        }} title="D.FAITH zu POL tauschen">
          <div className="flex flex-col gap-4">
            {/* Kompakte Thirdweb Branding */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-2 border border-purple-500/20">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">T</span>
                </div>
                <span className="text-sm font-medium text-purple-400">Thirdweb DEX</span>
              </div>
              <div className="text-xs text-zinc-500">Beste Preise</div>
            </div>

            {swapStep === "input" && (
              <>
                {/* Horizontale Token-Eingabe (links nach rechts) */}
                <div className="space-y-4">
                  {/* Swap Container - responsive horizontal/vertikal */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {/* Von Token (links/oben) */}
                    <div className="flex-1 min-w-0 bg-zinc-800 rounded-lg border border-zinc-700 p-3 w-full">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-zinc-400">Du verkaufst</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-zinc-500">
                            Max: <span className="text-amber-400 font-medium">
                              {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(2) : "0.00"}
                            </span>
                          </span>
                          <span className="text-[10px] text-amber-500/70">
                            Min: 10 D.FAITH
                          </span>
                        </div>
                      </div>
                      {/* Token-Label */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-black">DF</span>
                        </div>
                        <span className="text-sm text-amber-400 font-medium">D.FAITH</span>
                      </div>
                      {/* Eingabefeld - GRÖSSER und SICHTBARER */}
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          className="flex-1 min-w-0 bg-zinc-900 border border-amber-500/30 rounded-lg px-3 py-2 text-lg font-bold text-amber-400 placeholder-amber-600/50 focus:outline-none focus:border-amber-500 focus:bg-zinc-800"
                          placeholder="0.0000"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          step="any"
                          min="0"
                        />
                        <button 
                          className="px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition border border-amber-500/30"
                          onClick={() => setSwapAmount(dfaithBalance?.displayValue || "0")}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Horizontaler Tausch-Pfeil */}
                    <div className="flex items-center justify-center my-2 sm:my-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 border-2 border-zinc-900 flex items-center justify-center shadow-lg">
                        <FaArrowRight className="text-white text-sm" />
                      </div>
                    </div>

                    {/* Zu Token (rechts/unten) */}
                    <div className="flex-1 min-w-0 bg-zinc-800 rounded-lg border border-zinc-700 p-3 w-full">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-zinc-400">Du erhältst</span>
                        <span className="text-xs text-zinc-500">Geschätzt</span>
                      </div>
                      {/* Token-Label */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">P</span>
                        </div>
                        <span className="text-sm text-purple-400 font-medium">POL</span>
                      </div>
                      {/* Output-Anzeige */}
                      <div className="bg-zinc-900 border border-purple-500/30 rounded-lg px-3 py-2">
                        <div className="text-lg font-bold text-purple-400">
                          {estimatedOutput}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kompakte Handelsdetails */}
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Kurs</span>
                      <span className="text-zinc-300">1 D.FAITH = {exchangeRate} POL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Slippage</span>
                      <select 
                        className="bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-xs text-amber-400"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                      >
                        <option value="0.5">0.5%</option>
                        <option value="1">1%</option>
                        <option value="2">2%</option>
                        <option value="3">3%</option>
                      </select>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Gebühren</span>
                      <span className="text-zinc-300">~0.002 POL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Mindesterhalt</span>
                      <span className="text-zinc-300">
                        {(parseFloat(estimatedOutput) * (1 - parseFloat(slippage) / 100)).toFixed(4)} POL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mindestbetrag-Warnung */}
                {parseFloat(swapAmount) > 0 && parseFloat(swapAmount) < 10 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FaInfoCircle className="text-yellow-400 text-sm flex-shrink-0" />
                      <div className="text-xs">
                        <div className="font-medium text-yellow-400 mb-1">Mindestbetrag erforderlich</div>
                        <div className="text-zinc-400">
                          Für Swaps über 1inch DEX ist ein Mindestbetrag von 10 D.FAITH erforderlich.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Kompakte Approval-Warnung */}
                {needsApproval && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FaInfoCircle className="text-blue-400 text-sm flex-shrink-0" />
                      <div className="text-xs">
                        <div className="font-medium text-blue-400 mb-1">Token-Freigabe erforderlich</div>
                        <div className="text-zinc-400">
                          Einmalige Freigabe für Thirdweb DEX erforderlich.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button - optimiert für mobile */}
                <Button
                  className={`w-full py-3 font-bold rounded-xl transition-all ${
                    parseFloat(swapAmount) > 0 && parseFloat(swapAmount) >= 10 && !isTransactionPending
                      ? needsApproval
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                        : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  }`}
                  onClick={handleSwapAction}
                  disabled={parseFloat(swapAmount) <= 0 || parseFloat(swapAmount) < 10 || isTransactionPending}
                >
                  {parseFloat(swapAmount) <= 0 ? (
                    "Betrag eingeben"
                  ) : parseFloat(swapAmount) < 10 ? (
                    "Mindestens 10 D.FAITH erforderlich"
                  ) : needsApproval ? (
                    <div className="flex items-center justify-center gap-2">
                      <FaCheckCircle className="text-sm" />
                      <span>Token freigeben</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <FaExchangeAlt className="text-sm" />
                      <span>Jetzt tauschen</span>
                    </div>
                  )}
                </Button>
              </>
            )}

            {swapStep === "approve" && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <div className="font-bold text-blue-400 mb-1">Token-Freigabe läuft...</div>
                  <div className="text-sm text-zinc-400">
                    Bestätige die Transaktion in deinem Wallet
                  </div>
                </div>
              </div>
            )}

            {swapStep === "swap" && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <div className="font-bold text-purple-400 mb-1">Swap wird durchgeführt...</div>
                  <div className="text-sm text-zinc-400 mb-2">
                    {swapAmount} D.FAITH → {estimatedOutput} POL
                  </div>
                  <div className="text-xs text-zinc-500">
                    Dies kann einige Sekunden dauern
                  </div>
                </div>
              </div>
            )}

            {swapStep === "error" && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                  <FaInfoCircle className="text-red-400 text-xl" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-400 mb-1">Fehler aufgetreten</div>
                  <div className="text-sm text-zinc-400 mb-2">
                    {swapError || "Unbekannter Fehler"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Bitte versuchen Sie es erneut
                  </div>
                </div>
                <Button
                  className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 px-4 py-2 text-sm"
                  onClick={() => {
                    setSwapStep("input");
                    setSwapError(null);
                  }}
                >
                  Erneut versuchen
                </Button>
              </div>
            )}

            {swapStep === "success" && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <FaCheckCircle className="text-green-400 text-xl" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-400 mb-1">Swap erfolgreich!</div>
                  <div className="text-sm text-zinc-400 mb-2">
                    {swapAmount} D.FAITH → {estimatedOutput} POL
                  </div>
                  <div className="text-xs text-zinc-500">
                    Balances werden aktualisiert...
                  </div>
                </div>
              </div>
            )}
            
          </div>
          
          {/* Schließen-Button immer sichtbar */}
          <div className="flex gap-2 mt-4">
            <Button 
              className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 py-2" 
              onClick={() => {
                setShowSell(false);
                setSwapStep("input");
                setSwapAmount("");
                setEstimatedOutput("0");
                setSwapError(null);
              }}
            >
              {swapStep === "success" || swapStep === "error" ? "Fertig" : "Abbrechen"}
            </Button>
            {swapStep === "input" && parseFloat(swapAmount) > 0 && (
              <Button 
                className="px-4 bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 py-2 text-sm"
                onClick={() => {
                  setSwapAmount("");
                  setEstimatedOutput("0");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </Modal>

        <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
          <div className="flex flex-col gap-4">
            {/* Token Auswahl */}
            <div className="flex flex-col gap-3">
              <span className="text-sm text-zinc-300">Token auswählen:</span>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition ${
                    selectedSendToken === "DFAITH" 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                  }`}
                  onClick={() => setSelectedSendToken("DFAITH")}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-black">DF</span>
                  </div>
                  <span className="text-xs font-medium">D.FAITH</span>
                  <span className="text-[10px] text-zinc-500">
                    {dfaithBalance ? Number(dfaithBalance.displayValue).toFixed(4) : "0.0000"}
                  </span>
                </button>
                
                <button 
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition ${
                    selectedSendToken === "DINVEST" 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                  }`}
                  onClick={() => setSelectedSendToken("DINVEST")}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
                    <FaLock className="text-black text-xs" />
                  </div>
                  <span className="text-xs font-medium">D.INVEST</span>
                  <span className="text-[10px] text-zinc-500">
                    {dinvestBalance ? parseInt(dinvestBalance.displayValue, 10) : "0"}
                  </span>
                </button>
                
                <button 
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition ${
                    selectedSendToken === "POL" 
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                  }`}
                  onClick={() => setSelectedSendToken("POL")}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">P</span>
                  </div>
                  <span className="text-xs font-medium">POL</span>
                  <span className="text-[10px] text-zinc-500">0.0000</span>
                </button>
              </div>
            </div>

            {/* Empfänger Adresse */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-zinc-300">Empfänger Adresse:</span>
              <input 
                type="text"
                placeholder="0x..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-3 px-4 text-zinc-300 focus:border-amber-500 focus:outline-none"
                value={sendToAddress}
                onChange={(e) => setSendToAddress(e.target.value)}
              />
            </div>

            {/* Betrag */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-300">Betrag:</span>
                <span className="text-xs text-zinc-500">
                  Verfügbar: <span className={`${
                    selectedSendToken === "POL" ? "text-purple-400" : "text-amber-400"
                  }`}>
                    {getAvailableBalance().toFixed(4)} {selectedSendToken}
                  </span>
                </span>
              </div>
              
              <div className="relative">
                <input 
                  type="number"
                  placeholder="0.0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-3 px-4 pr-16 text-zinc-300 focus:border-amber-500 focus:outline-none"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition"
                  onClick={() => setSendAmount(getAvailableBalance().toString())}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Geschätzte Kosten */}
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Netzwerkgebühren:</span>
                <span className="text-zinc-400">~0.001 POL</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-zinc-500">Gesamtkosten:</span>
                <span className="text-zinc-300">
                  {sendAmount || "0"} {selectedSendToken} + 0.001 POL
                </span>
              </div>
            </div>

            {/* Senden Button */}
            <Button
              className={`w-full py-3 font-bold rounded-xl ${
                parseFloat(sendAmount) > 0 && sendToAddress && !isSending
                  ? selectedSendToken === "POL" 
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                    : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              }`}
              onClick={executeSend}
              disabled={parseFloat(sendAmount) <= 0 || !sendToAddress || isSending}
            >
              {isSending ? (
                <div className="flex justify-center items-center gap-2">
                  <div className={`w-5 h-5 border-t-2 border-r-2 ${
                    selectedSendToken === "POL" ? "border-white" : "border-black"
                  } rounded-full animate-spin`}></div>
                  <span>Wird gesendet...</span>
                </div>
              ) : parseFloat(sendAmount) <= 0 || !sendToAddress ? (
                "Betrag und Adresse eingeben"
              ) : (
                `${selectedSendToken} senden`
              )}
            </Button>
            
            {/* Warnung */}
            <div className="text-xs text-zinc-500 flex items-center gap-2 mt-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-400 text-[10px]">!</span>
              </div>
              <span>
                Überprüfen Sie die Empfängeradresse sorgfältig. Transaktionen können nicht rückgängig gemacht werden.
              </span>
            </div>
          </div>
          
          <Button className="mt-5 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowSend(false)}>
            Schließen
          </Button>
        </Modal>
        
        <Modal open={showStake} onClose={() => setShowStake(false)} title="D.INVEST staken">
          <div className="flex flex-col gap-4">
            {/* Verfügbare & Gestakte Tokens */}
            <div className="grid grid-cols-2 gap-4 mb-1">
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <span className="text-xs text-zinc-500 mb-1">Verfügbar</span>
                <div className="text-lg font-bold text-amber-400">
                  {dinvestBalance ? Number(dinvestBalance.displayValue) : 0}
                </div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <span className="text-xs text-zinc-500 mb-1">Gestaked</span>
                <div className="text-lg font-bold text-amber-400">0</div>
              </div>
            </div>
            
            {/* Stake und Unstake nebeneinander */}
            <div className="grid grid-cols-2 gap-4">
              {/* Staking-Option */}
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-amber-400">Staken</span>
                  <button 
                    className="text-[10px] px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-amber-400"
                    onClick={() => {/* Maximalbetrag setzen */}}
                  >
                    MAX
                  </button>
                </div>
                <div className="relative mb-2">
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 px-2 text-amber-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium text-xs py-1.5"
                  onClick={() => {/* Stake-Logik */}}
                >
                  Staken
                </Button>
              </div>
              
              {/* Unstaking-Option */}
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400">Unstaken</span>
                  <button 
                    className="text-[10px] px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400"
                    onClick={() => {/* Maximalbetrag setzen */}}
                  >
                    MAX
                  </button>
                </div>
                <div className="relative mb-2">
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 px-2 text-zinc-400 focus:border-zinc-600 focus:outline-none text-sm"
                  />
                </div>
                <Button 
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium text-xs py-1.5"
                  onClick={() => {/* Unstake-Logik */}}
                >
                  Unstaken
                </Button>
              </div>
            </div>
            
            {/* Rewards - bleibt unverändert */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                    <FaCoins className="text-black text-sm" />
                  </div>
                  <span className="font-medium text-amber-400">Belohnungen</span>
                </div>
                <span className="text-xs text-zinc-400">
                  Gesammelt: <span className="text-amber-400 font-bold">0 D.FAITH</span>
                </span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-2 opacity-50 cursor-not-allowed"
                disabled={true}
              >
                Belohnungen einfordern
              </Button>
            </div>
            
            {/* Smart Contract Info - etwas kompakter */}
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 text-xs">
              <div className="flex items-center gap-1.5">
                <FaLock className="text-amber-400 text-[10px]" />
                <span className="text-zinc-400">Smart Contract:</span>
                <span className="font-mono text-amber-400/70 break-all">{STAKING_CONTRACT.address}</span>
              </div>
            </div>
          </div>
          
          {/* Schließen-Button hinzugefügt */}
          <Button className="mt-4 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowStake(false)}>
            Schließen
          </Button>
        </Modal>

        {/* History Modal */}
        <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Transaktionshistorie">
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTxFilter("ALL")} className={`px-3 py-1 rounded-lg border text-xs font-medium ${txFilter==="ALL" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-600"}`}>Alle</button>
              <button onClick={() => setTxFilter("DFAITH")} className={`px-3 py-1 rounded-lg border text-xs font-medium ${txFilter==="DFAITH" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-600"}`}>D.FAITH</button>
              <button onClick={() => setTxFilter("DINVEST")} className={`px-3 py-1 rounded-lg border text-xs font-medium ${txFilter==="DINVEST" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-600"}`}>D.INVEST</button>
            </div>

            {/* Echte Transaktionen */}
            <div className="space-y-3">
              {txLoading ? (
                <div className="text-center text-zinc-500 py-8">Lade Transaktionen...</div>
              ) : txError ? (
                <div className="text-center text-zinc-500 py-8">{txError}</div>
              ) : transactions.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">Keine Transaktionen gefunden</div>
              ) : (
                transactions
                  .filter(tx => {
                    if (txFilter === "ALL") return true;
                    if (txFilter === "DFAITH") return tx.contractAddress.toLowerCase() === DFAITH_TOKEN.address.toLowerCase();
                    if (txFilter === "DINVEST") return tx.contractAddress.toLowerCase() === DINVEST_TOKEN.address.toLowerCase();
                    return true;
                  })
                  .slice(0, 20)
                  .map(tx => (
                    <div key={tx.hash} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-400">{tx.tokenSymbol}</span>
                        <span className="text-zinc-400">{new Date(Number(tx.timeStamp)*1000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">{tx.from.toLowerCase() === account.address.toLowerCase() ? "Gesendet" : "Empfangen"}</span>
                        <span className={tx.from.toLowerCase() === account.address.toLowerCase() ? "text-red-400" : "text-green-400"}>
                          {tx.from.toLowerCase() === account.address.toLowerCase() ? "-" : "+"}
                          {(Number(tx.value) / Math.pow(10, tx.tokenDecimal)).toFixed(4)} {tx.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <a href={`https://polygonscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Details</a>
                        <span className="text-zinc-500">Block: {tx.blockNumber}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
            {/* Load More Button (optional) kann später ergänzt werden */}
          </div>
          {/* Schließen-Button */}
          <Button className="mt-4 w-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700" onClick={() => setShowHistory(false)}>
            Schließen
          </Button>
        </Modal>
      </div>
    </>
  );
}