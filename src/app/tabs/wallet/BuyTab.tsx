import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { polygon } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";
import { client } from "../../client";

// Beispiel: Funktion zum Öffnen des PayModals (ggf. anpassen, je nach Integration)
async function openDfaithPayModal({ chain, client }: { chain: any; client: any }) {
  // Hier sollte die tatsächliche thirdweb PayModal-Integration stehen
  // z.B. thirdweb PayModal aufrufen oder Widget öffnen
  // throw new Error("PayModal nicht implementiert");
  // Demo: Simuliere Modal-Öffnung
  return new Promise((resolve) => setTimeout(resolve, 500));
}

const BuyTab = () => {
  const account = useActiveAccount();
  const [dfaithModalError, setDfaithModalError] = useState<string | null>(null);

  return (
    <div>
      <Button
        className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
        onClick={async () => {
          setDfaithModalError(null);
          if (!account?.address) {
            alert("Bitte Wallet verbinden!");
            return;
          }
          try {
            await openDfaithPayModal({ chain: polygon, client });
          } catch (err: any) {
            setDfaithModalError(err?.message || "Unbekannter Fehler beim Öffnen des Modals.");
            console.error("D.FAITH PayModal Fehler:", err);
          }
        }}
        disabled={!account?.address}
      >
        D.FAITH kaufen
      </Button>
      {dfaithModalError && (
        <div className="text-red-400 text-xs mt-2 text-center">{dfaithModalError}</div>
      )}
    </div>
  );
};

export default BuyTab;