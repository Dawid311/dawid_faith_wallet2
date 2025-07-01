import { useActiveWallet } from "thirdweb/react";
import { getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
// import { useContractRead } from "thirdweb/react";
// import { useContractRead } from "thirdweb/react";
import { client } from "../app/client";
import { useEffect, useState } from "react";

const TOKEN_ADDRESS = "0x0A655BA1e1eaC0ED6C4C5152C2248d798FCbBab2"; // Ersetze durch deine Token-Adresse

export default function MyTokenInfo() {
  const contract = getContract({
    client,
    chain: polygon,
    address: TOKEN_ADDRESS,
  });

  const wallet = useActiveWallet();

  const accountAddress = wallet?.getAccount()?.address;

  // Token-Infos lesen
  const { data: name } = useContractRead(contract, "name");
  const { data: symbol } = useContractRead(contract, "symbol");
  const { data: balance } = useContractRead(
    contract,
    "balanceOf",
    accountAddress ? [accountAddress] : []
  );

  return (
    <div className="bg-zinc-800 p-4 rounded-lg text-zinc-100 mt-4">
      <div><b>Token Name:</b> {name || "..."}</div>
      <div><b>Symbol:</b> {symbol || "..."}</div>
      <div>
        <b>Dein Guthaben:</b>{" "}
        {accountAddress && balance !== undefined
          ? balance.toString()
          : "Verbinde Wallet"}
      </div>
    </div>
  );
}
// Minimal implementation for ERC20-like contract reads
function useContractRead(contract: any, method: string, args: any[] = []): { data: any } {
    const [data, setData] = useState<any>(undefined);

    useEffect(() => {
        let isMounted = true;
        if (!contract || !method) return;

        (async () => {
            try {
                const result = await contract.read[method](...args);
                if (isMounted) setData(result);
            } catch (e) {
                if (isMounted) setData(undefined);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [contract, method, JSON.stringify(args)]);

    return { data };
}
