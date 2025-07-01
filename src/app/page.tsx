"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import Navigation from "./Navigation";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-zinc-950">
      <div className="flex-1 flex flex-col items-center justify-center">
        <ConnectButton
          client={client}
          appMetadata={{
            name: "Faith Wallet",
            url: "https://example.com",
          }}
        />
      </div>
      <Navigation />
    </main>
  );
}
