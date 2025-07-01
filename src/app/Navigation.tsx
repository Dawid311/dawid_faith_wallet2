import Link from "next/link";
import { FaWallet, FaChartBar, FaTshirt, FaVideo, FaBroadcastTower, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import { useState } from "react";

export default function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full bg-zinc-900 border-b border-zinc-800 z-50">
      <div className="flex items-center justify-center py-4">
        <FaWallet size={24} className="text-blue-400 mr-2" />
        <span className="text-zinc-100 text-lg font-semibold">Faith Wallet</span>
      </div>
      <ul className="flex justify-center items-center gap-8 py-3">
        <li>
          <Link href="/tokenomics" className="text-zinc-100 hover:text-blue-400" title="Tokenomics">
            <FaChartBar size={22} />
          </Link>
        </li>
        <li>
          <Link href="/wallet" className="text-zinc-100 hover:text-blue-400" title="Wallet">
            <FaWallet size={22} />
          </Link>
        </li>
        <li className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-zinc-100 hover:text-blue-400 flex items-center"
            title="Social Media"
          >
            <FiChevronDown size={22} />
          </button>
          {open && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-zinc-800 rounded shadow-lg flex flex-col z-50 min-w-[120px]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaInstagram /> Instagram
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaTiktok /> TikTok
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaFacebook /> Facebook
              </a>
            </div>
          )}
        </li>
        <li>
          <Link href="/merch" className="text-zinc-100 hover:text-blue-400" title="Merch">
            <FaTshirt size={22} />
          </Link>
        </li>
        <li>
          <Link href="/stream" className="text-zinc-100 hover:text-blue-400" title="Stream">
            <FaVideo size={22} />
          </Link>
        </li>
        <li>
          <Link href="/live" className="text-zinc-100 hover:text-blue-400" title="Live">
            <FaBroadcastTower size={22} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}