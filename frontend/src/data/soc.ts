import type { LucideIcon } from "lucide-react";
import {
  Users,
  Monitor,
  Mail,
  Globe,
  Cloud,
  Building2,
  Fish,
  CloudCog,
  Skull,
  CloudDownload,
  MailCheck,
  Shield,
  ShieldCheck,
  FileText,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { RiskLevel } from "../theme";

/* ---------------------------------------------------------------- */
/* Stat cards                                                         */
/* ---------------------------------------------------------------- */

export interface StatCardConfig {
  id: string;
  label: string;
  value: number;
  /** Signed percentage change; tinted green when >= 0, red otherwise. */
  change: number;
  icon: LucideIcon;
  color: string;
}

export const statCards: StatCardConfig[] = [
  { id: "users", label: "Total Users", value: 12480, change: 12.4, icon: Users, color: "#7C5CFC" },
  { id: "devices", label: "Devices", value: 9320, change: 8.2, icon: Monitor, color: "#A78BFA" },
  { id: "mailboxes", label: "Mailboxes", value: 15240, change: -3.1, icon: Mail, color: "#6BCB77" },
  { id: "browsers", label: "Browsers", value: 12206, change: 18.7, icon: Globe, color: "#FF9F43" },
  { id: "cloud", label: "Cloud Drives", value: 3840, change: 24.9, icon: Cloud, color: "#FFD93D" },
  { id: "assets", label: "Internet Assets", value: 518, change: 5.6, icon: Building2, color: "#FF4757" },
];

/* ---------------------------------------------------------------- */
/* Coverage & issues radar                                            */
/* ---------------------------------------------------------------- */

export interface CoverageAxis {
  key: string;
  label: string;
  icon: LucideIcon;
  /** 0..1 — fraction of assets covered on this axis. */
  covered: number;
}

/** 8 axes, angle = index * 45deg, starting at 12 o'clock, clockwise. */
export const coverageAxes: CoverageAxis[] = [
  { key: "phish", label: "Phishing Simulations", icon: Fish, covered: 0.78 },
  { key: "cloud-posture", label: "Cloud Posture", icon: CloudCog, covered: 0.62 },
  { key: "footprint", label: "External Footprint", icon: Globe, covered: 0.55 },
  { key: "dark-web", label: "Dark Web", icon: Skull, covered: 0.4 },
  { key: "cloud-data", label: "Cloud Data", icon: CloudDownload, covered: 0.7 },
  { key: "email", label: "Email Protection", icon: MailCheck, covered: 0.85 },
  { key: "endpoint", label: "Endpoint Security", icon: Shield, covered: 0.66 },
  { key: "browsing", label: "Secure Browsing", icon: ShieldCheck, covered: 0.9 },
];

export interface CoverageIssueDot {
  id: string;
  /** degrees, 0 = 12 o'clock, clockwise — keep near the low-coverage axes. */
  angle: number;
  /** 0..1 — radius from centre. */
  radius: number;
  risk: RiskLevel;
}

export const coverageIssues: CoverageIssueDot[] = [
  { id: "i1", angle: 128, radius: 0.56, risk: "high" },
  { id: "i2", angle: 133, radius: 0.72, risk: "critical" },
  { id: "i3", angle: 143, radius: 0.86, risk: "critical" },
  { id: "i4", angle: 86, radius: 0.62, risk: "medium" },
  { id: "i5", angle: 76, radius: 0.8, risk: "high" },
  { id: "i6", angle: 42, radius: 0.7, risk: "medium" },
  { id: "i7", angle: 30, radius: 0.85, risk: "low" },
  { id: "i8", angle: 268, radius: 0.76, risk: "medium" },
  { id: "i9", angle: 182, radius: 0.84, risk: "low" },
  { id: "i10", angle: 316, radius: 0.94, risk: "low" },
];

/* ---------------------------------------------------------------- */
/* Issues by risk                                                    */
/* ---------------------------------------------------------------- */

export interface RiskRow {
  level: RiskLevel;
  label: string;
  count: number;
  color: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  initials: string;
  status: "active" | "warning" | "critical";
  issues: number;
}

export interface IssuesByRiskConfig {
  total: number;
  change: number;
  rows: RiskRow[];
  customers: CustomerRow[];
}

export const issuesByRisk: IssuesByRiskConfig = {
  total: 1240,
  change: 12.4,
  rows: [
    { level: "critical", label: "Critical", count: 86, color: "#FF4757" },
    { level: "high", label: "High", count: 312, color: "#FF9F43" },
    { level: "medium", label: "Medium", count: 458, color: "#FFD93D" },
    { level: "low", label: "Low", count: 384, color: "#6BCB77" },
  ],
  customers: [
    { id: "c1", name: "Acme Corp", initials: "AC", status: "critical", issues: 42 },
    { id: "c2", name: "Globex", initials: "GL", status: "warning", issues: 17 },
    { id: "c3", name: "Initech", initials: "IN", status: "active", issues: 6 },
  ],
};

/* ---------------------------------------------------------------- */
/* Insight cards                                                     */
/* ---------------------------------------------------------------- */

export type InsightTone = "report" | "alert" | "setup";

export interface InsightConfig {
  id: string;
  tone: InsightTone;
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
}

export const insights: InsightConfig[] = [
  {
    id: "ins-report",
    tone: "report",
    icon: FileText,
    title: "New Report Ready",
    desc: "Your monthly security posture summary is available to download.",
    accent: "#7C5CFC",
  },
  {
    id: "ins-alert",
    tone: "alert",
    icon: ShieldAlert,
    title: "Security Alert",
    desc: "3 critical issues resolved automatically in the last 24 hours.",
    accent: "#FF4757",
  },
  {
    id: "ins-setup",
    tone: "setup",
    icon: Wrench,
    title: "Setup Required",
    desc: "2 mailboxes still need OAuth re-authentication to stay covered.",
    accent: "#FF9F43",
  },
];

/* ---------------------------------------------------------------- */
/* Chat widget                                                       */
/* ---------------------------------------------------------------- */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface ChatConfig {
  productName: string;
  replyTime: string;
  initialMessages: ChatMessage[];
}

export const chat: ChatConfig = {
  productName: "UniShield Assistant",
  replyTime: "Typically replies in under a minute",
  initialMessages: [
    {
      id: "m1",
      role: "assistant",
      text: "Hi! I can help with coverage questions, risk reports and new customer onboarding. What do you need?",
    },
    {
      id: "m2",
      role: "user",
      text: "Could you pull the risk summary for Acme Corp?",
    },
    {
      id: "m3",
      role: "assistant",
      text: "Sure — Acme currently has 42 open issues, 5 of them critical, mostly in Dark Web coverage.",
    },
  ],
};