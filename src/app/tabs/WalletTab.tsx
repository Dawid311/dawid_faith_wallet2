import { ConnectButton } from "thirdweb/react";
import { client } from "../client";

export default function WalletTab() {
  return (
    <div className="flex flex-col items-center">
      <ConnectButton
        client={client}
        appMetadata={{
          name: "Faith Wallet",
          url: "https://example.com",
        }}
        theme="dark"
      />
    </div>
  );
}