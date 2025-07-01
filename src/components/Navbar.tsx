import { ConnectButton } from "thirdweb/react";
import { client } from "../app/client";
import { useState } from "react";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="w-full flex justify-between items-center py-4 px-8 bg-zinc-900 mb-8 rounded-lg shadow">
      <span className="text-xl font-bold text-zinc-100">
        {/* App-Logo als SVG */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#fff" />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontSize="12"
            fill="#000"
            fontFamily="Arial"
          >
            App
          </text>
        </svg>
      </span>
      <ul className="flex items-center gap-8">
        <li>
          <a href="#tokenomics" title="Tokenomics">
            {/* Tokenomics: Diagramm-Icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke="#fff" />
              <path d="M12 2v10l6 6" stroke="#fff" />
            </svg>
          </a>
        </li>
        <li>
          {/* Wallet: Wallet-Icon */}
          <a href="#wallet" title="Wallet">
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="2"
                y="7"
                width="20"
                height="10"
                rx="2"
                stroke="#fff"
              />
              <circle cx="17" cy="12" r="1" fill="#fff" />
            </svg>
          </a>
        </li>
        <li className="relative">
          <button
            title="Social Media"
            className="text-zinc-100 hover:underline"
            onClick={() => setDropdownOpen((v) => !v)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          >
            {/* Social Media: Globus-Icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke="#fff" />
              <path
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
                stroke="#fff"
              />
            </svg>
            <svg
              width="12"
              height="12"
              className="inline ml-1"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="#fff"
                strokeWidth="2"
                className="transition-transform duration-200"
              />
            </svg>
          </button>
          {dropdownOpen && (
            <ul className="absolute left-0 mt-2 bg-zinc-800 rounded shadow z-10 min-w-[150px]">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
                >
                  {/* Instagram-Icon */}
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="5"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2" />
                    <circle cx="17" cy="7" r="1.5" fill="#fff" />
                  </svg>
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
                >
                  {/* TikTok-Icon */}
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 17a4 4 0 104 4v-7a4 4 0 01-4-4V3h3v7a4 4 0 004 4h1"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  </svg>
                  Tiktok
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
                >
                  {/* Facebook-Icon */}
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                    <path
                      d="M14 8h-2a2 2 0 00-2 2v2h-2v3h2v7h3v-7h2.5l.5-3H15v-1a1 1 0 011-1h1V8h-2z"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  </svg>
                  Facebook
                </a>
              </li>
            </ul>
          )}
        </li>
        <li>
          <a href="#merch" title="Merch">
            {/* Merch: T-Shirt-Icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 4l4-2 4 2 4-2 4 2v4l-2 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10L4 8V4z"
                stroke="#fff"
              />
            </svg>
          </a>
        </li>
        <li>
          <a href="#live" title="Live">
            {/* Live: Play-Icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke="#fff" />
              <polygon points="10,8 16,12 10,16" fill="#fff" />
            </svg>
          </a>
        </li>
        <li>
          <a href="#streamer" title="Streamer">
            {/* Streamer: Mikrofon-Icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="9"
                y="2"
                width="6"
                height="12"
                rx="3"
                stroke="#fff"
              />
              <path d="M5 10v2a7 7 0 0014 0v-2" stroke="#fff" />
              <line x1="12" y1="22" x2="12" y2="18" stroke="#fff" />
              <line x1="8" y1="22" x2="16" y2="22" stroke="#fff" />
            </svg>
          </a>
        </li>
      </ul>
    </nav>
  );
}