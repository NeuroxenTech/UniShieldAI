import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { colors } from "../theme";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const details = [
  { label: "Threat Type", value: "C2 Beaconing", mono: false },
  { label: "Source IP", value: "10.24.18.42", mono: true },
  { label: "Destination", value: "185.x.x.xxx", mono: true },
  { label: "Protocol", value: "HTTPS", mono: true },
  { label: "First Seen", value: "14:18:42", mono: true },
  { label: "Last Seen", value: "14:23:11", mono: true },
];

const timelineData = [
  { time: "14:18", count: 12 },
  { time: "14:19", count: 34 },
  { time: "14:20", count: 51 },
  { time: "14:21", count: 78 },
  { time: "14:22", count: 96 },
  { time: "14:23", count: 112 },
];

const confidence = [
  { label: "Threat Classification", value: 97.4 },
  { label: "Behavior Analysis", value: 95.1 },
  { label: "Anomaly Detection", value: 93.8 },
];

function Meta({ label, value, mono }: { label: string; value: string; mono: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[12.5px] text-[#94A3B8]">{label}</span>
      <span className={`text-[12.5px] text-[#CBD5E1] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function ThreatInvestigation() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Threat Investigation" subtitle="UniShield AI investigation workspace" />

      {/* Threat header */}
      <div className="flex items-center justify-between glass-panel px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] text-[#64748B]">Threat ID</p>
            <p className="text-[15px] font-mono font-semibold text-white mt-0.5">
              THR-2026-001842
            </p>
          </div>
        </div>
        <span
          className="text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-md"
          style={{ color: colors.red, backgroundColor: "rgba(244,63,94,0.10)", boxShadow: `0 0 10px ${colors.red}55` }}
        >
          CRITICAL
        </span>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <Card title="Threat Details">
          <div className="-mx-5 -my-5 px-5">
            {details.map((d) => (
              <Meta key={d.label} label={d.label} value={d.value} mono={d.mono} />
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Button variant="primary" size="sm">Block Source</Button>
            <Button variant="secondary" size="sm">Download PCAP</Button>
          </div>
        </Card>

        {/* Center: Traffic timeline */}
        <Card title="Traffic Timeline" action={<span className="text-[11px] text-[#34D399]">● LIVE</span>}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTimeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4757" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF4757" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} dy={8} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#151528", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" name="Packets" stroke="#FF4757" strokeWidth={2} fill="url(#gTimeline)" />
                <Line type="monotone" dataKey="count" stroke="#FF4757" strokeWidth={1.5} dot={{ r: 2.5, fill: "#FF4757" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right: AI Analysis */}
        <Card title="UniShield AI Analysis" action={
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] live-source" /> ACTIVE
          </span>
        }>
          <div className="space-y-5">
            <div>
              <p className="text-[12px] text-[#94A3B8] mb-1">Confidence</p>
              <p className="text-[28px] font-semibold text-white tabular">97.4%</p>
            </div>

            <div className="space-y-3.5">
              {confidence.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-[#CBD5E1]">{c.label}</span>
                    <span className="text-[12px] text-[#A78BFA] tabular">{c.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-[5px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#A78BFA]" style={{ width: `${c.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#94A3B8] mb-1">Risk</p>
              <p className="text-[13px] font-semibold" style={{ color: colors.red }}>Critical</p>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#CBD5E1] mb-2">Explanation</p>
              <p className="text-[12.5px] leading-relaxed text-[#94A3B8]">
                Periodic outbound HTTPS connections from{" "}
                <span className="font-mono text-[#CBD5E1]">10.24.18.42</span> to a
                known external host exhibit regular beaconing intervals consistent
                with command-and-control.
              </p>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#CBD5E1] mb-2">Recommended Actions</p>
              <ul className="space-y-1.5">
                {["Isolate affected host", "Capture live traffic", "Revoke suspect credentials"].map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[12.5px] text-[#94A3B8]">
                    <span className="text-[#A78BFA] mt-0.5 text-[11px]">▸</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
