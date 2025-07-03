import { useEffect, useState } from "react";
import { createThirdwebClient, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletConnectionStatus, useSendTransaction } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { balanceOf, approve, allowance } from "thirdweb/extensions/erc20";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy, FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaHistory, FaTimes } from "react-icons/fa";

// Import Subtabs
import BuyTab from "./wallet/BuyTab";
import SellTab from "./wallet/SellTab";
import SendTab from "./wallet/SendTab";
import HistoryTab from "./wallet/HistoryTab";
import StakeTab from "./wallet/StakeTab";

// Mobile-optimierte Modal Komponente mit Touch-Support
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  
  // Touch-Events für mobile Swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.currentTarget as any).startY = touch.clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const startY = (e.currentTarget as any).startY;
    const deltaY = currentY - startY;
    
    // Nur nach unten swipen erlauben (positive deltaY)
    if (deltaY > 0) {
      const modal = e.currentTarget as HTMLElement;
      modal.style.transform = `translateY(${Math.min(deltaY, 200)}px)`;
      modal.style.opacity = `${Math.max(1 - deltaY / 300, 0.3)}`;
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const modal = e.currentTarget as HTMLElement;
    const transform = modal.style.transform;
    const translateY = transform ? parseInt(transform.match(/translateY\((\d+)px\)/)?.[1] || '0') : 0;
    
    if (translateY > 100) {
      onClose();
    } else {
      // Animation zurück zur ursprünglichen Position
      modal.style.transform = 'translateY(0)';
      modal.style.opacity = '1';
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full sm:min-w-[340px] sm:max-w-2xl sm:w-auto sm:mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl relative border-t border-zinc-700 sm:border border-zinc-700 transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Swipe Indicator - oben */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-zinc-600 rounded-full"></div>
        </div>
        
        {/* Header - Mobile optimiert */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-lg sm:text-xl text-amber-400 truncate pr-4">{title}</h3>
          <button 
            className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0 touch-manipulation"
            onClick={onClose}
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        {/* Content - Mobile optimiert */}
        <div className="p-4 sm:p-6 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID!,
});

const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "google", "facebook"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
];

export default function WalletTab() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const { mutate: sendTransaction, data: transactionResult, isPending: isTransactionPending } = useSendTransaction();

  const [dfaithBalance, setDfaithBalance] = useState<{ displayValue: string } | null>(null);
  const [dinvestBalance, setDinvestBalance] = useState<{ displayValue: string } | null>(null);
  const [dfaithEurValue, setDfaithEurValue] = useState<string>("0.00");
  const [dfaithPriceEur, setDfaithPriceEur] = useState<number>(0.001);
  // Tracking für die aktuellste Anfrage als State hinzufügen
  const [latestRequest, setLatestRequest] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  
  // Konstanten für Token mit echten Contract-Adressen
  const DFAITH_TOKEN = {
    address: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060", // Neue D.FAITH Token-Contract-Adresse
    decimals: 2, // Neue Dezimalstellen
    symbol: "D.FAITH"
  };

  const DINVEST_TOKEN = {
    address: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383", // Neue D.INVEST Token-Contract-Adresse
    decimals: 0, // Neue Dezimalstellen (0 statt 18)
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

  // EIN useEffect für alles:
  useEffect(() => {
    let isMounted = true;
    
    const loadBalances = async () => {
      if (!account?.address || isLoading) return;
      
      setIsLoading(true);
      console.log("Lade Balances neu...");
      
      try {
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

        console.log(`Neue Balances - D.FAITH: ${dfaithFormatted.toFixed(2)}, D.INVEST: ${Math.floor(dinvestFormatted)}`);

        if (isMounted) {
          setDfaithBalance({ displayValue: dfaithFormatted.toFixed(2) });
          setDinvestBalance({ displayValue: Math.floor(dinvestFormatted).toString() });
          
          // EUR-Wert berechnen
          const totalEur = dfaithFormatted * dfaithPriceEur;
          setDfaithEurValue(totalEur.toFixed(2));
          
          // Auch den Preis aktualisieren
          fetchDfaithPrice();
        }
      } catch (error) {
        console.error("Fehler beim Abrufen der Balances:", error);
        if (isMounted) {
          setDfaithBalance({ displayValue: "0.00" });
          setDinvestBalance({ displayValue: "0" });
          setDfaithEurValue("0.00");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial laden
    if (account?.address) {
      loadBalances();
    }

    // Intervall für regelmäßige Updates
    const interval = setInterval(() => {
      if (account?.address) {
        loadBalances();
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account?.address, dfaithPriceEur]);

  // D.FAITH EUR-Preis holen (vereinfacht)
  const fetchDfaithPrice = async () => {
    try {
      // Fester Wert für einfacheres Testing
      const dfaithPriceEur = 0.001;
      setDfaithPriceEur(dfaithPriceEur);
      
            // EUR-Wert aktualisieren falls Balance vorhanden
            // TODO: Add logic here if you want to update EUR value when balance is present
          } catch (error) {
            console.error("Fehler beim Abrufen des D.FAITH-Preises:", error);
          }
        };
      
        // Hier kannst du das UI für WalletTab rendern
        return (
          <div>
            {/* Dein WalletTab UI kommt hier hin */}
            {/* Beispiel: */}
            <h1 className="text-2xl font-bold mb-4">Wallet Übersicht</h1>
            <div className="flex flex-col gap-4">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span>D.FAITH Balance:</span>
                    <span>{dfaithBalance?.displayValue ?? "0.00"} D.FAITH</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>D.INVEST Balance:</span>
                    <span>{dinvestBalance?.displayValue ?? "0"} D.INVEST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>D.FAITH Wert (EUR):</span>
                    <span>€ {dfaithEurValue}</span>
                  </div>
                </CardContent>
              </Card>
              {/* Weitere UI-Komponenten und Modals */}
            </div>
          </div>
        );
      }