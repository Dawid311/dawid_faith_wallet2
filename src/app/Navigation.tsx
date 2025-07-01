import Link from "next/link";
import { FaWallet } from "react-icons/fa";

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-zinc-900 border-b border-zinc-800 z-50">
      <div className="flex items-center justify-center py-4">
        <FaWallet size={24} className="text-blue-400 mr-2" />
        <span className="text-zinc-100 text-lg font-semibold">Faith Wallet</span>
      </div>
    </nav>
  );
}