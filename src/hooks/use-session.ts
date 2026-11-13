import { useEffect, useState } from "react";
import { sovereignAuth, type SovereignUser } from "@/lib/sovereignDb";
import { isCeoUnlocked } from "@/components/CeoCodeGate";

export function useSession() {
  const [user, setUser] = useState<SovereignUser | null>(() => sovereignAuth.getSessionSync());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sovereignAuth.getUser().then((u) => {
      setUser(u);
      setReady(true);
    });
    return sovereignAuth.onAuthStateChange((u) => setUser(u));
  }, []);

  return {
    user,
    ready,
    isAdmin: isCeoUnlocked() || user?.role === "admin",
    isPremium: user?.isPremium ?? true,
  };
}
