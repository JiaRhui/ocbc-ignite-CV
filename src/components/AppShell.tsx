import { Link } from "@tanstack/react-router";
import { ShieldCheck, ScanSearch, Hand, PhoneCall, LayoutDashboard, Power } from "lucide-react";
import { useState, type ReactNode } from "react";
import { KillSwitchDialog } from "./KillSwitchDialog";

const NAV = [
  { to: "/", label: "Scam Check", icon: ScanSearch },
  { to: "/pay", label: "Pause & Verify", icon: Hand },
  { to: "/verify", label: "Verify a Caller", icon: PhoneCall },
  { to: "/triage", label: "Officer Console", icon: LayoutDashboard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [kill, setKill] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
            <span className="font-display text-lg font-bold tracking-tight">TrustGuard</span>
            <span className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground sm:inline">OCBC · prototype</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted !text-foreground font-medium" }}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setKill(true)} className="ml-auto flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-ink-foreground transition hover:bg-critical md:ml-0">
            <Power className="h-4 w-4" /> Kill Switch
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs" activeProps={{ className: "bg-foreground !text-background" }}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-10 text-xs text-muted-foreground">
        Prototype for the OCBC IGNITE Innovation Challenge · Problem Statement 3: Digital Trust. All data is synthetic. No real customer data, biometrics or live accounts are used.
      </footer>
      <KillSwitchDialog open={kill} onOpenChange={setKill} />
    </div>
  );
}
