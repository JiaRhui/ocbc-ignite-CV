import type { RiskLevel } from "@/lib/scam-engine";
import { cn } from "@/lib/utils";

export const LEVEL_STYLE: Record<RiskLevel, { text: string; bg: string; soft: string; label: string }> = {
  low: { text: "text-safe", bg: "bg-safe", soft: "bg-safe-soft", label: "Low risk" },
  medium: { text: "text-warn", bg: "bg-warn", soft: "bg-warn-soft", label: "Caution" },
  high: { text: "text-danger", bg: "bg-danger", soft: "bg-danger-soft", label: "High risk" },
  critical: { text: "text-critical", bg: "bg-critical", soft: "bg-danger-soft", label: "Likely scam" },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const s = LEVEL_STYLE[level];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.soft, s.text, className)}><span className={cn("h-1.5 w-1.5 rounded-full", s.bg)} />{s.label}</span>;
}

export function RiskDial({ score, level }: { score: number; level: RiskLevel }) {
  const s = LEVEL_STYLE[level];
  const r = 52, c = 2 * Math.PI * r, dash = (score / 100) * c * 0.75;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[225deg]">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" strokeDasharray={`${c * 0.75} ${c}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className={cn("transition-all duration-700", s.text)} stroke="currentColor" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className={cn("font-display text-4xl font-bold", s.text)}>{score}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">risk score</div></div>
      </div>
    </div>
  );
}
