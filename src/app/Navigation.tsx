import Link from "next/link";
import { FaHome, FaWallet, FaChartBar, FaUser } from "react-icons/fa";

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 z-50">
      <ul className="flex justify-around items-center py-3">
        <li>
          <Link href="/" className="flex flex-col items-center text-zinc-100 hover:text-blue-400">
            <FaHome size={22} />
            <span className="text-xs mt-1">Home</span>
          </Link>
        </li>
        <li>
          <Link href="/wallet" className="flex flex-col items-center text-zinc-100 hover:text-blue-400">
            <FaWallet size={22} />
            <span className="text-xs mt-1">Wallet</span>
          </Link>
        </li>
        <li>
          <Link href="/stats" className="flex flex-col items-center text-zinc-100 hover:text-blue-400">
            <FaChartBar size={22} />
            <span className="text-xs mt-1">Stats</span>
          </Link>
        </li>
        <li>
          <Link href="/profile" className="flex flex-col items-center text-zinc-100 hover:text-blue-400">
            <FaUser size={22} />
            <span className="text-xs mt-1">Profil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}