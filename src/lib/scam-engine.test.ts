import { describe, expect, it } from "vitest";
import { analyze, checkUrl, transferRisk } from "./scam-engine";
import { SCENARIOS } from "./scenarios";

describe("scam engine", () => {
  it("flags every synthetic scam as high or critical", () => {
    for (const s of SCENARIOS.filter((x) => x.truth === "scam")) {
      const r = analyze({ text: s.text, channel: s.channel, claimedSender: s.claimedSender, senderId: s.senderId, callCues: s.callCues });
      expect(["high", "critical"]).toContain(r.level);
    }
  });
  it("keeps the friend's message low risk", () => {
    const s = SCENARIOS.find((x) => x.id === "s6")!;
    expect(analyze({ text: s.text, channel: s.channel }).level).toBe("low");
  });
  it("detects look-alike domains and accepts official ones", () => {
    expect(checkUrl("ocbc-secure-login.xyz/verify").verdict).toBe("lookalike");
    expect(checkUrl("https://www.ocbc.com/personal").verdict).toBe("official");
    expect(checkUrl("bit.ly/abc").verdict).toBe("shortener");
  });
  it("reports low confidence for very short text", () => {
    expect(analyze({ text: "hi there", channel: "sms" }).confidence).toBe("low");
  });
  it("holds transfers to reported accounts for human review instead of blocking", () => {
    const r = transferRisk({ amount: 18500, payeeIsNew: true, payeeReported: true, usualMax: 2000, recentFlagged: false, answers: { onCall: true } });
    expect(r.outcome).toBe("review");
  });
  it("lets a normal transfer to a known payee proceed", () => {
    const r = transferRisk({ amount: 50, payeeIsNew: false, payeeReported: false, usualMax: 2000, recentFlagged: false, answers: { onCall: false, toldToLie: false, knowPayee: true } });
    expect(r.outcome).toBe("proceed");
  });
});
