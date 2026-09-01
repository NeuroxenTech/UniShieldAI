import { useState } from "react";
import { Search, ChevronDown, Filter } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { cn } from "../lib/cn";
import { colors, type SeverityKey } from "../theme";

interface AlertRow {
  severity: SeverityKey;
  name: string;
  src: string;
  dst: string;
  confidence: string;
  time: string;
  status: "New" | "Investigating" | "Resolved" | "Ignored";
}

const rows: AlertRow[] = [
  { severity: "critical", name: "C2 Beaconing", src: "10.24.18.42", dst: "185.x.x.xxx", confidence: "98.7%", time: "12 sec ago", status: "New" },
  { severity: "high", name: "Port Scan Anomaly", src: "10.24.22.17", dst: "91.x.x.xxx", confidence: "94.2%", time: "34 sec ago", status: "Investigating" },
  { severity: "medium", name: "DNS Tunneling", src: "10.24.9.21", dst: "8.8.8.8", confidence: "87.4%", time: "1 min ago", status: "New" },
  { severity: "high", name: "Data Exfiltration", src: "10.24.30.5", dst: "45.x.xxx.xx", confidence: "91.8%", time: "4 min ago", status: "Investigating" },
  { severity: "low", name: "Reconnaissance", src: "203.0.113.5", dst: "10.24.0.12", confidence: "72.1%", time: "9 min ago", status: "Resolved" },
  { severity: "critical", name: "Malicious Destination", src: "10.24.18.42", dst: "198.51.100.7", confidence: "96.3%", time: "13 min ago", status: "New" },
  { severity: "medium", name: "Traffic Burst", src: "10.24.5.88", dst: "192.0.2.44", confidence: "84.9%", time: "21 min ago", status: "Ignored" },
];

const sevStyle: Record<SeverityKey, { color: string; bg: string }> = {
  critical: { color: colors.red, bg: "rgba(244,63,94,0.10)" },
  high: { color: colors.pink, bg: "rgba(236,72,153,0.10)" },
  medium: { color: colors.amber, bg: "rgba(245,158,11,0.10)" },
  low: { color: colors.yellow, bg: "rgba(250,204,21,0.10)" },
};

const statusStyle: Record<AlertRow["status"], string> = {
  New: "#818CF8",
  Investigating: colors.amber,
  Resolved: colors.green,
  Ignored: colors.text4,
};

const filters = ["Severity", "Threat Type", "Protocol", "Source", "Destination", "Time Range", "Status"];

export default function Alerts() {
  const [activeStatus, setActiveStatus] = useState<AlertRow["status"]>("New");

  const filtered = rows.filter((r) =>
    activeStatus === "New" ? r.status === "New" || r.status === "Investigating" : r.status === activeStatus
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Security Alerts" subtitle="Investigable, explainable detection events from the UniShield AI engine." />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-[#0E1324] border border-white/[0.06] rounded-lg px-3 h-10 max-w-md">
          <Search size={15} className="text-[#64748B]" />
          <input
            placeholder="Search alerts"
            className="flex-1 bg-transparent text-[13px] text-[#CBD5E1] placeholder-[#64748B] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0E1324] border border-white/[0.06] text-[12px] text-[#94A3B8] hover:border-white/[0.12] hover:text-[#CBD5E1] transition-colors"
            >
              {f}
              <ChevronDown size={13} className="text-[#64748B]" />
            </button>
          ))}
          <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0E1324] border border-white/[0.06] text-[12px] text-[#818CF8] hover:border-white/[0.12] transition-colors">
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2">
        {(["New", "Investigating", "Resolved", "Ignored"] as AlertRow["status"][]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={cn(
              "px-4 h-9 rounded-lg text-[13px] font-medium transition-all duration-150",
              activeStatus === s
                ? "bg-[#1A2235] text-white"
                : "text-[#94A3B8] hover:text-[#CBD5E1] bg-[#0E1324] border border-white/[0.06]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <Card>
        <div className="-m-5">
          {filtered.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-[#161D2F] transition-colors"
            >
              <div
                className="w-[3px] self-stretch rounded-full"
                style={{ backgroundColor: sevStyle[row.severity].color, boxShadow: `0 0 8px ${sevStyle[row.severity].color}` }}
              />
              <div className="w-28">
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ color: sevStyle[row.severity].color, backgroundColor: sevStyle[row.severity].bg }}>
                  {row.severity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-[#CBD5E1] truncate">{row.name}</p>
                <p className="text-[12px] font-mono text-[#94A3B8] mt-0.5">
                  {row.src} <span className="text-[#64748B]">→</span> {row.dst}
                </p>
              </div>
              <div className="text-[12px] text-[#818CF8] tabular w-20 text-right">{row.confidence}</div>
              <div className="text-[12px] text-[#64748B] w-24 text-right">{row.time}</div>
              <div className="w-28 text-right">
                <span className="text-[11px] font-medium" style={{ color: statusStyle[row.status] }}>
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
