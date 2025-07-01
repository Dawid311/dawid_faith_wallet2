import Link from "next/link";
import { FaWallet } from "react-icons/fa";

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 z-50">
      <ul className="flex justify-center items-center py-3">
        <li>
          <Link href="/wallet" className="flex flex-col items-center text-zinc-100 hover:text-blue-400">
            <FaWallet size={22} />
            <span className="text-xs mt-1">Wallet</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}