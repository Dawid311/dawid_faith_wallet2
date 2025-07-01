import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

const client = createThirdwebClient({
  clientId: "....", // <-- Trage hier deine Client-ID ein
});

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "email",
        "x",
        "passkey",
        "phone",
        "facebook",
        "apple",
        "coinbase",
        "twitch",
        "steam",
        "github",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

export default function WalletTab() {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-zinc-900 rounded-xl shadow-lg p-8 flex flex-col items-center w-full max-w-xs border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 text-center">
          Dawid Faith Wallet Login
        </h2>
        <ConnectButton
          client={client}
          connectButton={{ label: "Login" }}
          connectModal={{ size: "compact" }}
          wallets={wallets}
        />
      </div>
    </div>
  );
}