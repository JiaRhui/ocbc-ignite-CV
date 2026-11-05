import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Flag, Link2, Loader2, PhoneCall, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { analyze, CALL_CUES, type AnalysisResult, type Channel } from "@/lib/scam-engine";
import { SCENARIOS } from "@/lib/scenarios";
import { createCase } from "@/lib/cases-store";
import { LEVEL_STYLE, RiskBadge, RiskDial } from "@/components/RiskMeter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scam Check — TrustGuard by OCBC" },
      { name: "description", content: "Paste a suspicious message or describe a call. TrustGuard explains the warning signs and the safe next step." },
      { property: "og:title", content: "Scam Check — TrustGuard by OCBC" },
      { property: "og:description", content: "Check suspicious messages and AI-voice calls before you lose money." },
    ],
  }),
  component: Index,
});

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "sms", label: "SMS" }, { id: "whatsapp", label: "WhatsApp" }, { id: "email", label: "Email" },
  { id: "call", label: "Phone call" }, { id: "video", label: "Video call" }, { id: "social", label: "Social media" },
];

function Highlighted({ text, result }: { text: string; result: AnalysisResult }) {
  const terms = result.signals.flatMap((s) => s.matches).filter((m) => m.length > 1);
  if (!terms.length) return <p className="whitespace-pre-wrap">{text}</p>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|")})`, "gi");
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {text.split(re).map((part, i) => i % 2 === 1
        ? <mark key={i} className="rounded bg-danger-soft px-0.5 font-medium text-critical underline decoration-danger decoration-2 underline-offset-2">{part}</mark>
        : <span key={i}>{part}</span>)}
    </p>
  );
}

function Index() {
  const [channel, setChannel] = useState<Channel>("sms");
  const [text, setText] = useState("");
  const [claimed, setClaimed] = useState("");
  const [senderId, setSenderId] = useState("");
  const [cues, setCues] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reported, setReported] = useState<string | null>(null);
  const isCall = channel === "call" || channel === "video";

  function load(id: string) {
    const s = SCENARIOS.find((x) => x.id === id)!;
    setChannel(s.channel); setText(s.text); setClaimed(s.claimedSender); setSenderId(s.senderId); setCues(s.callCues || []);
    setResult(null); setReported(null);
  }

  function run() {
    if (!text.trim() && !cues.length) { toast.error("Paste the message or describe the call first."); return; }
    setScanning(true); setReported(null);
    setTimeout(() => {
      const r = analyze({ text, channel, claimedSender: claimed, senderId, callCues: isCall ? cues : [] });
      setResult(r); setScanning(false);
      try { if (r.level === "high" || r.level === "critical") localStorage.setItem("tg-recent-flag", String(Date.now())); } catch { /* ignore */ }
    }, 900);
  }

  async function report() {
    if (!result) return;
    const c = await createCase({ source: "message-check", summary: `${claimed || "Unknown sender"} via ${channel}: ${result.typology}`, channel, score: result.score, level: result.level, typology: result.typology, signals: result.signals.map((s) => s.label), evidence: `[${senderId || "no sender id"}] ${text}`, amountAtRisk: 0, note: "Reported via Scam Check. Evidence sealed with SHA-256." });
    setReported(c.id);
    toast.success(`Reported as case ${c.id}. Thank you for protecting others.`);
  }

  return (
    <div>
      <section className="bg-ink-gradient text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink-foreground/70"><Sparkles className="h-3.5 w-3.5" /> Digital Trust · AI-scam defence</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] md:text-6xl">Pause.<br />Check.<br /><span className="text-primary">Then act.</span></h1>
            <p className="mt-5 max-w-lg text-lg text-ink-foreground/75">AI can fake a bank's SMS, a police officer's voice or your child's face. TrustGuard adds a moment of friction exactly when rushing would cost you.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {([["1", "Scam Check", "Explain warning signs in any message or call", "/"], ["2", "Pause & Verify", "Smart cooling-off before risky transfers", "/pay"], ["3", "Verify a Caller", "Confirm a 'bank officer' inside the app", "/verify"], ["4", "Officer Console", "Triage reports with sealed evidence", "/triage"]] as const).map(([n, t, d, to]) => (
              <Link key={n} to={to} className="group rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 transition hover:border-primary hover:bg-ink-foreground/10">
                <div className="font-mono text-xs text-primary">0{n}</div>
                <div className="mt-1 font-display font-semibold">{t}</div>
                <div className="mt-1 text-xs text-ink-foreground/60">{d}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Check something suspicious</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nothing leaves this device unless you choose to report it.</p>

          <div className="mt-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Try a synthetic example</div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => load(s.id)} className="rounded-full border border-border px-3 py-1 text-xs transition hover:border-primary hover:text-primary">{s.title}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">How did it reach you?</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CHANNELS.map((c) => (
              <button key={c.id} onClick={() => setChannel(c.id)} className={cn("rounded-lg border px-2 py-2 text-sm transition", channel === c.id ? "border-primary bg-accent font-medium text-accent-foreground" : "border-border hover:bg-muted")}>{c.label}</button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">Who they say they are<input value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="e.g. OCBC, Police, Mum" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
            <label className="text-sm">Number / sender ID<input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="e.g. +65 8123 4567" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" /></label>
          </div>

          <label className="mt-4 block text-sm">{isCall ? "What did they say? (describe the call)" : "Paste the message"}
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={isCall ? "They said they were from the bank fraud team and asked me to…" : "Paste the full message, including any links…"} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
          </label>

          {isCall && (
            <div className="mt-4 rounded-xl bg-muted p-4">
              <div className="text-sm font-medium">Did you notice any of these during the {channel === "video" ? "video call" : "call"}?</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CALL_CUES.map((c) => (
                  <label key={c.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={cues.includes(c.id)} onChange={(e) => setCues((p) => e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id))} />{c.label}</label>
                ))}
              </div>
            </div>
          )}

          <button onClick={run} disabled={scanning} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-lg font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70">
            {scanning ? <><Loader2 className="h-5 w-5 animate-spin" /> Analysing signals…</> : <>Check it <ArrowRight className="h-5 w-5" /></>}
          </button>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {scanning && <div className="absolute inset-x-0 top-0 h-1/4 animate-scan bg-gradient-to-b from-transparent via-accent to-transparent" />}
          {!result && !scanning && (
            <div className="grid-paper grid h-full min-h-[420px] place-items-center p-8 text-center">
              <div className="max-w-xs rounded-xl bg-card p-6">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">Your result will appear here</p>
                <p className="mt-1 text-sm text-muted-foreground">We'll show exactly which words and links are red flags — and why.</p>
              </div>
            </div>
          )}
          {result && !scanning && <ResultPanel result={result} text={text} onReport={report} reported={reported} />}
        </div>
      </section>
    </div>
  );
}

