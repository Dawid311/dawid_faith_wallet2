import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaCoins, FaLock } from "react-icons/fa";

export default function BuyTab() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token kaufen
        </h2>
        <p className="text-zinc-400">Wählen Sie den Token, den Sie kaufen möchten</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* DFAITH kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaCoins className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.FAITH Token</h3>
                <p className="text-xs text-zinc-500">Dawid Faith Utility Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit POL kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-amber-400">1 POL = 500 D.FAITH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">0.001 POL</span>
            </div>
          </div>
          
          <Button className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
            D.FAITH kaufen
          </Button>
        </div>

        {/* D.INVEST kaufen */}
        <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full">
                <FaLock className="text-black text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-amber-400">D.INVEST Token</h3>
                <p className="text-xs text-zinc-500">Investment & Staking Token</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">mit EUR kaufen</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Aktueller Preis:</span>
              <span className="text-amber-400">1 EUR = 10 D.INVEST</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Minimum:</span>
              <span className="text-zinc-300">1 EUR</span>
            </div>
          </div>
          
          <Button className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
            D.INVEST kaufen
          </Button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-400 text-xs">ℹ</span>
          </div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Hinweis</div>
            <div className="text-sm text-zinc-400">
              Stellen Sie sicher, dass Sie genügend POL für Transaktionsgebühren in Ihrem Wallet haben.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
