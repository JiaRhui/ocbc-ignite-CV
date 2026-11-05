import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createCase } from "@/lib/cases-store";
import { toast } from "sonner";

const WHAT = ["I shared an OTP, PIN or password", "I installed an app someone told me to", "I transferred money I now think was a scam", "I just feel something is wrong"];

export function KillSwitchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  async function freeze() {
    const c = await createCase({ source: "kill-switch", summary: "Customer activated Kill Switch", channel: "app", score: 85, level: "critical", typology: "Self-reported compromise", signals: picked.length ? picked : ["No reason given"], evidence: `Self-reported: ${picked.join("; ") || "none"}`, amountAtRisk: 0, note: "Kill Switch — cards, PayNow and digital access frozen." });
    setDone(c.id);
    toast.success("Accounts frozen. A fraud officer has been alerted.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setDone(null); setPicked([]); } }}>
      <DialogContent>
        {done ? (
          <div className="space-y-3">
            <DialogHeader><DialogTitle>Your money is locked down</DialogTitle></DialogHeader>
            <ul className="space-y-1 text-sm">
              <li>✓ All debit & credit cards suspended</li>
              <li>✓ PayNow, FAST and digital banking access frozen</li>
              <li>✓ Case <span className="font-mono">{done}</span> sent to the fraud team</li>
            </ul>
            <p className="text-sm text-muted-foreground">To unfreeze, visit a branch with your NRIC or call the official OCBC hotline 6363 3333 (24h). Also report at police.gov.sg or call the ScamShield helpline 1799.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Emergency Kill Switch</DialogTitle>
              <DialogDescription>Instantly freeze your cards and online banking if you think you've been scammed. You can't undo this in the app — that stops a scammer from undoing it too.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {WHAT.map((w) => (
                <label key={w} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={picked.includes(w)} onCheckedChange={(c) => setPicked((p) => c ? [...p, w] : p.filter((x) => x !== w))} />{w}
                </label>
              ))}
            </div>
            <button onClick={freeze} className="mt-2 w-full rounded-lg bg-critical py-3 font-display font-semibold text-primary-foreground transition hover:opacity-90">Freeze everything now</button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
