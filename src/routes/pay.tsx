import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Hand, Hourglass, PhoneCall, ShieldAlert, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { transferRisk } from "@/lib/scam-engine";
import { MOCK_PAYEES } from "@/lib/scenarios";
import { createCase } from "@/lib/cases-store";
import { LEVEL_STYLE, RiskBadge, RiskDial } from "@/components/RiskMeter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay")({
  head: () => ({
    meta: [
      { title: "Pause & Verify transfer — TrustGuard" },
      { name: "description", content: "A smart cooling-off moment before risky transfers, without blocking legitimate payments." },
      { property: "og:title", content: "Pause & Verify transfer — TrustGuard" },
      { property: "og:description", content: "Friction exactly when rushing could cause harm." },
    ],
  }),
  component: Pay,
});

const USUAL_MAX = 2000;
type Step = "form" | "pause" | "done" | "held" | "cancelled";
type Ans = { onCall?: boolean; toldToLie?: boolean; knowPayee?: boolean; urgentRequest?: boolean };

const QUESTIONS: { key: keyof Ans; q: string; risky: boolean }[] = [
  { key: "onCall", q: "Is anyone on the phone or chat with you right now, guiding this payment?", risky: true },
  { key: "toldToLie", q: "Has anyone told you what to say if the bank asks, or to keep this secret?", risky: true },
  { key: "knowPayee", q: "Have you met this person / used this company before in real life?", risky: false },
  { key: "urgentRequest", q: "Were you told this must be paid immediately or something bad happens?", risky: true },
];

