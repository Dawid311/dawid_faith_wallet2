import { ConnectButton } from "thirdweb/react";
import { client } from "../app/client";

export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center py-4 px-8 bg-zinc-900 mb-8 rounded-lg shadow">
      <span className="text-xl font-bold text-zinc-100">Meine App</span>
      <ConnectButton
        client={client}
        chain={{
          id: 137, // Polygon Mainnet chain ID
          rpc: "https://polygon-rpc.com"
        }} // Polygon als Standardnetzwerk
        appMetadata={{
          name: "Example App",
          url: "https://example.com",
        }}
      />
    </nav>
  );
}