function ResultPanel({ result, text, onReport, reported }: { result: AnalysisResult; text: string; onReport: () => void; reported: string | null }) {
  const s = LEVEL_STYLE[result.level];
  const risky = result.level === "high" || result.level === "critical";
  const cats = useMemo(() => new Set(result.signals.map((x) => x.category)), [result]);
  return (
    <div className="p-6">
      <div className={cn("flex items-center gap-5 rounded-xl p-4", s.soft)}>
        <RiskDial score={result.score} level={result.level} />
        <div className="flex-1">
          <RiskBadge level={result.level} />
          <h3 className={cn("mt-2 font-display text-2xl font-bold leading-tight", s.text)}>{result.safeMessage}</h3>
          <p className="mt-1 text-sm"><span className="text-muted-foreground">Pattern:</span> <span className="font-medium">{result.typology}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Confidence: <b className="uppercase">{result.confidence}</b> — {result.confidenceNote}</p>
        </div>
      </div>

      {result.confidence === "low" && (
        <div className="mt-4 flex gap-2 rounded-lg border border-warn bg-warn-soft p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-warn" /> Not enough information to be sure. When in doubt, verify through the OCBC app — never through the contact details in the message.</div>
      )}

      {text && <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm"><div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Red flags highlighted</div><Highlighted text={text} result={result} /></div>}

      {result.signals.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold">Why we think so ({result.signals.length} signals · {cats.size} types)</div>
          <ul className="space-y-2">
            {result.signals.map((sig) => (
              <li key={sig.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{sig.label}</span><span className="font-mono text-xs text-muted-foreground">+{sig.weight}</span></div>
                <p className="mt-0.5 text-sm text-muted-foreground">{sig.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.urls.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Link2 className="h-4 w-4" /> Link inspection</div>
          {result.urls.map((u) => (
            <div key={u.url} className="flex items-start justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
              <div><div className="font-mono">{u.host}</div><div className="text-xs text-muted-foreground">{u.reason}</div></div>
              <span className={cn("rounded px-2 py-0.5 text-xs font-semibold uppercase", u.verdict === "official" ? "bg-safe-soft text-safe" : "bg-danger-soft text-critical")}>{u.verdict}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl bg-ink p-4 text-ink-foreground">
        <div className="text-sm font-semibold">What to do now</div>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-foreground/85">{result.actions.map((a) => <li key={a} className="flex gap-2"><span className="text-primary">→</span>{a}</li>)}</ul>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link to="/verify" className="flex items-center justify-center gap-1.5 rounded-lg bg-ink-foreground/10 py-2 text-sm hover:bg-ink-foreground/20"><PhoneCall className="h-4 w-4" /> Verify officially</Link>
          <Link to="/pay" className="flex items-center justify-center gap-1.5 rounded-lg bg-ink-foreground/10 py-2 text-sm hover:bg-ink-foreground/20"><ShieldAlert className="h-4 w-4" /> Pause a payment</Link>
          <button onClick={onReport} disabled={!!reported} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium", risky ? "bg-primary text-primary-foreground" : "bg-ink-foreground/10")}>
            <Flag className="h-4 w-4" /> {reported ? `Reported · ${reported}` : "Report to OCBC"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Think we got it wrong? Report it anyway — an officer reviews every case and corrections improve the checker.</p>
    </div>
  );
}
