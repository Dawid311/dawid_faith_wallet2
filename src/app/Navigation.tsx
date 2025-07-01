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

type NavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const [open, setOpen] = useState(false);
  const [activeSocial, setActiveSocial] = useState<"instagram" | "tiktok" | "facebook" | null>(null);

  // Social Media Icon je nach Auswahl
  const getSocialIcon = () => {
    if (activeSocial === "instagram")
      return <FaInstagram size={22} className="text-pink-500" />;
    if (activeSocial === "tiktok")
      return <FaTiktok size={22} className="text-black dark:text-white" />;
    if (activeSocial === "facebook")
      return <FaFacebook size={22} className="text-blue-600" />;
    // Default: Chevron
    return (
      <FiChevronDown
        size={22}
        className={`transition-colors ${
          activeTab === "social" || open ? "text-pink-400" : "text-zinc-400"
        } hover:text-pink-400`}
      />
    );
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-zinc-900 border-b border-zinc-800 z-50">
      <ul className="flex justify-center items-center gap-8 py-3">
        {/* Tokenomics */}
        <li>
          <button
            title="Tokenomics"
            onClick={() => setActiveTab("tokenomics")}
            className="flex items-center"
          >
            <FaChartBar
              size={22}
              className={`transition-colors ${
                activeTab === "tokenomics" ? "text-yellow-400" : "text-zinc-400"
              } hover:text-yellow-400`}
            />
          </button>
        </li>
        {/* Wallet */}
        <li>
          <button
            title="Wallet"
            onClick={() => setActiveTab("wallet")}
            className="flex items-center"
          >
            <FaWallet
              size={22}
              className={`transition-colors ${
                activeTab === "wallet" ? "text-blue-400" : "text-zinc-400"
              } hover:text-blue-400`}
            />
          </button>
        </li>
        {/* Social Media Dropdown */}
        <li className="relative">
          <button
            onClick={() => {
              setOpen((v) => !v);
              setActiveTab("social");
            }}
            className="flex items-center"
            title="Social Media"
          >
            {getSocialIcon()}
          </button>
          {open && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-zinc-800 rounded shadow-lg flex flex-col z-50 min-w-[120px]">
              <button
                onClick={() => {
                  setActiveSocial("instagram");
                  setOpen(false);
                  setActiveTab("social");
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100 w-full"
              >
                <FaInstagram className="text-pink-500" /> Instagram
              </button>
              <button
                onClick={() => {
                  setActiveSocial("tiktok");
                  setOpen(false);
                  setActiveTab("social");
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100 w-full"
              >
                <FaTiktok className="text-black dark:text-white" /> TikTok
              </button>
              <button
                onClick={() => {
                  setActiveSocial("facebook");
                  setOpen(false);
                  setActiveTab("social");
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 text-zinc-100 w-full"
              >
                <FaFacebook className="text-blue-600" /> Facebook
              </button>
            </div>
          )}
        </li>
        {/* Merch */}
        <li>
          <button
            title="Merch"
            onClick={() => setActiveTab("merch")}
            className="flex items-center"
          >
            <FaTshirt
              size={22}
              className={`transition-colors ${
                activeTab === "merch" ? "text-green-400" : "text-zinc-400"
              } hover:text-green-400`}
            />
          </button>
        </li>
        {/* Stream */}
        <li>
          <button
            title="Stream"
            onClick={() => setActiveTab("stream")}
            className="flex items-center"
          >
            <FaVideo
              size={22}
              className={`transition-colors ${
                activeTab === "stream" ? "text-red-400" : "text-zinc-400"
              } hover:text-red-400`}
            />
          </button>
        </li>
        {/* Live */}
        <li>
          <button
            title="Live"
            onClick={() => setActiveTab("live")}
            className="flex items-center"
          >
            <FaBroadcastTower
              size={22}
              className={`transition-colors ${
                activeTab === "live" ? "text-purple-400" : "text-zinc-400"
              } hover:text-purple-400`}
            />
          </button>
        </li>
      </ul>
    </nav>
  );
}