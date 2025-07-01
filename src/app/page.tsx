"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import Navigation from "./Navigation";

import React, { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("home");

  return (
    <main className="min-h-screen flex flex-col bg-zinc-950">
      {/* Add state for activeTab and pass required props to Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <section className="flex-1 flex flex-col items-center justify-center pt-24 pb-8">
        <ConnectButton
          client={client}
          appMetadata={{
            name: "Faith Wallet",
            url: "https://example.com",
          }}
          theme="dark"
        />
      </section>
    </main>
  );
}
