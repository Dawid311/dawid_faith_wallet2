// Zentrale Balance-Utilities für alle Wallet-Tabs

export const TOKEN_ADDRESSES = {
  DFAITH: "0xD05903dF2E1465e2bDEbB8979104204D1c48698d",
  DINVEST: "0x90aCC32F7b0B1CACc3958a260c096c10CCfa0383",
  POL: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
  NATIVE_POL: "0x0000000000000000000000000000000000001010" // Native POL
};

export const TOKEN_DECIMALS = {
  DFAITH: 2,
  DINVEST: 0,
  POL: 18
};

// Zentrale API-Funktion für Token Balance Abfrage via Thirdweb Insight API
export const fetchTokenBalanceViaInsightApi = async (
  tokenAddress: string,
  accountAddress: string
): Promise<string> => {
  if (!accountAddress) return "0";
  
  try {
    const params = new URLSearchParams({
      chain_id: "137",
      token_address: tokenAddress,
      owner_address: accountAddress,
      include_native: "true",
      resolve_metadata_links: "true",
      include_spam: "false",
      limit: "50",
      metadata: "false",
    });
    
    const url = `https://insight.thirdweb.com/v1/tokens?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-client-id": process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
      },
    });
    
    if (!res.ok) {
      console.error("Insight API Fehlerstatus:", res.status, res.statusText);
      throw new Error(`API Error: ${res.status}`);
    }
    
    const data = await res.json();
    const balance = data?.data?.[0]?.balance ?? "0";
    return balance;
  } catch (error) {
    console.error("Insight API Fehler:", error);
    return "0";
  }
};

// Formatiere D.FAITH Balance (2 Dezimalstellen)
export const formatDfaithBalance = (rawBalance: string): string => {
  const raw = Number(rawBalance);
  return (raw / Math.pow(10, TOKEN_DECIMALS.DFAITH)).toFixed(TOKEN_DECIMALS.DFAITH);
};

// Formatiere D.INVEST Balance (0 Dezimalstellen)
export const formatDinvestBalance = (rawBalance: string): string => {
  return Math.floor(Number(rawBalance)).toString();
};

// Native POL Balance via RPC
export const fetchNativePolBalance = async (accountAddress: string): Promise<string> => {
  if (!accountAddress) return "0.0000";
  
  try {
    const response = await fetch('https://polygon-rpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [accountAddress, 'latest'],
        id: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`RPC Error: ${response.status}`);
    }
    
    const data = await response.json();
    const balance = BigInt(data.result);
    const polFormatted = Number(balance) / Math.pow(10, TOKEN_DECIMALS.POL);
    return polFormatted.toFixed(4);
  } catch (error) {
    console.error("Fehler beim Laden der POL Balance:", error);
    return "0.0000";
  }
};

// Verbesserte Preise mit Fallback-System
export const fetchPricesWithFallback = async () => {
  // Lade gespeicherte Preise
  const loadStoredPrices = () => {
    try {
      const stored = localStorage.getItem('dawid_faith_prices');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        // Verwende gespeicherte Preise wenn sie weniger als 6 Stunden alt sind
        if (parsed.timestamp && (now - parsed.timestamp) < 6 * 60 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (e) {
      console.log('Fehler beim Laden gespeicherter Preise:', e);
    }
    return null;
  };

  const storedPrices = loadStoredPrices();
  let polEur = storedPrices?.polEur || 0.50; // Fallback-Werte
  let dfaithEur = storedPrices?.dfaithEur || 0.001;

  try {
    // Versuche CoinGecko für POL Preis
    const polResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur');
    if (polResponse.ok) {
      const polData = await polResponse.json();
      const newPolEur = polData['polygon-ecosystem-token']?.eur;
      if (newPolEur) {
        polEur = Math.round(newPolEur * 100) / 100;
      }
    } else if (polResponse.status === 429) {
      console.log('CoinGecko Rate Limit erreicht (429), verwende gespeicherte Preise');
    }
  } catch (e) {
    console.log('CoinGecko Fehler, verwende Fallback:', e);
  }

  try {
    // Versuche OpenOcean für D.FAITH Preis
    const params = new URLSearchParams({
      chain: "polygon",
      inTokenAddress: TOKEN_ADDRESSES.NATIVE_POL,
      outTokenAddress: TOKEN_ADDRESSES.DFAITH,
      amount: "1",
      gasPrice: "50",
    });
    
    const response = await fetch(`https://open-api.openocean.finance/v3/polygon/quote?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data?.data?.outAmount && data.data.outAmount !== "0") {
        const dfaithPerPol = Number(data.data.outAmount) / Math.pow(10, TOKEN_DECIMALS.DFAITH);
        dfaithEur = polEur / dfaithPerPol;
      }
    }
  } catch (e) {
    console.log("OpenOcean Fehler, verwende Fallback:", e);
  }

  // Speichere neue Preise
  try {
    const newPrices = {
      dfaithEur,
      polEur,
      timestamp: Date.now()
    };
    localStorage.setItem('dawid_faith_prices', JSON.stringify(newPrices));
  } catch (e) {
    console.log('Fehler beim Speichern der Preise:', e);
  }

  return { dfaithEur, polEur };
};

// Alle Balances auf einmal laden
export const fetchAllBalances = async (accountAddress: string) => {
  if (!accountAddress) {
    return {
      dfaith: "0.00",
      dinvest: "0",
      pol: "0.0000"
    };
  }

  try {
    const [dfaithRaw, dinvestRaw, polBalance] = await Promise.all([
      fetchTokenBalanceViaInsightApi(TOKEN_ADDRESSES.DFAITH, accountAddress),
      fetchTokenBalanceViaInsightApi(TOKEN_ADDRESSES.DINVEST, accountAddress),
      fetchNativePolBalance(accountAddress)
    ]);

    return {
      dfaith: formatDfaithBalance(dfaithRaw),
      dinvest: formatDinvestBalance(dinvestRaw),
      pol: polBalance
    };
  } catch (error) {
    console.error("Fehler beim Laden aller Balances:", error);
    return {
      dfaith: "0.00",
      dinvest: "0",
      pol: "0.0000"
    };
  }
};
