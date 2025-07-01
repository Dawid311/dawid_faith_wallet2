import Link from "next/link";
import {
  FaWallet,
  FaChartBar,
  FaTshirt,
  FaVideo,
  FaBroadcastTower,
  FaInstagram,
  FaTiktok,
  FaFacebook,
} from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Aktiver Tab je nach Route
  const isActive = (route: string) => pathname === route;

  return (
    <nav className="fixed top-0 left-0 w-full bg-zinc-900 border-b border-zinc-800 z-50">
      <ul className="flex justify-center items-center gap-8 py-3">
        <li>
          <Link href="/tokenomics" title="Tokenomics">
            <FaChartBar
              size={22}
              className={`transition-colors ${
                isActive("/tokenomics") ? "text-yellow-400" : "text-zinc-400"
              } hover:text-yellow-400`}
            />
          </Link>
        </li>
        <li>
          <Link href="/wallet" title="Wallet">
            <FaWallet
              size={22}
              className={`transition-colors ${
                isActive("/wallet") ? "text-blue-400" : "text-zinc-400"
              } hover:text-blue-400`}
            />
          </Link>
        </li>
        <li className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center"
            title="Social Media"
          >
            <FiChevronDown
              size={22}
              className={`transition-colors ${
                open ? "text-pink-400" : "text-zinc-400"
              } hover:text-pink-400`}
            />
          </button>
          {open && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-zinc-800 rounded shadow-lg flex flex-col z-50 min-w-[120px]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaInstagram className="text-pink-500" /> Instagram
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaTiktok className="text-black dark:text-white" /> TikTok
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100"
              >
                <FaFacebook className="text-blue-600" /> Facebook
              </a>
            </div>
          )}
        </li>
        <li>
          <Link href="/merch" title="Merch">
            <FaTshirt
              size={22}
              className={`transition-colors ${
                isActive("/merch") ? "text-green-400" : "text-zinc-400"
              } hover:text-green-400`}
            />
          </Link>
        </li>
        <li>
          <Link href="/stream" title="Stream">
            <FaVideo
              size={22}
              className={`transition-colors ${
                isActive("/stream") ? "text-red-400" : "text-zinc-400"
              } hover:text-red-400`}
            />
          </Link>
        </li>
        <li>
          <Link href="/live" title="Live">
            <FaBroadcastTower
              size={22}
              className={`transition-colors ${
                isActive("/live") ? "text-purple-400" : "text-zinc-400"
              } hover:text-purple-400`}
            />
          </Link>
        </li>
      </ul>
    </nav>
  );
}