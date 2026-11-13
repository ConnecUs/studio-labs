import { useState, type ReactNode } from "react";
import { Lock, ShieldCheck, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearNotificationLog } from "@/lib/notificationLog";

const DEFAULT_COMMANDER_CODES = ["2990", "2525", "1974", "7470", "1234", "0000", "2500"];
const SESSION_UNLOCK_KEY = "kush_studio_ceo_unlocked";
const SESSION_CODE_KEY = "kush_studio_ceo_code";

export function isCeoUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1";
}

export function getCeoCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SESSION_CODE_KEY) || "";
}

export function lockCeoSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  sessionStorage.removeItem(SESSION_CODE_KEY);
  clearNotificationLog();
}

function validateCommanderCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  const customCode =
    typeof window !== "undefined" ? localStorage.getItem("dynasty_ceo_code")?.trim() : null;
  if (customCode && trimmed === customCode) return true;
  return DEFAULT_COMMANDER_CODES.includes(trimmed);
}

interface CeoCodeGateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function CeoCodeGate({
  children,
  title = "Commander Access Required",
  subtitle = "Enter your 25th Dynasty CEO Access Code to manage Kush Studio Labs tools, cover art, and monetization tiers.",
}: CeoCodeGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => isCeoUnlocked());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (unlocked) {
    return <>{children}</>;
  }

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (validateCommanderCode(code)) {
      sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      sessionStorage.setItem(SESSION_CODE_KEY, code.trim());
      setError("");
      setUnlocked(true);
    } else {
      setError("Invalid Commander Access Code. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-card/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest text-primary">
            <Lock className="h-3 w-3" /> Executive Command Authority
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="ceo-access-code"
              className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              <KeyRound className="h-3.5 w-3.5 text-primary" /> Commander PIN / CEO Code
            </label>
            <Input
              id="ceo-access-code"
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="Enter CEO Code (e.g. ••••)"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError("");
              }}
              className="h-11 text-center font-mono text-lg tracking-[0.35em]"
            />
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full h-11 font-mono uppercase tracking-wider">
            Unlock Studio Admin <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <a href="https://kushnovels.com" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Main Portal
          </a>
          <a href="https://kushnovels.com/ceo/missions" className="hover:text-primary">
            CEO Missions →
          </a>
        </div>
      </div>
    </div>
  );
}
