import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { FaArrowDown, FaExchangeAlt } from "react-icons/fa";

export default function SellTab() {
  const [sellAmount, setSellAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("DFAITH");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
          Token verkaufen
        </h2>
        <p className="text-zinc-400">Tauschen Sie Ihre Token gegen POL</p>
      </div>

      {/* Token Auswahl */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">Token auswählen:</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            className={`flex items-center gap-3 p-4 rounded-xl border transition ${
              selectedToken === "DFAITH" 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700/90"
            }`}
            onClick={() => setSelectedToken("DFAITH")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
              <span className="text-sm font-bold text-black">DF</span>
            </div>
            <div className="text-left">
              <div className="font-medium">D.FAITH</div>
              <div className="text-xs opacity-75">Verfügbar: 0.0000</div>
            </div>
          </button>
          
          <button 
            className={`flex items-center gap-3 p-4 rounded-xl border transition ${
              selectedToken === "DINVEST" 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700/90"
            }`}
            onClick={() => setSelectedToken("DINVEST")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
              <span className="text-sm font-bold text-black">DI</span>
            </div>
            <div className="text-left">
              <div className="font-medium">D.INVEST</div>
              <div className="text-xs opacity-75">Verfügbar: 0.0000</div>
            </div>
          </button>
        </div>
      </div>

      {/* Verkaufs-Interface */}
      <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded-xl p-6 border border-zinc-700">
        <div className="space-y-4">
          {/* Von Token */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Du verkaufst</label>
            <div className="relative">
              <input 
                type="number"
                placeholder="0.0"
                className="w-full bg-zinc-900/80 border border-zinc-600 rounded-xl py-4 px-4 text-lg font-bold text-amber-400 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition"
                onClick={() => setSellAmount("0")}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Tausch Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 border-4 border-zinc-900 flex items-center justify-center shadow-lg">
              <FaArrowDown className="text-white" />
            </div>
          </div>

          {/* Zu Token (POL) */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Du erhältst (geschätzt)</label>
            <div className="bg-zinc-900/80 border border-zinc-600 rounded-xl py-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">P</span>
                  </div>
                  <span className="font-medium text-purple-400">POL</span>
                </div>
                <span className="text-lg font-bold text-purple-400">0.0000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Handelsdetails */}
        <div className="bg-zinc-800/50 rounded-xl p-4 mt-6 border border-zinc-700">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Wechselkurs:</span>
              <span className="text-zinc-300">1 {selectedToken} = 0.002 POL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Slippage:</span>
              <span className="text-zinc-300">1%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Netzwerkgebühren:</span>
              <span className="text-zinc-300">~0.001 POL</span>
            </div>
          </div>
        </div>

        <Button 
          className="w-full mt-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          disabled={!sellAmount || parseFloat(sellAmount) <= 0}
        >
          {!sellAmount || parseFloat(sellAmount) <= 0 ? "Betrag eingeben" : `${selectedToken} verkaufen`}
        </Button>
      </div>
    </div>
  );
}
