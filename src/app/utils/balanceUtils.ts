// Zentrale Balance-Utilities für alle Wallet-Tabs

export const TOKEN_ADDRESSES = {
  DFAITH: "0xF051E3B0335eB332a7ef0dc308BB4F0c10301060",
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
