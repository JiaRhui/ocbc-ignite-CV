import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Heart, Landmark, Loader2, PhoneOff, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { createCase } from "@/lib/cases-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a Caller — TrustGuard" },
      { name: "description", content: "Confirm whether a 'bank officer', official or family member is really who they claim, through official channels only." },
      { property: "og:title", content: "Verify a Caller — TrustGuard" },
      { property: "og:description", content: "Official verification journey against AI impersonation." },
    ],
  }),
  component: Verify,
});

type Who = "bank" | "family" | "gov";

function Verify() {
  const [who, setWho] = useState<Who>("bank");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Who is contacting you?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Never use the number, link or details the caller gives you. We'll route you to an official channel.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {([["bank", "Someone from OCBC", Building2], ["family", "Family or a friend", Heart], ["gov", "Police / government", Landmark]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setWho(id)} className={cn("flex items-center gap-3 rounded-xl border p-4 text-left transition", who === id ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted")}>
            <Icon className="h-6 w-6 text-primary" /><span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        {who === "bank" && <BankCheck />}
        {who === "family" && <FamilyCheck />}
        {who === "gov" && <GovCheck />}
      </div>
    </div>
  );
}

function BankCheck() {
  const [sim, setSim] = useState<"genuine" | "none">("none");
  const [state, setState] = useState<"idle" | "checking" | "genuine" | "none">("idle");
  const [code, setCode] = useState("");
  const [secs, setSecs] = useState(60);

  useEffect(() => { if (state !== "genuine") return; const t = setInterval(() => setSecs((s) => (s <= 1 ? 60 : s - 1)), 1000); return () => clearInterval(t); }, [state]);
  useEffect(() => { if (state === "genuine" && secs === 60) setCode(String(Math.floor(1000 + Math.random() * 9000))); }, [secs, state]);

  function check() {
    setState("checking");
    setTimeout(() => { setSecs(60); setCode(String(Math.floor(1000 + Math.random() * 9000))); setState(sim); }, 1400);
  }

  async function report() {
    const c = await createCase({ source: "caller-check", summary: "Caller claimed to be OCBC — no active official call found", channel: "call", score: 82, level: "critical", typology: "Bank impersonation / phishing", signals: ["No matching official call record"], evidence: "Caller Check returned no active OCBC officer session.", amountAtRisk: 0, note: "Customer ran Caller Check: no record. Hung up and reported." });
    toast.success(`Reported as ${c.id}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">In-app Caller Check</h2>
        <p className="mt-1 text-sm text-muted-foreground">When a real OCBC officer calls you, their call is registered here, with their name and a rotating code. A voice clone can't fake what's inside your logged-in app.</p>
        <ol className="mt-4 space-y-2 text-sm">
          <li>1. Keep the caller on hold — don't share anything.</li>
          <li>2. Tap <b>Check now</b>.</li>
          <li>3. Ask the caller to read the code on <i>your</i> screen. If they can't, hang up.</li>
        </ol>
        <div className="mt-5 rounded-lg bg-muted p-3 text-xs">
          <div className="mb-1 font-semibold">Demo: simulate the situation</div>
          <div className="flex gap-2">
            {(["none", "genuine"] as const).map((v) => <button key={v} onClick={() => { setSim(v); setState("idle"); }} className={cn("rounded px-2 py-1", sim === v ? "bg-foreground text-background" : "bg-card")}>{v === "none" ? "Scammer calling" : "Real OCBC officer calling"}</button>)}
          </div>
        </div>
        <button onClick={check} className="mt-4 w-full rounded-xl bg-primary py-3 font-display font-semibold text-primary-foreground">Check now</button>
      </div>
      <div className="grid min-h-[280px] place-items-center rounded-xl bg-ink-gradient p-6 text-center text-ink-foreground">
        {state === "idle" && <div><ShieldQuestion className="mx-auto h-12 w-12 text-ink-foreground/60" /><p className="mt-3 text-sm text-ink-foreground/70">Result shows here</p></div>}
        {state === "checking" && <div><Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /><p className="mt-3 text-sm">Checking OCBC's official call register…</p></div>}
        {state === "genuine" && (
          <div>
            <BadgeCheck className="mx-auto h-12 w-12 text-safe" />
            <p className="mt-2 font-display text-lg font-semibold">Verified OCBC call in progress</p>
            <p className="text-sm text-ink-foreground/70">Officer: Rachel Lim · Card Services</p>
            <div className="mt-4 font-mono text-5xl tracking-[0.3em]">{code}</div>
            <p className="mt-2 text-xs text-ink-foreground/60">Code refreshes in {secs}s. Ask the caller to read it to you.</p>
            <p className="mt-3 text-xs text-ink-foreground/60">Even a real officer will never ask for your OTP or PIN.</p>
          </div>
        )}
        {state === "none" && (
          <div>
            <PhoneOff className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-2 font-display text-xl font-bold">No OCBC officer is calling you.</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-foreground/70">Hang up now. If you want to talk to OCBC, call 6363 3333 yourself from the number on your card.</p>
            <button onClick={report} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Report this caller</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FamilyCheck() {
  const [word, setWord] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { try { const w = localStorage.getItem("tg-safeword"); if (w) { setWord(w); setSaved(true); } } catch { /* ignore */ } }, []);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">Beat voice & video clones</h2>
        <p className="mt-1 text-sm text-muted-foreground">AI needs only a few seconds of someone's voice from social media to copy it. Use checks a clone can't pass:</p>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="rounded-lg bg-muted p-3"><b>Hang up & call back</b> on the number already saved in your phone — not the "new number".</li>
          <li className="rounded-lg bg-muted p-3"><b>Ask your family safe word.</b> Agree on it in person; never type it in chats.</li>
          <li className="rounded-lg bg-muted p-3"><b>Ask a private question</b> only they'd know — not something on Facebook.</li>
          <li className="rounded-lg bg-muted p-3"><b>On video?</b> Ask them to turn their head side-to-side or wave a hand across their face — many deepfakes glitch.</li>
        </ul>
      </div>
      <div className="rounded-xl border border-border p-5">
        <div className="font-display font-semibold">Your family safe word</div>
        <p className="mt-1 text-xs text-muted-foreground">Stored only on this device as a reminder. Share it with family face-to-face.</p>
        {saved ? (
          <div className="mt-4 rounded-lg bg-safe-soft p-4 text-sm"><b className="text-safe">Safe word set.</b> Ask for it before sending money to anyone "in trouble".<button onClick={() => { setSaved(false); setWord(""); localStorage.removeItem("tg-safeword"); }} className="mt-2 block text-xs underline">Change</button></div>
        ) : (
          <div className="mt-4 flex gap-2">
            <input value={word} onChange={(e) => setWord(e.target.value)} type="password" placeholder="e.g. a favourite dish" className="flex-1 rounded-lg border border-input bg-background px-3 py-2" />
            <button disabled={word.length < 3} onClick={() => { localStorage.setItem("tg-safeword", word); setSaved(true); toast.success("Safe word saved"); }} className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40">Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

function GovCheck() {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Real officials never…</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {["Ask you to transfer money to a 'safe account'", "Transfer your call to the police or another agency", "Ask for bank login, OTP or Singpass details", "Ask you to install apps or keep the call secret"].map((x) => <div key={x} className="rounded-lg bg-danger-soft p-3 text-sm text-critical">✕ {x}</div>)}
      </div>
      <h3 className="mt-6 font-display font-semibold">Official numbers (call them yourself)</h3>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        {[["ScamShield Helpline", "1799"], ["Police (non-emergency)", "1800 255 0000"], ["OCBC 24h hotline", "6363 3333"]].map(([n, p]) => <div key={n} className="rounded-lg border border-border p-3"><div className="text-muted-foreground">{n}</div><div className="font-mono text-lg">{p}</div></div>)}
      </div>
    </div>
  );
}
