"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import { ConnectButton } from "thirdweb/react";
import { client } from "../app/client";
import MyTokenInfo from "../components/MyTokenInfo";

export default function Home() {
  const [activeTab, setActiveTab] = useState("wallet");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-purple-800">
      <Navbar />
      <div className="flex flex-col items-center mt-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("tokenomics")}
            className={`p-3 rounded-full ${activeTab === "tokenomics" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Tokenomics"
          >
            {/* Diagramm-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#fff" />
              <path d="M12 2v10l6 6" stroke="#fff" />
            </svg>
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`p-3 rounded-full ${activeTab === "wallet" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Wallet"
          >
            {/* Wallet-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="10" rx="2" stroke="#fff" />
              <circle cx="17" cy="12" r="1" fill="#fff" />
            </svg>
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={`p-3 rounded-full ${activeTab === "social" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Social Media"
          >
            {/* Globus-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#fff" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#fff" />
            </svg>
          </button>
          <button
            onClick={() => setActiveTab("merch")}
            className={`p-3 rounded-full ${activeTab === "merch" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Merch"
          >
            {/* T-Shirt-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4l4-2 4 2 4-2 4 2v4l-2 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10L4 8V4z" stroke="#fff"/>
            </svg>
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`p-3 rounded-full ${activeTab === "live" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Live"
          >
            {/* Play-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#fff"/>
              <polygon points="10,8 16,12 10,16" fill="#fff"/>
            </svg>
          </button>
          <button
            onClick={() => setActiveTab("streamer")}
            className={`p-3 rounded-full ${activeTab === "streamer" ? "bg-purple-700" : "bg-zinc-800"} hover:bg-purple-600 transition`}
            title="Streamer"
          >
            {/* Mikrofon-Icon */}
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="#fff"/>
              <path d="M5 10v2a7 7 0 0014 0v-2" stroke="#fff"/>
              <line x1="12" y1="22" x2="12" y2="18" stroke="#fff"/>
              <line x1="8" y1="22" x2="16" y2="22" stroke="#fff"/>
            </svg>
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full max-w-xl">
          {activeTab === "wallet" && (
            <div className="flex flex-col items-center gap-6">
              <ConnectButton
                client={client}
                chain={{
                  id: 137, // Polygon Mainnet chain ID
                  rpc: "https://polygon-rpc.com"
                }}
                appMetadata={{
                  name: "Faith Wallet",
                  url: "https://example.com",
                }}
              />
              <MyTokenInfo />
            </div>
          )}
          {activeTab === "tokenomics" && (
            <div className="text-white text-center p-8 bg-zinc-900/80 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-2">Tokenomics</h2>
              <p>Hier kannst du die Tokenomics deines Projekts darstellen.</p>
            </div>
          )}
          {activeTab === "social" && (
            <div className="flex flex-col items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-400 hover:underline">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="#fff" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2"/>
                  <circle cx="17" cy="7" r="1.5" fill="#fff"/>
                </svg>
                Instagram
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-black hover:underline">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path d="M9 17a4 4 0 104 4v-7a4 4 0 01-4-4V3h3v7a4 4 0 004 4h1" stroke="#fff" strokeWidth="2"/>
                </svg>
                TikTok
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
                  <path d="M14 8h-2a2 2 0 00-2 2v2h-2v3h2v7h3v-7h2.5l.5-3H15v-1a1 1 0 011-1h1V8h-2z" stroke="#fff" strokeWidth="2"/>
                </svg>
                Facebook
              </a>
            </div>
          )}
          {activeTab === "merch" && (
            <div className="text-white text-center p-8 bg-zinc-900/80 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-2">Merch</h2>
              <p>Hier kannst du deinen Merch-Shop integrieren.</p>
            </div>
          )}
          {activeTab === "live" && (
            <div className="text-white text-center p-8 bg-zinc-900/80 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-2">Live</h2>
              <p>Hier kannst du Live-Streams oder Events anzeigen.</p>
            </div>
          )}
          {activeTab === "streamer" && (
            <div className="text-white text-center p-8 bg-zinc-900/80 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-2">Streamer</h2>
              <p>Hier kannst du Streamer-Informationen oder Spotify-Integration anzeigen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
