import { useState } from "react";

interface CoinImageProps {
  tokenAddress?: string;
  symbol?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  className?: string;
}

// Coin Mappings für lokale und bekannte Token
const COIN_MAPPINGS: Record<string, string> = {
  // Custom Tokens (lokale Bilder)
  "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060": "/assets/coins/dfaith.png", // D.FAITH
  "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383": "/assets/coins/dinvest.png", // D.INVEST
  
  // Bekannte Tokens (CDN)
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": "https://cryptologos.cc/logos/polygon-matic-logo.png", // POL/MATIC
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "https://cryptologos.cc/logos/ethereum-eth-logo.png", // WETH
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png", // USDC
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "https://cryptologos.cc/logos/tether-usdt-logo.png", // USDT
  
  // Native Token
  "native": "https://cryptologos.cc/logos/polygon-matic-logo.png", // Native POL
  "0x0000000000000000000000000000000000001010": "https://cryptologos.cc/logos/polygon-matic-logo.png", // Native POL
};

// Symbol-basierte Fallbacks
const SYMBOL_MAPPINGS: Record<string, string> = {
  "DFAITH": "/assets/coins/dfaith.png",
  "D.FAITH": "/assets/coins/dfaith.png",
  "DINVEST": "/assets/coins/dinvest.png",
  "D.INVEST": "/assets/coins/dinvest.png",
  "POL": "https://cryptologos.cc/logos/polygon-matic-logo.png",
  "MATIC": "https://cryptologos.cc/logos/polygon-matic-logo.png",
  "WETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  "ETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  "USDC": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  "USDT": "https://cryptologos.cc/logos/tether-usdt-logo.png",
  "BTC": "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
};

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16"
};

export function CoinImage({ 
  tokenAddress, 
  symbol, 
  size = "md", 
  fallback,
  className = ""
}: CoinImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Bestimme Bild-URL
  const getImageUrl = (): string | null => {
    // 1. Token-Adresse basiert
    if (tokenAddress && COIN_MAPPINGS[tokenAddress.toLowerCase()]) {
      return COIN_MAPPINGS[tokenAddress.toLowerCase()];
    }
    
    // 2. Symbol basiert
    if (symbol && SYMBOL_MAPPINGS[symbol.toUpperCase()]) {
      return SYMBOL_MAPPINGS[symbol.toUpperCase()];
    }
    
    // 3. Fallback
    return fallback || null;
  };

  const imageUrl = getImageUrl();

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Loading State
  if (isLoading && imageUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-zinc-700 rounded-full animate-pulse flex items-center justify-center border border-zinc-600/50`}>
        <div className="w-1/2 h-1/2 bg-zinc-600 rounded-full"></div>
      </div>
    );
  }

  // Error State oder kein Bild verfügbar
  if (hasError || !imageUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border border-zinc-600/50 shadow-inner`}>
        <span className="text-zinc-400 text-xs font-bold">
          {symbol ? symbol.charAt(0).toUpperCase() : '?'}
        </span>
      </div>
    );
  }

  // Erfolgreich geladenes Bild
  return (
    <img
      src={imageUrl}
      alt={symbol || 'Token'}
      className={`${sizeClasses[size]} ${className} rounded-full object-cover border border-zinc-600/50 shadow-lg`}
      onLoad={handleImageLoad}
      onError={handleImageError}
      loading="lazy"
    />
  );
}

// Zusätzliche Export für einfache Verwendung
export const coinImages = {
  dfaith: "/assets/coins/dfaith.png",
  dinvest: "/assets/coins/dinvest.png",
  pol: "https://cryptologos.cc/logos/polygon-matic-logo.png",
  matic: "https://cryptologos.cc/logos/polygon-matic-logo.png",
  usdc: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  usdt: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  weth: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  eth: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  btc: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
};

export default CoinImage;
