import { useEffect, useSyncExternalStore } from "react";
import type { RiskLevel } from "./scam-engine";

export type CaseStatus = "new" | "investigating" | "escalated" | "confirmed-scam" | "false-positive" | "closed";
export interface AuditEntry { at: string; actor: string; action: string }
export interface ScamCase {
  id: string;
  createdAt: string;
  source: "message-check" | "transfer-hold" | "kill-switch" | "caller-check";
  summary: string;
  channel: string;
  score: number;
  level: RiskLevel;
  typology: string;
  signals: string[];
  evidence: string;
  evidenceHash: string;
  amountAtRisk: number;
  status: CaseStatus;
  assignee?: string;
  audit: AuditEntry[];
}

const KEY = "ocbc-trust-cases-v1";
const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();

const SEED: ScamCase[] = [
  { id: "TC-1042", createdAt: iso(12), source: "transfer-hold", summary: "S$18,500 transfer to reported account held for review", channel: "app", score: 92, level: "critical", typology: "Government official impersonation", signals: ["Account reported by others", "On a call while transferring", "Told to hide reason"], evidence: "Payee: Global Asset Holdings XYZ 778-993311-2. Customer answered: on call = yes, told to lie = yes.", evidenceHash: "9f2c1a7e44b0d3e8", amountAtRisk: 18500, status: "new", audit: [{ at: iso(12), actor: "System", action: "Transfer held — critical risk (92). Case created." }] },
  { id: "TC-1041", createdAt: iso(48), source: "message-check", summary: "Customer reported fake OCBC SMS with look-alike link", channel: "sms", score: 88, level: "critical", typology: "Bank impersonation / phishing", signals: ["Look-alike link", "Artificial urgency", "Threat of loss"], evidence: "OCBC: Your account has been suspended... ocbc-secure-login.xyz/verify", evidenceHash: "1b77e0c9a3f2d615", amountAtRisk: 0, status: "investigating", assignee: "R. Lim", audit: [{ at: iso(48), actor: "Customer", action: "Reported message via Scam Check." }, { at: iso(40), actor: "R. Lim", action: "Picked up case. Domain submitted for takedown." }] },
  { id: "TC-1039", createdAt: iso(190), source: "kill-switch", summary: "Customer activated Kill Switch after sharing OTP", channel: "call", score: 80, level: "critical", typology: "Bank impersonation / phishing", signals: ["Asked for OTP", "Kill switch activated"], evidence: "Customer self-reported sharing OTP with 'bank officer' over call.", evidenceHash: "c40e88d1f9a2b371", amountAtRisk: 42000, status: "escalated", assignee: "Fraud Ops L2", audit: [{ at: iso(190), actor: "Customer", action: "Kill Switch — all cards & digital access frozen." }, { at: iso(170), actor: "S. Kaur", action: "Escalated to Fraud Ops L2." }] },
  { id: "TC-1035", createdAt: iso(600), source: "message-check", summary: "Investment group invite — guaranteed returns", channel: "social", score: 64, level: "high", typology: "Investment / job scam", signals: ["Too good to be true", "Asks you to move money"], evidence: "Guaranteed returns of 8% daily! Deposit USDT...", evidenceHash: "77ad03be5c19e420", amountAtRisk: 0, status: "confirmed-scam", assignee: "R. Lim", audit: [{ at: iso(600), actor: "Customer", action: "Reported message." }, { at: iso(560), actor: "R. Lim", action: "Confirmed scam. Pattern added to watchlist." }] },
  { id: "TC-1031", createdAt: iso(1400), source: "message-check", summary: "Delivery update flagged medium", channel: "sms", score: 28, level: "medium", typology: "No clear scam pattern", signals: ["Link to a non-official website"], evidence: "Your parcel is arriving today, track at singpost.com", evidenceHash: "0e5f6a21bb8d9c47", amountAtRisk: 0, status: "false-positive", assignee: "S. Kaur", audit: [{ at: iso(1400), actor: "Customer", action: "Reported message." }, { at: iso(1380), actor: "S. Kaur", action: "Marked false positive — legitimate courier. Feedback sent to model tuning." }] },
];

let state: ScamCase[] = SEED;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => { listeners.forEach((l) => l()); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) { state = JSON.parse(raw); listeners.forEach((l) => l()); } } catch { /* ignore */ }
}

export function useCases() {
  const cases = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => SEED);
  useEffect(load, []);
  return cases;
}

export async function hashEvidence(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function createCase(c: Omit<ScamCase, "id" | "createdAt" | "evidenceHash" | "status" | "audit"> & { actor?: string; note: string }) {
  load();
  const n = Math.max(1042, ...state.map((x) => +x.id.split("-")[1] || 0)) + 1;
  const now = new Date().toISOString();
  const { actor, note, ...rest } = c;
  const created: ScamCase = { ...rest, id: `TC-${n}`, createdAt: now, evidenceHash: await hashEvidence(c.evidence + now), status: "new", audit: [{ at: now, actor: actor || "Customer", action: note }] };
  state = [created, ...state];
  emit();
  return created;
}

export function updateCase(id: string, patch: Partial<ScamCase>, actor: string, action: string) {
  state = state.map((c) => c.id === id ? { ...c, ...patch, audit: [...c.audit, { at: new Date().toISOString(), actor, action }] } : c);
  emit();
}

export function resetCases() { state = SEED; emit(); }
