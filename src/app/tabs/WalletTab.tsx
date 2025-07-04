'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ConnectWallet, 
  Wallet, 
  WalletDropdown, 
  WalletDropdownLink, 
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { 
  Address, 
  Avatar, 
  Name, 
  Identity, 
  EthBalance 
} from '@coinbase/onchainkit/identity';
import { Token } from '@coinbase/onchainkit/token';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, BASE_CHAIN_ID } from '../onchainConfig';
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { FaRegCopy, FaCoins, FaArrowDown, FaArrowUp, FaPaperPlane, FaLock, FaHistory, FaTimes, FaSync } from "react-icons/fa";
import ClientOnlyWrapper from '../components/ClientOnlyWrapper';

// Import Subtabs
import BuyTab from "./wallet/BuyTab";
import SellTab from "./wallet/SellTab";
import SendTab from "./wallet/SendTab";
import HistoryTab from "./wallet/HistoryTab";
import StakeTab from "./wallet/StakeTab";

// Einfache ERC20 ABI für Token-Operationen
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Modal-Komponente
function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-8 sm:pt-12"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-zinc-900 rounded-xl w-full sm:min-w-[340px] sm:max-w-4xl sm:w-auto sm:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-zinc-700 transition-all duration-300 m-4"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-lg sm:text-xl text-amber-400 truncate pr-4">{title}</h3>
          <button 
            className="p-2 text-amber-400 hover:text-yellow-300 hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0 touch-manipulation"
            onClick={onClose}
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        <div className={`${title === "Staking" ? "" : "p-4 sm:p-6 pb-8"} overflow-y-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function WalletTab() {
  const { address: account, isConnected } = useAccount();
  
  // Token-Balances
  const [faithBalance, setFaithBalance] = useState<string>("0");
  const [investBalance, setInvestBalance] = useState<string>("0");
  const [stakedBalance, setStakedBalance] = useState<string>("0");
  
  // Preis-States
  const [faithPriceUsd, setFaithPriceUsd] = useState<number>(0);
  const [faithValueUsd, setFaithValueUsd] = useState<string>("0.00");
  
  // UI States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  
  // ETH Balance von Base für Gas
  const { data: ethBalance } = useBalance({
    address: account,
    chainId: base.id,
  });

  // D.FAITH Token Balance auf Base (Sie müssen die echte Contract-Adresse hier einsetzen)
  const { data: faithTokenBalance } = useReadContract({
    address: CONTRACTS.FAITH_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    chainId: base.id,
  });

  // D.INVEST Token Balance auf Base 
  const { data: investTokenBalance } = useReadContract({
    address: CONTRACTS.FAITH_TOKEN as `0x${string}`, // Ändern Sie zu INVEST_TOKEN wenn verfügbar
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    chainId: base.id,
  });

  // Balance-Updates verarbeiten
  useEffect(() => {
    if (faithTokenBalance) {
      // Angenommen 18 Dezimalstellen - anpassen nach Ihrem Token
      const formatted = formatEther(faithTokenBalance as bigint);
      setFaithBalance(parseFloat(formatted).toFixed(2));
    }
  }, [faithTokenBalance]);

  useEffect(() => {
    if (investTokenBalance) {
      // Angenommen 0 Dezimalstellen für D.INVEST - anpassen nach Ihrem Token
      const formatted = investTokenBalance.toString();
      setInvestBalance(formatted);
    }
  }, [investTokenBalance]);

  // Preise abrufen (vereinfacht)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Hier können Sie Ihre Preis-API-Logik einfügen
        // Für Base können Sie DEX-APIs wie Uniswap V3 auf Base nutzen
        console.log('Preise werden abgerufen...');
        // Beispiel: setFaithPriceUsd(fetchedPrice);
      } catch (error) {
        console.error('Fehler beim Abrufen der Preise:', error);
      }
    };

    if (isConnected && account) {
      fetchPrices();
    }
  }, [isConnected, account]);

  // Manual refresh
  const refreshBalances = async () => {
    if (!account || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // OnchainKit und wagmi aktualisieren die Balances automatisch
      console.log('Balances werden aktualisiert...');
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Copy wallet address
  const copyWalletAddress = async () => {
    if (account) {
      try {
        await navigator.clipboard.writeText(account);
        setCopySuccess(true);
        setShowCopyModal(true);
        
        setTimeout(() => {
          setShowCopyModal(false);
          setCopySuccess(false);
        }, 2000);
      } catch (error) {
        console.error("Fehler beim Kopieren:", error);
        setCopySuccess(false);
        setShowCopyModal(true);
        setTimeout(() => setShowCopyModal(false), 2000);
      }
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // D.INVEST Section
  const renderDinvestSection = () => {
    return (
      <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full">
        <div className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.INVEST</div>
        <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2 flex items-center">
          {investBalance}
          {(isLoadingBalances || isRefreshing) && (
            <span className="ml-2 text-xs text-amber-500/60 animate-pulse">↻</span>
          )}
        </div>
        <button 
          onClick={() => setShowStakeModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 hover:from-amber-500/30 hover:to-amber-600/30 transition-all border border-amber-500/20 mt-2"
        >
          <FaLock size={14} />
          <span className="text-sm font-medium">Staken & Verdienen</span>
        </button>
        {parseFloat(stakedBalance) > 0 ? (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-400">
                {stakedBalance} D.INVEST gestaked
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 mt-2">
            Noch nichts gestaked
          </div>
        )}
      </div>
    );
  };

  if (!isConnected || !account) {
    return (
      <div className="flex flex-col items-center min-h-[70vh] justify-center bg-black py-8">
        <Card className="w-full max-w-sm bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-t-3xl"></div>
          
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-xl" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                Dawid Faith Wallet
              </h2>
            </div>
            
            <p className="text-zinc-400 text-center mb-8">
              Verbinde dich mit dem Base-Netzwerk, um auf deine Token zuzugreifen
            </p>
            
            <div className="flex justify-center w-full">
              <ConnectWallet>
                <Wallet>
                  <button className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity">
                    Wallet verbinden
                  </button>
                  <WalletDropdown>
                    <Identity address={account} chain={base}>
                      <Avatar />
                      <Name />
                      <Address />
                      <EthBalance />
                    </Identity>
                    <WalletDropdownLink 
                      icon="wallet" 
                      href="https://wallet.coinbase.com"
                    >
                      Wallet
                    </WalletDropdownLink>
                    <WalletDropdownDisconnect />
                  </WalletDropdown>
                </Wallet>
              </ConnectWallet>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-[70vh] items-center py-8 bg-black">
      <Card className="w-full max-w-xl bg-gradient-to-br from-zinc-900 to-black rounded-3xl shadow-2xl border border-zinc-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 rounded-t-3xl"></div>
        <div className="absolute top-0 right-0 w-1/3 h-20 bg-amber-400/10 blur-3xl rounded-full"></div>
        
        <CardContent className="p-6 md:p-10 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 md:p-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-lg shadow-amber-500/20">
                <FaCoins className="text-black text-lg md:text-xl" />
              </div>
              <span className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Dawid Faith Wallet
              </span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                Base
              </span>
            </div>
            <ConnectWallet>
              <Wallet>
                <div className="bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 rounded-lg p-2">
                  <Identity address={account} chain={base}>
                    <Avatar className="w-6 h-6" />
                  </Identity>
                </div>
                <WalletDropdown>
                  <Identity address={account} chain={base}>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownLink 
                    icon="wallet" 
                    href="https://wallet.coinbase.com"
                  >
                    Wallet öffnen
                  </WalletDropdownLink>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </ConnectWallet>
          </div>

          {/* Wallet Address */}
          <div className="flex justify-between items-center bg-zinc-800/70 backdrop-blur-sm rounded-xl p-3 mb-6 border border-zinc-700/80">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 mb-0.5">Wallet Adresse (Base)</span>
              <button
                onClick={copyWalletAddress}
                className="font-mono text-amber-400 text-sm hover:text-amber-300 transition-colors text-left group flex items-center gap-2"
                title="Adresse kopieren"
              >
                <span>{formatAddress(account)}</span>
                <FaRegCopy className="text-xs opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshBalances}
                disabled={isRefreshing || isLoadingBalances}
                className={`p-2 rounded-lg ${isRefreshing || isLoadingBalances ? 'bg-amber-600/20' : 'bg-zinc-700 hover:bg-zinc-600'} text-zinc-200 text-sm font-medium transition-all duration-200`}
                title="Aktualisieren"
              >
                <FaSync className={`text-amber-400 ${isRefreshing || isLoadingBalances ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={copyWalletAddress}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-400 text-sm font-medium transition-all duration-200 border border-amber-500/30"
                title="Adresse kopieren"
              >
                <FaRegCopy /> Kopieren
              </button>
            </div>
          </div>

          {/* ETH Balance für Gas */}
          <div className="flex flex-col items-center p-3 bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl border border-blue-700/50 w-full mb-4">
            <span className="uppercase text-xs tracking-widest text-blue-400/80 mb-1">ETH (Gas)</span>
            <div className="text-lg font-bold text-blue-400">
              {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : "0.0000"}
            </div>
          </div>

          {/* D.FAITH Token */}
          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl border border-zinc-700 w-full mb-6">
            <span className="uppercase text-xs tracking-widest text-amber-500/80 mb-2">D.FAITH</span>
            <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">
              {faithBalance}
              {(isLoadingBalances || isRefreshing) && (
                <span className="ml-2 text-xs text-amber-500/60 animate-pulse">↻</span>
              )}
            </div>
            {parseFloat(faithValueUsd) > 0 && (
              <div className="text-xs text-zinc-500 mt-2">
                ≈ ${faithValueUsd} USD
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
              onClick={() => setShowBuyModal(true)}
            >
              <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                <FaArrowDown className="text-black text-xs" />
              </div>
              <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Kaufen</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
              onClick={() => setShowSellModal(true)}
            >
              <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                <FaArrowUp className="text-black text-xs" />
              </div>
              <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Verkauf</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
              onClick={() => setShowSendModal(true)}
            >
              <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                <FaPaperPlane className="text-black text-xs" />
              </div>
              <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Senden</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center gap-1 px-1 py-3 md:py-4 bg-gradient-to-br from-zinc-800/90 to-zinc-900 hover:from-zinc-800 hover:to-zinc-800 shadow-lg shadow-black/20 rounded-xl hover:scale-[1.02] transition-all duration-300 border border-zinc-700/80"
              onClick={() => setShowHistoryModal(true)}
            >
              <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-1 shadow-inner">
                <FaHistory className="text-black text-xs" />
              </div>
              <span className="text-xs bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-medium">Historie</span>
            </Button>
          </div>
          
          {/* D.INVEST Section */}
          {renderDinvestSection()}

          {/* Modals */}
          <Modal open={showBuyModal} onClose={() => setShowBuyModal(false)} title="Kaufen">
            <BuyTab />
          </Modal>

          <Modal open={showSellModal} onClose={() => setShowSellModal(false)} title="Verkaufen">
            <SellTab />
          </Modal>

          <Modal open={showSendModal} onClose={() => setShowSendModal(false)} title="Senden">
            <SendTab />
          </Modal>

          <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Historie">
            <HistoryTab />
          </Modal>

          <Modal open={showStakeModal} onClose={() => setShowStakeModal(false)} title="Staking">
            <div className="min-h-[400px]">
              <StakeTab />
            </div>
          </Modal>

          {/* Copy Success Modal */}
          <Modal open={showCopyModal} onClose={() => setShowCopyModal(false)} title={copySuccess ? "Erfolgreich kopiert!" : "Fehler beim Kopieren"}>
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                copySuccess 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {copySuccess ? (
                  <span className="text-2xl">✓</span>
                ) : (
                  <span className="text-2xl">✗</span>
                )}
              </div>
              <p className={`text-lg font-medium mb-2 ${
                copySuccess ? 'text-green-400' : 'text-red-400'
              }`}>
                {copySuccess ? 'Wallet-Adresse kopiert!' : 'Kopieren fehlgeschlagen'}
              </p>
              <p className="text-zinc-400 text-sm mb-4">
                {copySuccess 
                  ? 'Die Adresse befindet sich jetzt in deiner Zwischenablage.' 
                  : 'Bitte versuche es erneut oder kopiere die Adresse manuell.'
                }
              </p>
              {copySuccess && (
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-1">Kopierte Adresse:</p>
                  <p className="text-amber-400 font-mono text-sm break-all">
                    {account}
                  </p>
                </div>
              )}
            </div>
          </Modal>
        </CardContent>
      </Card>
    </div>
  );
}
