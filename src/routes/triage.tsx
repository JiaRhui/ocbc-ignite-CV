import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Fingerprint, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resetCases, updateCase, useCases, type CaseStatus } from "@/lib/cases-store";
import { RiskBadge } from "@/components/RiskMeter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/triage")({
  head: () => ({
    meta: [
      { title: "Officer Console — TrustGuard" },
      { name: "description", content: "Triage reported scam cases with sealed evidence, risk signals and a full audit trail." },
      { property: "og:title", content: "Officer Console — TrustGuard" },
      { property: "og:description", content: "Employee triage for suspected AI-enabled scams." },
    ],
  }),
  component: Triage,
});

const STATUS_LABEL: Record<CaseStatus, string> = { new: "New", investigating: "Investigating", escalated: "Escalated", "confirmed-scam": "Confirmed scam", "false-positive": "False positive", closed: "Closed" };
const OFFICER = "You (Officer)";

function Triage() {
  const cases = useCases();
  const [filter, setFilter] = useState<"open" | "all" | CaseStatus>("open");
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const list = useMemo(() => cases
    .filter((c) => filter === "all" ? true : filter === "open" ? ["new", "investigating", "escalated"].includes(c.status) : c.status === filter)
    .sort((a, b) => (a.status === "new" ? -1 : 0) - (b.status === "new" ? -1 : 0) || b.score - a.score), [cases, filter]);
  const active = cases.find((c) => c.id === (sel ?? list[0]?.id));

  const stats = useMemo(() => {
    const open = cases.filter((c) => ["new", "investigating", "escalated"].includes(c.status)).length;
    const protectedAmt = cases.filter((c) => c.source === "transfer-hold" || c.status === "confirmed-scam").reduce((s, c) => s + c.amountAtRisk, 0);
    const reviewed = cases.filter((c) => c.status === "confirmed-scam" || c.status === "false-positive");
    const fp = reviewed.length ? Math.round((reviewed.filter((c) => c.status === "false-positive").length / reviewed.length) * 100) : 0;
    const byType = Object.entries(cases.reduce<Record<string, number>>((m, c) => ({ ...m, [c.typology]: (m[c.typology] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { open, protectedAmt, fp, byType, total: cases.length };
  }, [cases]);

  function act(status: CaseStatus, action: string) {
    if (!active) return;
    updateCase(active.id, { status, assignee: active.assignee || OFFICER }, OFFICER, action + (note ? ` Note: ${note}` : ""));
    setNote("");
    toast.success(`${active.id}: ${STATUS_LABEL[status]}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-bold">Officer Console</h1><p className="text-sm text-muted-foreground">Cases from Scam Check, Pause & Verify holds, Caller Check and Kill Switch — live.</p></div>
        <button onClick={() => { resetCases(); setSel(null); }} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Reset demo data</button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open cases" value={String(stats.open)} />
        <Stat label="Money protected / held" value={`S$${stats.protectedAmt.toLocaleString()}`} accent />
        <Stat label="False-positive rate" value={`${stats.fp}%`} />
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="text-xs text-muted-foreground">Top patterns</div>
          {stats.byType.map(([t, n]) => <div key={t} className="mt-1 flex items-center gap-2 text-xs"><div className="h-1.5 rounded bg-primary" style={{ width: `${(n / stats.total) * 100}%`, minWidth: 6 }} /><span className="truncate">{t}</span><span className="ml-auto font-mono">{n}</span></div>)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["open", "all", "new", "escalated", "confirmed-scam", "false-positive"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs", filter === f ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted")}>{f === "open" ? "Open" : f === "all" ? "All" : STATUS_LABEL[f]}</button>)}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {list.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No cases here.</div>}
          {list.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={cn("w-full rounded-xl border bg-card p-4 text-left transition", active?.id === c.id ? "border-primary shadow-card" : "border-border hover:border-foreground/30")}>
              <div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{c.id} · {c.source}</span><RiskBadge level={c.level} /></div>
              <div className="mt-1.5 text-sm font-medium">{c.summary}</div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{STATUS_LABEL[c.status]}{c.assignee ? ` · ${c.assignee}` : ""}</span><span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
            </button>
          ))}
        </div>

        {active && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-mono text-xs text-muted-foreground">{active.id} · {active.channel.toUpperCase()} · {new Date(active.createdAt).toLocaleString()}</div><h2 className="mt-1 font-display text-2xl font-bold">{active.summary}</h2><p className="text-sm text-muted-foreground">{active.typology}</p></div>
              <div className="text-right"><div className="font-display text-4xl font-bold text-primary">{active.score}</div><div className="text-xs text-muted-foreground">risk score</div></div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><div className="mb-2 text-sm font-semibold">Signals</div><div className="flex flex-wrap gap-1.5">{active.signals.map((s) => <span key={s} className="rounded-full bg-danger-soft px-2.5 py-1 text-xs text-critical">{s}</span>)}</div>
                {active.amountAtRisk > 0 && <div className="mt-4 rounded-lg bg-warn-soft p-3 text-sm">Amount at risk: <b>S${active.amountAtRisk.toLocaleString()}</b></div>}
              </div>
              <div><div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Fingerprint className="h-4 w-4" /> Sealed evidence</div>
                <div className="rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{active.evidence}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">SHA-256: {active.evidenceHash}… · tamper-evident</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold">Decision</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note for the audit trail (optional)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <button onClick={() => act("investigating", "Picked up case.")} className="rounded-lg border border-border py-2 text-sm hover:bg-muted">Investigate</button>
                <button onClick={() => act("escalated", "Escalated to Fraud Ops L2 / SPF Anti-Scam Centre.")} className="rounded-lg border border-border py-2 text-sm hover:bg-muted">Escalate</button>
                <button onClick={() => act("confirmed-scam", "Confirmed scam. Payee/domain added to watchlist; funds remain held.")} className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">Confirm scam</button>
                <button onClick={() => act("false-positive", active.source === "transfer-hold" ? "False positive — customer verified via callback. Transfer released." : "False positive — feedback sent to tune rules.")} className="flex items-center justify-center gap-1 rounded-lg bg-safe py-2 text-sm font-medium text-primary-foreground"><ShieldCheck className="h-4 w-4" />{active.source === "transfer-hold" ? "Legit · release" : "Not a scam"}</button>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold">Audit trail</div>
              <ol className="relative space-y-3 border-l border-border pl-4">
                {active.audit.map((a, i) => <li key={i} className="text-sm"><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" /><div className="font-mono text-[10px] text-muted-foreground">{new Date(a.at).toLocaleString()} · {a.actor}</div><div>{a.action}</div></li>)}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={cn("rounded-xl border p-4 shadow-card", accent ? "border-transparent bg-ink text-ink-foreground" : "border-border bg-card")}><div className={cn("text-xs", accent ? "text-ink-foreground/60" : "text-muted-foreground")}>{label}</div><div className="mt-1 font-display text-3xl font-bold">{value}</div></div>;
}
