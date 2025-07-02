"use client";

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
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ClientOnlyWrapper } from "../components/ClientOnlyWrapper";
import { SwapModalContent } from "../components/SwapModalContent";

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
        "email",
        "google",
        "facebook",
        "apple",
        "x",
        "phone",
        "discord",
        "telegram",
        "passkey",
        "coinbase",
        "twitch",
        "steam",
        "github",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

// Konstanten für Token mit echten Contract-Adressen
const DFAITH_TOKEN = {
  address: "0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff",
  decimals: 18,
  symbol: "D.FAITH",
  name: "D.FAITH Token"
};

const DINVEST_TOKEN = {
  address: "0x72a428F03d7a301cEAce084366928b99c4d757bD",
  decimals: 18,
  symbol: "D.INVEST",
  name: "D.INVEST Token"
};

const POL_TOKEN = {
  address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  decimals: 18,
  symbol: "POL",
  name: "Polygon Ecosystem Token"
};

const STAKING_CONTRACT = {
  address: "0x1234567890123456789012345678901234567890",
  decimals: 18,
  symbol: "STAKING"
};

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const { mutate: sendTransaction, data: transactionResult, isPending: isTransactionPending } = useSendTransaction();

  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  
  // Modal States
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showStake, setShowStake] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Swap Modal States
  const [swapAmount, setSwapAmount] = useState("");
  const [selectedSellToken, setSelectedSellToken] = useState(DFAITH_TOKEN);
  const [selectedBuyToken, setSelectedBuyToken] = useState(POL_TOKEN);
  const [estimatedReceiveAmount, setEstimatedReceiveAmount] = useState("0");
  
  // Send modal state
  const [sendAmount, setSendAmount] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [selectedSendToken, setSelectedSendToken] = useState(DFAITH_TOKEN);
  const [isSending, setIsSending] = useState(false);

  // Needsapproval state (simplified)
  const [needsApproval, setNeedsApproval] = useState(false);

  // Fetch Token Balances
  const fetchBalances = async () => {
    if (!account?.address) return;
    
    try {
      const dfaithContract = getContract({
        client,
        chain: polygon,
        address: DFAITH_TOKEN.address,
      });
      
      const dinvestContract = getContract({
        client,
        chain: polygon,
        address: DINVEST_TOKEN.address,
      });

      const [dfaithBal, dinvestBal] = await Promise.all([
        balanceOf({ contract: dfaithContract, address: account.address }),
        balanceOf({ contract: dinvestContract, address: account.address }),
      ]);

      setDfaithBalance({
        displayValue: (Number(dfaithBal) / Math.pow(10, DFAITH_TOKEN.decimals)).toFixed(2)
      });
      
      setDinvestBalance({
        displayValue: (Number(dinvestBal) / Math.pow(10, DINVEST_TOKEN.decimals)).toFixed(2)
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [account?.address]);

  // Estimate Output for swap
  useEffect(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setEstimatedReceiveAmount("0");
      return;
    }
    const inputAmount = parseFloat(swapAmount);
    const rate = 0.002; // Fixed rate for demo
    const estimated = (inputAmount * rate).toFixed(6);
    setEstimatedReceiveAmount(estimated);
  }, [swapAmount]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTokenSwitch = () => {
    const tempToken = selectedSellToken;
    setSelectedSellToken(selectedBuyToken);
    setSelectedBuyToken(tempToken);
    setSwapAmount("");
    setEstimatedReceiveAmount("0");
  };

  // Handle send transaction
  const handleSend = async () => {
    if (!account?.address || !sendAmount || !sendToAddress) return;
    
    setIsSending(true);
    try {
      const contract = getContract({
        client,
        chain: polygon,
        address: selectedSendToken.address,
      });

      const amountWei = BigInt(Math.floor(parseFloat(sendAmount) * Math.pow(10, selectedSendToken.decimals)));
      
      const transaction = prepareContractCall({
        contract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [sendToAddress, amountWei],
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          setSendAmount("");
          setSendToAddress("");
          setShowSend(false);
          fetchBalances();
        },
        onError: (error) => {
          console.error("Send failed:", error);
        }
      });
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (status === "disconnected") {
    return (
      <div className="text-center py-16">
        <FaCoins className="text-6xl text-amber-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4 text-white">Verbinde dein Wallet</h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          Verbinde dein Wallet, um deine Token-Guthaben zu sehen und Transaktionen durchzuführen.
        </p>
        <ConnectButton 
          client={client} 
          wallets={wallets}
          theme="dark"
          connectModal={{
            size: "wide",
            title: "D.FAITH Wallet verbinden",
            showThirdwebBranding: false,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Wallet Info */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Mein Wallet</h2>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 text-sm">
                  {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : ""}
                </span>
                {account?.address && (
                  <button 
                    onClick={() => copyToClipboard(account.address)}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    <FaRegCopy />
                  </button>
                )}
              </div>
            </div>
            <ConnectButton 
              client={client} 
              wallets={wallets}
              theme="dark"
              connectModal={{
                size: "compact", 
                showThirdwebBranding: false,
              }}
            />
          </div>

          {/* Token Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-amber-500 rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-white">D.FAITH</h3>
                  <p className="text-zinc-400 text-sm">Faith Token</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {dfaithBalance?.displayValue || "0.00"}
              </p>
              <p className="text-zinc-400 text-sm">≈ $0.00</p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-white">D.INVEST</h3>
                  <p className="text-zinc-400 text-sm">Invest Token</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {dinvestBalance?.displayValue || "0.00"}
              </p>
              <p className="text-zinc-400 text-sm">≈ $0.00</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button 
              onClick={() => setShowBuy(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 flex items-center justify-center space-x-2"
            >
              <FaArrowDown />
              <span>Kaufen</span>
            </Button>
            
            <Button 
              onClick={() => setShowSell(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 flex items-center justify-center space-x-2"
            >
              <FaArrowUp />
              <span>Verkaufen</span>
            </Button>
            
            <Button 
              onClick={() => setShowSend(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 flex items-center justify-center space-x-2"
            >
              <FaPaperPlane />
              <span>Senden</span>
            </Button>
            
            <Button 
              onClick={() => setShowStake(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 flex items-center justify-center space-x-2"
            >
              <FaLock />
              <span>Staken</span>
            </Button>
            
            <Button 
              onClick={() => setShowHistory(true)}
              className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-3 flex items-center justify-center space-x-2"
            >
              <FaInfoCircle />
              <span>Historie</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verkaufen Modal with Client-Only Wrapper */}
      <Modal open={showSell} onClose={() => setShowSell(false)} title="Token verkaufen">
        <ClientOnlyWrapper>
          <SwapModalContent
            sellAmount={swapAmount}
            selectedSellToken={selectedSellToken}
            selectedBuyToken={selectedBuyToken}
            estimatedReceiveAmount={estimatedReceiveAmount}
            onClose={() => setShowSell(false)}
            onAmountChange={setSwapAmount}
            onTokenSwitch={handleTokenSwitch}
          />
        </ClientOnlyWrapper>
      </Modal>

      {/* Send Modal */}
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Token senden">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Token auswählen
            </label>
            <select
              value={selectedSendToken.symbol}
              onChange={(e) => {
                const token = e.target.value === "D.FAITH" ? DFAITH_TOKEN : DINVEST_TOKEN;
                setSelectedSendToken(token);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="D.FAITH">D.FAITH</option>
              <option value="D.INVEST">D.INVEST</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Empfänger Adresse
            </label>
            <input
              type="text"
              value={sendToAddress}
              onChange={(e) => setSendToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Betrag
            </label>
            <input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!sendAmount || !sendToAddress || isSending || isTransactionPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
          >
            {isSending || isTransactionPending ? "Sende..." : "Senden"}
          </Button>
        </div>
      </Modal>

      {/* Buy Modal - Placeholder */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Token kaufen">
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">
            Kauffunktion wird bald verfügbar sein.
          </p>
          <Button 
            onClick={() => setShowBuy(false)}
            className="bg-zinc-600 hover:bg-zinc-700 text-white"
          >
            Schließen
          </Button>
        </div>
      </Modal>

      {/* Stake Modal - Placeholder */}
      <Modal open={showStake} onClose={() => setShowStake(false)} title="Token staken">
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">
            Staking-Funktion wird bald verfügbar sein.
          </p>
          <Button 
            onClick={() => setShowStake(false)}
            className="bg-zinc-600 hover:bg-zinc-700 text-white"
          >
            Schließen
          </Button>
        </div>
      </Modal>

      {/* History Modal - Placeholder */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Transaktions-Historie">
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">
            Historie wird bald verfügbar sein.
          </p>
          <Button 
            onClick={() => setShowHistory(false)}
            className="bg-zinc-600 hover:bg-zinc-700 text-white"
          >
            Schließen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
