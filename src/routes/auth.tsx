import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, KeyRound } from "lucide-react";
import { sovereignAuth } from "@/lib/sovereignDb";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Studio Labs" },
      { name: "description", content: "Zero-Cloud local browser sign in, account creation, and password recovery." },
      { property: "og:title", content: "Sign in — Studio Labs" },
      { property: "og:description", content: "Zero-Cloud local browser sign in and password recovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">("in");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    if (mode === "forgot") {
      const res = await sovereignAuth.requestPasswordRecovery(email);
      setBusy(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setGeneratedCode(res.code ?? null);
      setRecoveryCode(res.code ?? "");
      toast.success("Recovery code generated locally in your browser.");
      setMode("reset");
      return;
    }

    if (mode === "reset") {
      if (password !== confirmPassword) {
        setBusy(false);
        toast.error("Passwords do not match.");
        return;
      }
      const res = await sovereignAuth.resetPasswordWithCode(email, recoveryCode, password);
      setBusy(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated! You are now signed in.");
      navigate({ to: "/profile" });
      return;
    }

    if (mode === "up") {
      const res = await sovereignAuth.signUp(email, password, displayName);
      setBusy(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Sovereign local account created in your browser!");
      navigate({ to: "/profile" });
      return;
    }

    const res = await sovereignAuth.signInWithPassword(email, password);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Signed in!");
    navigate({ to: "/profile" });
  }

  const heading =
    mode === "in"
      ? "Welcome back"
      : mode === "up"
        ? "Create local account"
        : mode === "forgot"
          ? "Recover password"
          : "Reset password";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-sm px-6 py-16">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Zero-Cloud Browser Vault
        </div>
        <h1 className="font-display text-4xl font-bold">{heading}</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Accounts and saved lab items are stored locally in your browser&apos;s IndexedDB — zero external API keys or cloud logins required.
        </p>

        {mode === "reset" && generatedCode && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
              <KeyRound className="h-3.5 w-3.5" /> Local Recovery Code: {generatedCode}
            </div>
            <p className="mt-1 text-muted-foreground">
              This code is verified locally against your browser database.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Commander / Creator"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode === "reset" && (
            <div>
              <Label htmlFor="recoveryCode">6-Digit Recovery Code</Label>
              <Input
                id="recoveryCode"
                type="text"
                required
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="6-digit code"
              />
            </div>
          )}

          {(mode === "in" || mode === "up" || mode === "reset") && (
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pw">{mode === "reset" ? "New Password" : "Password"}</Label>
                {mode === "in" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="pw"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {mode === "reset" && (
            <div>
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <Input
                id="pw-confirm"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <Button className="w-full" disabled={busy}>
            {mode === "in"
              ? "Sign in"
              : mode === "up"
                ? "Create account"
                : mode === "forgot"
                  ? "Generate recovery code"
                  : "Update password"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
          {(mode === "in" || mode === "up") && (
            <button
              type="button"
              className="text-left underline hover:text-foreground"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "New here? Create a local account" : "Have an account? Sign in"}
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              className="text-left underline hover:text-foreground"
              onClick={() => setMode("in")}
            >
              Back to Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
