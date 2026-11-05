// Explainable, rule-based scam signal engine (synthetic prototype — no real data).
export type Channel = "sms" | "whatsapp" | "email" | "call" | "video" | "social";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Signal {
  id: string;
  label: string;
  category: "urgency" | "credentials" | "payment" | "impersonation" | "link" | "deepfake" | "pressure" | "too-good";
  weight: number;
  explanation: string;
  matches: string[];
}

export interface AnalysisInput {
  text: string;
  channel: Channel;
  claimedSender?: string;
  senderId?: string;
  callCues?: string[]; // ids from CALL_CUES
}

export interface AnalysisResult {
  score: number;
  level: RiskLevel;
  confidence: "low" | "medium" | "high";
  confidenceNote: string;
  typology: string;
  signals: Signal[];
  urls: UrlFinding[];
  actions: string[];
  safeMessage: string;
}

export interface UrlFinding {
  url: string;
  host: string;
  verdict: "official" | "lookalike" | "shortener" | "suspicious" | "unknown";
  reason: string;
}

export const OFFICIAL_DOMAINS = ["ocbc.com", "ocbc.com.sg", "gov.sg", "police.gov.sg", "scamshield.gov.sg"];
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "rb.gy", "cutt.ly", "is.gd", "shorturl.at"];

