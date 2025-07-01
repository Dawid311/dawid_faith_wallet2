import { ConnectButton } from "thirdweb/react";
import { client } from "../app/client";
import { useState } from "react";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="w-full flex justify-between items-center py-4 px-8 bg-zinc-900 mb-8 rounded-lg shadow">
      <span className="text-xl font-bold text-zinc-100">Meine App</span>
      <ul className="flex items-center gap-8">
        <li>
          <a href="#tokenomics" className="text-zinc-100 hover:underline">Tokenomics</a>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-zinc-100">Wallet</span>
          <ConnectButton
            client={client}
            chain={{
              id: 137,
              rpc: "https://polygon-rpc.com"
            }}
            appMetadata={{
              name: "Example App",
              url: "https://example.com",
            }}
          />
        </li>
        <li className="relative">
          <button
            className="text-zinc-100 hover:underline"
            onClick={() => setDropdownOpen((v) => !v)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          >
            Social Media ▼
          </button>
          {dropdownOpen && (
            <ul className="absolute left-0 mt-2 bg-zinc-800 rounded shadow z-10 min-w-[150px]">
              <li>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-zinc-700 text-zinc-100">Instagram</a>
              </li>
              <li>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-zinc-700 text-zinc-100">Tiktok</a>
              </li>
              <li>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-zinc-700 text-zinc-100">Facebook</a>
              </li>
            </ul>
          )}
        </li>
        <li>
          <a href="#merch" className="text-zinc-100 hover:underline">Merch</a>
        </li>
        <li>
          <a href="#live" className="text-zinc-100 hover:underline">Live</a>
        </li>
        <li>
          <a href="#streamer" className="text-zinc-100 hover:underline">Streamer</a>
        </li>
      </ul>
    </nav>
  );
}