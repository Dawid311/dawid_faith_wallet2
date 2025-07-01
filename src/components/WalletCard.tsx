import { ConnectButton, useActiveWallet } from "thirdweb/react";
import { client } from "../app/client";
import { useEffect, useState } from "react";
import { polygon } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";
import { ethers, formatUnits } from "ethers";

const TOKEN_ADDRESS = "0x0A655BA1e1eaC0ED6C4C5152C2248d798FCbBab2";
const TOKEN_DECIMALS = 18;

export default function WalletCard() {
  const wallet = useActiveWallet();
  const [copied, setCopied] = useState(false);

  // Token-Infos
  const [dfaith, setDfaith] = useState<string | null>(null);
  const [matic, setMatic] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    const fetchBalances = async () => {
      try {
        const account = wallet.getAccount();
        const address = account?.address;
        let dfaithBal = "0";
        if (address) {
          // Token-Balance wie gehabt...
          const contract = getContract({
            client,
            chain: polygon,
            address: TOKEN_ADDRESS,
            abi: [
              {
                "constant": true,
                "inputs": [{ "name": "account", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "", "type": "uint256" }],
                "type": "function",
                "stateMutability": "view"
              }
            ],
          });
          const bal = await readContract({
            contract,
            method: "balanceOf",
            params: [address],
          });
          const balValue = Array.isArray(bal) ? bal[0] : bal;
          dfaithBal = formatUnits(balValue as bigint, TOKEN_DECIMALS);

          // Native MATIC-Balance mit ethers holen
          const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
          const maticBal = await provider.getBalance(address);
          setMatic(formatUnits(maticBal, 18));
        }
        setDfaith(dfaithBal);
      } catch {
        setDfaith(null);
        setMatic(null);
      }
    };
    fetchBalances();
  }, [wallet]);

  const handleCopy = () => {
    if (!wallet) return;
    const address = wallet.getAccount()?.address;
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!wallet) {
    // Noch nicht verbunden: Login-Card
    return (
      <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-xl shadow-xl p-8 flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-white mb-2">Wallet Login</h2>
        <ConnectButton
          client={client}
          chain={polygon}
          appMetadata={{
            name: "Faith Wallet",
            url: "https://example.com",
          }}
        />
      </div>
    );
  }

  // Verbunden: Wallet Card
  const address = wallet.getAccount()?.address;
  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-xl shadow-xl p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-white text-sm truncate">{address}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1 bg-purple-700 text-white rounded hover:bg-purple-600 transition"
        >
          {copied ? "Kopiert!" : "Adresse kopieren"}
        </button>
      </div>
      <div className="flex gap-8 justify-center">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">D.Faith</span>
          <span className="text-lg font-bold text-white">{dfaith ?? "..."}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">MATIC</span>
          <span className="text-lg font-bold text-white">{matic ?? "..."}</span>
        </div>
      </div>
      <div className="flex gap-4 justify-center mt-4">
        <button className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-600 transition">Kaufen</button>
        <button className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-600 transition">Verkaufen</button>
        <button className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-600 transition">Senden</button>
      </div>
    </div>
  );
}