interface Rule {
  id: string;
  label: string;
  category: Signal["category"];
  weight: number;
  explanation: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  { id: "urgency", label: "Artificial urgency", category: "urgency", weight: 14, pattern: /\b(urgent(ly)?|immediately|within \d+ ?(min|mins|minutes|hours?|hrs?)|right now|today only|act now|final (notice|warning)|expires? (today|soon|in))\b/gi, explanation: "Scammers rush you so you don't stop to check. A real bank gives you time." },
  { id: "threat", label: "Threat of loss or penalty", category: "pressure", weight: 14, pattern: /\b(suspend(ed)?|frozen|freeze|locked|deactivat\w*|terminat\w*|arrest(ed)?|warrant|legal action|penalt(y|ies)|blacklist\w*|money laundering)\b/gi, explanation: "Fear of losing access or getting into trouble is a classic manipulation lever." },
  { id: "otp", label: "Asks for OTP / password / PIN", category: "credentials", weight: 30, pattern: /\b(otp|one[- ]time (password|pin|code)|password|pin|6[- ]digit code|verification code|security code|token code|login details|card (number|details)|cvv)\b/gi, explanation: "OCBC will NEVER ask for your OTP, PIN or password — not by call, SMS, email or chat." },
  { id: "transfer", label: "Asks you to move money", category: "payment", weight: 22, pattern: /\b(transfer|paynow|pay now|send (the )?money|safe account|secure account|deposit|top[- ]?up|gift cards?|crypto|usdt|bitcoin|wallet address|processing fee|release fee|admin fee)\b/gi, explanation: "Requests to move money to a 'safe account' or pay a fee to release funds are hallmark scams." },
  { id: "bank-imp", label: "Claims to be a bank", category: "impersonation", weight: 8, pattern: /\b(ocbc|dbs|uob|bank officer|fraud (team|department)|customer service officer)\b/gi, explanation: "Messages may use real brand names. The name alone proves nothing — verify through the official app." },
  { id: "gov-imp", label: "Claims to be government / police", category: "impersonation", weight: 16, pattern: /\b(police|spf|mom|ica|iras|cpf|mas|interpol|court|customs|ministry|singpass)\b/gi, explanation: "Government officers will never ask you to transfer money or install apps over a call." },
  { id: "secrecy", label: "Asks you to keep it secret", category: "pressure", weight: 18, pattern: /\b(don'?t tell|do not tell|keep (this|it) (secret|confidential|between us)|confidential investigation|don'?t inform|tell no one)\b/gi, explanation: "Isolation is a red flag — scammers don't want family or the bank to interrupt." },
  { id: "app-install", label: "Asks you to install an app / share screen", category: "credentials", weight: 24, pattern: /\b(download|install|apk|anydesk|teamviewer|screen ?share|remote access|sideload|click (the|this) (link|button) to (update|verify))\b/gi, explanation: "Unofficial apps (APKs) and remote-access tools let scammers take over your phone." },
  { id: "family", label: "Loved-one in distress", category: "deepfake", weight: 16, pattern: /\b(mum|mom|dad|ma|pa|grandma|grandpa|it'?s me|new number|lost my phone|in trouble|accident|hospital|bail)\b/gi, explanation: "AI voice clones can sound exactly like family. Call them back on the number you already know." },
  { id: "too-good", label: "Too good to be true", category: "too-good", weight: 14, pattern: /\b(guaranteed (returns?|profit)|\d+% (returns?|profit|daily)|easy money|work from home|earn \$?\d+|won|winner|prize|lucky draw|free gift|refund (of|is) pending|cashback)\b/gi, explanation: "Unrealistic returns, prizes or easy jobs are bait for investment and job scams." },
  { id: "channel-switch", label: "Moves you to another channel", category: "pressure", weight: 10, pattern: /\b(whatsapp me|telegram|add me on|contact (me|us) at \+?\d|call (this|the following) number|reply (yes|y|1))\b/gi, explanation: "Pushing you to a private chat or unknown number avoids official, traceable channels." },
];

export const CALL_CUES = [
  { id: "refuse-callback", label: "Caller refused to let me call back", weight: 18 },
  { id: "voice-odd", label: "Voice sounded robotic, flat or oddly timed", weight: 14 },
  { id: "video-glitch", label: "Face blurred / lips out of sync on video", weight: 16 },
  { id: "knows-details", label: "They knew my personal details to 'prove' identity", weight: 8 },
  { id: "transfer-call", label: "Call was transferred to 'police' or 'another officer'", weight: 20 },
  { id: "stay-on-line", label: "Told me to stay on the line while I bank", weight: 20 },
];

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function checkUrl(raw: string): UrlFinding {
  const url = raw.replace(/[).,!?]+$/, "");
  let host = url.replace(/^https?:\/\//i, "").split(/[/?#:]/)[0].toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  if (OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith("." + d)))
    return { url, host, verdict: "official", reason: "Matches an official domain." };
  if (SHORTENERS.includes(host)) return { url, host, verdict: "shortener", reason: "Link shortener hides the real destination. Banks don't send these." };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return { url, host, verdict: "suspicious", reason: "Raw IP address instead of a domain name." };
  if (host.startsWith("xn--") || host.includes(".xn--")) return { url, host, verdict: "lookalike", reason: "Punycode domain — may use look-alike characters." };
  const labels = host.split(".");
  const core = labels.slice(-2).join(".");
  const brand = /ocbc|0cbc|ocdc|oc8c|ocbe/.test(host);
  for (const d of OFFICIAL_DOMAINS) {
    const dist = lev(core, d);
    if ((dist > 0 && dist <= 2) || (brand && !host.endsWith(d)))
      return { url, host, verdict: "lookalike", reason: `Imitates "${d}" but is not it. Brand name inside a different domain.` };
  }
  if (/\.(xyz|top|click|link|info|shop|live|icu|buzz)$/.test(host))
    return { url, host, verdict: "suspicious", reason: "Low-cost domain extension commonly used in phishing." };
  return { url, host, verdict: "unknown", reason: "Not an official OCBC or government domain." };
}

const TYPOLOGIES: { name: string; needs: Signal["category"][]; ids?: string[] }[] = [
  { name: "Government official impersonation", needs: [], ids: ["gov-imp"] },
  { name: "AI voice / loved-one impersonation", needs: ["deepfake"] },
  { name: "Bank impersonation / phishing", needs: [], ids: ["bank-imp"] },
  { name: "Investment / job scam", needs: ["too-good"] },
  { name: "Malware / remote access scam", needs: [], ids: ["app-install"] },
];

export function levelFor(score: number): RiskLevel {
  return score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
}

export function analyze(input: AnalysisInput): AnalysisResult {
  const text = input.text || "";
  const signals: Signal[] = [];
  for (const r of RULES) {
    const found = Array.from(text.matchAll(r.pattern)).map((m) => m[0]);
    if (found.length) signals.push({ id: r.id, label: r.label, category: r.category, weight: r.weight, explanation: r.explanation, matches: [...new Set(found.map((f) => f.toLowerCase()))] });
  }

  const urls = (text.match(/\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|sg|net|xyz|top|click|link|info|ly|shop|live|icu|buzz|gd|at)(?:\.[a-z]{2})?(?:\/[^\s]*)?/gi) || []).map(checkUrl);
  const badUrls = urls.filter((u) => u.verdict !== "official");
  if (badUrls.length) {
    const w = badUrls.some((u) => u.verdict === "lookalike") ? 28 : badUrls.some((u) => u.verdict !== "unknown") ? 20 : 12;
    signals.push({ id: "link", label: "Link to a non-official website", category: "link", weight: w, explanation: "OCBC does not send clickable links in SMS. Open the OCBC app yourself instead.", matches: badUrls.map((u) => u.host) });
  }

  for (const id of input.callCues || []) {
    const c = CALL_CUES.find((x) => x.id === id);
    if (c) signals.push({ id: "cue-" + c.id, label: c.label, category: "deepfake", weight: c.weight, explanation: "Reported by you about the call. Deepfake audio/video and 'transfer to police' scripts often show these cues.", matches: [] });
  }

  // Unverified sender id: claims bank but sends from a phone number
  if (input.senderId && /^\+?\d[\d\s-]{6,}$/.test(input.senderId) && /ocbc|bank/i.test(input.claimedSender || text)) {
    signals.push({ id: "sender", label: "Bank claim from a personal number", category: "impersonation", weight: 16, explanation: "Official OCBC SMS use the registered sender ID 'OCBC', never a mobile number.", matches: [input.senderId] });
  }

  let score = signals.reduce((s, x) => s + x.weight, 0);
  // Combination boosts: pressure + money/credential ask is the core scam pattern
  const cats = new Set(signals.map((s) => s.category));
  if ((cats.has("urgency") || cats.has("pressure")) && (cats.has("credentials") || cats.has("payment"))) score += 15;
  if ((input.channel === "call" || input.channel === "video") && cats.has("payment")) score += 10;
  score = Math.min(100, score);

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  let confidence: AnalysisResult["confidence"] = "high";
  let confidenceNote = `${signals.length} independent signals across ${cats.size} categories.`;
  if (words < 8 && !(input.callCues?.length)) {
    confidence = "low";
    confidenceNote = "Very little text to analyse. A clean result does NOT mean it's safe — verify through the official app.";
  } else if (cats.size <= 1) {
    confidence = "medium";
    confidenceNote = "Only one type of signal found. Treat with care and verify if money or details are involved.";
  }

  const level = levelFor(score);
  let typology = "No clear scam pattern";
  for (const t of TYPOLOGIES) {
    if ((t.ids && t.ids.some((id) => signals.some((s) => s.id === id))) || (t.needs.length && t.needs.every((c) => cats.has(c)))) {
      if (level !== "low") { typology = t.name; break; }
    }
  }

  const actions: string[] = [];
  if (level === "low") actions.push("No strong warning signs — but still never share OTPs or passwords.");
  if (cats.has("credentials")) actions.push("Do not share any OTP, PIN, password or card details.");
  if (cats.has("link")) actions.push("Don't tap the link. Open the OCBC app or type ocbc.com yourself.");
  if (cats.has("payment")) actions.push("Don't transfer money. Use the Pause & Verify check before any payment.");
  if (cats.has("deepfake")) actions.push("Hang up and call the person back on a number you already have, or ask your family safe word.");
  if (cats.has("impersonation")) actions.push("Verify the caller with OCBC's in-app Caller Check before continuing.");
  if (level === "high" || level === "critical") actions.push("Report it — we'll record the evidence and a fraud officer will review it.", "If you've already shared details, use the Kill Switch to freeze your accounts now.");

  const safeMessage = level === "low"
    ? "Looks low-risk, but stay alert."
    : level === "medium"
      ? "Some warning signs. Pause and verify before doing anything."
      : "This looks like a scam. Stop and do not act on it.";

  return { score, level, confidence, confidenceNote, typology, signals: signals.sort((a, b) => b.weight - a.weight), urls, actions, safeMessage };
}

// ---------- Transfer friction ----------
export interface TransferInput {
  amount: number;
  payeeIsNew: boolean;
  payeeReported: boolean;
  usualMax: number;
  recentFlagged: boolean;
  answers: { onCall?: boolean; toldToLie?: boolean; knowPayee?: boolean; urgentRequest?: boolean };
}

export function transferRisk(t: TransferInput) {
  const reasons: string[] = [];
  let s = 0;
  if (t.payeeReported) { s += 45; reasons.push("This account has been reported by other customers (ScamShield synthetic list)."); }
  if (t.payeeIsNew) { s += 15; reasons.push("First time paying this account."); }
  if (t.amount > t.usualMax * 3) { s += 20; reasons.push(`Amount is over 3× your usual largest transfer (S$${t.usualMax.toLocaleString()}).`); }
  else if (t.amount > t.usualMax) { s += 10; reasons.push("Amount is higher than you usually send."); }
  if (t.recentFlagged) { s += 15; reasons.push("You checked a high-risk message in the last 24 hours."); }
  if (t.answers.onCall) { s += 25; reasons.push("Someone is on the phone guiding you."); }
  if (t.answers.toldToLie) { s += 30; reasons.push("You were told to hide the real reason from the bank."); }
  if (t.answers.knowPayee === false) { s += 15; reasons.push("You haven't met or verified the person you're paying."); }
  if (t.answers.urgentRequest) { s += 10; reasons.push("You're being pressured to pay quickly."); }
  s = Math.min(100, s);
  const level = levelFor(s);
  // Never block outright: critical => held for human review; high => cooling-off
  const cooldown = level === "critical" ? 0 : level === "high" ? 30 : level === "medium" ? 10 : 0;
  const outcome: "proceed" | "cooldown" | "review" = level === "critical" ? "review" : cooldown ? "cooldown" : "proceed";
  return { score: s, level, reasons, cooldown, outcome };
}
