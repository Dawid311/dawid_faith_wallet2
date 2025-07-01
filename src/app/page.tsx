"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import Navigation from "./Navigation";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-zinc-950">
      <Navigation />
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