function Pay() {
  const [step, setStep] = useState<Step>("form");
  const [payeeIdx, setPayeeIdx] = useState(1);
  const [amount, setAmount] = useState(18500);
  const [purpose, setPurpose] = useState("Investment");
  const [ans, setAns] = useState<Ans>({});
  const [left, setLeft] = useState(0);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [recentFlagged, setRecent] = useState(false);
  const [trusted, setTrusted] = useState(false);
  const payee = MOCK_PAYEES[payeeIdx] ?? MOCK_PAYEES[0]!;

  useEffect(() => { try { const t = +(localStorage.getItem("tg-recent-flag") || 0); setRecent(Date.now() - t < 86400000); } catch { /* ignore */ } }, []);

  const risk = useMemo(() => transferRisk({ amount, payeeIsNew: !payee.known, payeeReported: payee.reported, usualMax: USUAL_MAX, recentFlagged, answers: ans }), [amount, payee, recentFlagged, ans]);
  const pre = useMemo(() => transferRisk({ amount, payeeIsNew: !payee.known, payeeReported: payee.reported, usualMax: USUAL_MAX, recentFlagged, answers: {} }), [amount, payee, recentFlagged]);
  const allAnswered = QUESTIONS.every((q) => ans[q.key] !== undefined);

  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(t); }, [left]);

  function submit() {
    if (!amount || amount <= 0) { toast.error("Enter an amount."); return; }
    if (pre.level === "low") { setStep("done"); return; }
    setAns({}); setStep("pause");
  }

  function confirmAnswers() {
    if (risk.outcome === "cooldown") setLeft(risk.cooldown);
  }

  async function hold() {
    const c = await createCase({ source: "transfer-hold", summary: `S$${amount.toLocaleString()} to ${payee.name} held for review`, channel: "app", score: risk.score, level: risk.level, typology: payee.reported ? "Payment to reported mule account" : "High-risk transfer", signals: risk.reasons, evidence: `Payee: ${payee.name} ${payee.account}. Purpose: ${purpose}. Answers: ${JSON.stringify(ans)}`, amountAtRisk: amount, actor: "System", note: `Transfer held — ${risk.level} risk (${risk.score}). Customer notified; officer callback via official hotline.` });
    setCaseId(c.id); setStep("held");
  }

  async function cancel() {
    if (risk.level !== "low") await createCase({ source: "transfer-hold", summary: `Customer cancelled S$${amount.toLocaleString()} transfer after pause`, channel: "app", score: risk.score, level: risk.level, typology: "Scam prevented by pause", signals: risk.reasons, evidence: `Payee: ${payee.name} ${payee.account}`, amountAtRisk: amount, actor: "Customer", note: "Cancelled during Pause & Verify — money protected." });
    setStep("cancelled");
  }

  const s = LEVEL_STYLE[risk.level];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Hand className="h-5 w-5" /></span>
        <div><h1 className="font-display text-3xl font-bold">Pause & Verify</h1><p className="text-sm text-muted-foreground">A simulated OCBC transfer. Friction only appears when the context looks risky.</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {step === "form" && (
            <div className="space-y-4">
              <div className="text-sm font-medium">Pay to</div>
              <div className="grid gap-2">
                {MOCK_PAYEES.map((p, i) => (
                  <button key={p.account} onClick={() => setPayeeIdx(i)} className={cn("flex items-center justify-between rounded-xl border p-3 text-left transition", payeeIdx === i ? "border-primary bg-accent" : "border-border hover:bg-muted")}>
                    <div><div className="font-medium">{p.name}</div><div className="font-mono text-xs text-muted-foreground">{p.account}</div></div>
                    <span className="text-xs text-muted-foreground">{p.known ? "Saved payee" : "New payee"}</span>
                  </button>
                ))}
              </div>
              <label className="block text-sm">Amount (S$)<input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3 font-display text-2xl" /></label>
              <div className="flex gap-2">{[50, 800, 5000, 18500].map((a) => <button key={a} onClick={() => setAmount(a)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">S${a.toLocaleString()}</button>)}</div>
              <label className="block text-sm">Purpose<select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">{["Family / friends", "Bills", "Investment", "Purchase", "Loan / release fee", "Other"].map((p) => <option key={p}>{p}</option>)}</select></label>
              <button onClick={submit} className="w-full rounded-xl bg-primary py-3.5 font-display text-lg font-semibold text-primary-foreground hover:opacity-90">Transfer now</button>
            </div>
          )}

          {step === "pause" && (
            <div>
              <div className={cn("rounded-xl p-4", s.soft)}>
                <div className="flex items-center gap-2 font-display text-xl font-bold"><ShieldAlert className={cn("h-6 w-6", s.text)} /> Let's take 30 seconds before this goes out</div>
                <p className="mt-1 text-sm">Scammers count on speed. Your honest answers stay private and only help us protect you.</p>
              </div>
              <div className="mt-5 space-y-3">
                {QUESTIONS.map((q) => (
                  <div key={q.key} className="rounded-xl border border-border p-4">
                    <div className="text-sm font-medium">{q.q}</div>
                    <div className="mt-2 flex gap-2">
                      {[true, false].map((v) => (
                        <button key={String(v)} onClick={() => setAns((a) => ({ ...a, [q.key]: v }))} className={cn("rounded-lg border px-4 py-1.5 text-sm", ans[q.key] === v ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted")}>{v ? "Yes" : "No"}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {allAnswered && (
                <div className="mt-5 rounded-xl bg-ink p-5 text-ink-foreground">
                  {risk.outcome === "review" ? (
                    <>
                      <div className="font-display text-lg font-semibold">This looks like a scam pattern we see every day.</div>
                      <p className="mt-1 text-sm text-ink-foreground/75">We won't block you without a human looking. We'll hold the transfer and an OCBC officer will call you back through the official app — never from an unknown number.</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button onClick={cancel} className="rounded-lg bg-primary py-2.5 font-medium text-primary-foreground">Cancel transfer</button>
                        <button onClick={hold} className="rounded-lg bg-ink-foreground/10 py-2.5 hover:bg-ink-foreground/20">Hold & request officer review</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-display text-lg font-semibold">{risk.level === "low" ? "Thanks — this looks fine." : "A few things don't add up."}</div>
                      <p className="mt-1 text-sm text-ink-foreground/75">{risk.level === "low" ? "You can continue." : "Use this cooling-off time to call someone you trust, or verify the payee independently."}</p>
                      {left > 0 && <div className="mt-3 flex items-center gap-2 font-mono text-sm"><Hourglass className="h-4 w-4 animate-pulse" /> Cooling-off: {left}s</div>}
                      {left > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded bg-ink-foreground/10"><div className="h-full bg-primary transition-all" style={{ width: `${(left / risk.cooldown) * 100}%` }} /></div>}
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button onClick={cancel} className="rounded-lg bg-primary py-2.5 font-medium text-primary-foreground">Cancel</button>
                        <button onClick={() => { setTrusted(true); toast.success("Your trusted contact (Wei Ling) has been asked to call you."); }} className="flex items-center justify-center gap-1 rounded-lg bg-ink-foreground/10 py-2.5 text-sm hover:bg-ink-foreground/20"><UserCheck className="h-4 w-4" />{trusted ? "Contact notified" : "Ask trusted contact"}</button>
                        {risk.outcome === "cooldown" && left === 0 && !trusted && risk.cooldown > 0 ? (
                          <button onClick={confirmAnswers} className="rounded-lg bg-ink-foreground/10 py-2.5 text-sm hover:bg-ink-foreground/20">Start cooling-off</button>
                        ) : (
                          <button disabled={left > 0} onClick={() => setStep("done")} className="rounded-lg bg-ink-foreground/10 py-2.5 text-sm hover:bg-ink-foreground/20 disabled:opacity-40">I'm sure, send</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "done" && <Outcome icon={<CheckCircle2 className="h-12 w-12 text-safe" />} title={`S$${amount.toLocaleString()} sent to ${payee.name}`} body="Simulated transfer complete. If you later suspect a scam, use the Kill Switch or call 6363 3333 immediately." onReset={() => setStep("form")} />}
          {step === "cancelled" && <Outcome icon={<XCircle className="h-12 w-12 text-primary" />} title={`You kept S$${amount.toLocaleString()} safe`} body="Transfer cancelled. If someone pressured you, report the message in Scam Check so we can warn others." onReset={() => setStep("form")} />}
          {step === "held" && <Outcome icon={<PhoneCall className="h-12 w-12 text-warn" />} title="Transfer on hold — officer review" body={`Case ${caseId} created with sealed evidence. An OCBC officer will contact you via an in-app verified call within 30 minutes. Your money hasn't left your account.`} onReset={() => setStep("form")} link />}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Live risk context</div><RiskBadge level={risk.level} /></div>
            <div className="mt-3 flex justify-center"><RiskDial score={risk.score} level={risk.level} /></div>
            <ul className="mt-3 space-y-2 text-xs">
              {risk.reasons.length ? risk.reasons.map((r) => <li key={r} className="flex gap-2"><span className={s.text}>●</span>{r}</li>) : <li className="text-muted-foreground">No risk signals. No friction added.</li>}
            </ul>
          </div>
          <div className="rounded-2xl bg-muted p-5 text-xs text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">Why friction scales</div>
            Low risk → instant. Medium → 10s pause. High → 30s cooling-off + trusted contact. Critical → held for a human officer, never silently blocked.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Outcome({ icon, title, body, onReset, link }: { icon: React.ReactNode; title: string; body: string; onReset: () => void; link?: boolean }) {
  return (
    <div className="py-10 text-center">
      <div className="flex justify-center">{icon}</div>
      <h2 className="mt-4 font-display text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={onReset} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">New transfer</button>
        {link && <Link to="/triage" className="rounded-lg bg-foreground px-4 py-2 text-sm text-background">See it in Officer Console</Link>}
      </div>
    </div>
  );
}
