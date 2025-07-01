"use client";

import { useState } from "react";
import Navigation from "./Navigation";
import { ConnectButton } from "thirdweb/react";
import { client } from "./client";

export default function Home() {
  const [activeTab, setActiveTab] = useState("wallet");

  return (
    <main className="min-h-screen flex flex-col bg-zinc-950">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <section className="flex-1 flex flex-col items-center justify-center pt-24 pb-8">
        {activeTab === "wallet" && (
          <ConnectButton
            client={client}
            appMetadata={{
              name: "Faith Wallet",
              url: "https://example.com",
            }}
            theme="dark"
          />
        )}
        {activeTab === "tokenomics" && <div className="text-white">Tokenomics Inhalt</div>}
        {activeTab === "merch" && <div className="text-white">Merch Inhalt</div>}
        {activeTab === "stream" && <div className="text-white">Stream Inhalt</div>}
        {activeTab === "live" && <div className="text-white">Live Inhalt</div>}
        {activeTab === "social" && <div className="text-white">Social Media geöffnet</div>}
      </section>
    </main>
  );
}
