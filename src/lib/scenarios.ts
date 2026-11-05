import type { Channel } from "./scam-engine";

export interface Scenario {
  id: string;
  title: string;
  channel: Channel;
  claimedSender: string;
  senderId: string;
  text: string;
  truth: "scam" | "legit";
  callCues?: string[];
}

// Synthetic examples only.
export const SCENARIOS: Scenario[] = [
  { id: "s1", title: "Fake OCBC SMS", channel: "sms", claimedSender: "OCBC", senderId: "+65 8123 4567", truth: "scam",
    text: "OCBC: Your account has been suspended due to unusual activity. Verify immediately within 30 mins at ocbc-secure-login.xyz/verify or it will be frozen." },
  { id: "s2", title: "'Police' call (deepfake)", channel: "call", claimedSender: "Singapore Police Force", senderId: "+65 6555 0199", truth: "scam",
    callCues: ["transfer-call", "stay-on-line", "refuse-callback"],
    text: "This is Inspector Tan from SPF. Your bank account is linked to a money laundering case. There is a warrant for your arrest. To clear your name, transfer your savings to a safe account for investigation. This is a confidential investigation, don't tell your family." },
  { id: "s3", title: "Child's voice note", channel: "whatsapp", claimedSender: "Son (new number)", senderId: "+65 9001 2233", truth: "scam",
    callCues: ["voice-odd"],
    text: "Mum it's me, I lost my phone so this is my new number. I'm in trouble, had an accident. Please PayNow $2,800 to my friend urgently, I'll explain later. Don't tell dad." },
  { id: "s4", title: "Investment 'opportunity'", channel: "social", claimedSender: "Crypto Mentor Jasmine", senderId: "@jasmine.wealth", truth: "scam",
    text: "Join our VIP group for guaranteed returns of 8% daily! Earn $5000 a week with crypto. Deposit USDT to start. Add me on Telegram, slots expire today." },
  { id: "s5", title: "Real OCBC notification", channel: "sms", claimedSender: "OCBC", senderId: "OCBC", truth: "legit",
    text: "OCBC: A PayNow transfer of SGD 45.00 to KOPITIAM PTE LTD was made from your account ending 1234 on 05 Nov. If unauthorised, call 6363 3333 or use the OCBC app." },
  { id: "s6", title: "Friend's dinner message", channel: "whatsapp", claimedSender: "Wei Ling", senderId: "+65 9876 5432", truth: "legit",
    text: "Hey! Dinner on Friday at 7pm still on? I booked the table at the usual place near Tampines. Let me know if you're bringing anyone." },
];

export const MOCK_PAYEES = [
  { name: "Tan Mei Ling", account: "OCBC 501-234567-001", known: true, reported: false },
  { name: "Global Asset Holdings", account: "XYZ 778-993311-2", known: false, reported: true },
  { name: "Ahmad Bin Yusof", account: "DBS 120-445566-9", known: false, reported: false },
];
