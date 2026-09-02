import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { colors, type SeverityKey } from "../theme";

interface ThreatRow {
  severity: SeverityKey;
  name: string;
  src: string;
  dst: string;
  confidence: string;
  status: string;
}

const rows: ThreatRow[] = [
  { severity: "critical", name: "C2 Beaconing", src: "10.24.18.42", dst: "185.x.x.xxx", confidence: "98.7%", status: "Detected" },
  { severity: "high", name: "Port Scan", src: "10.24.22.17", dst: "91.x.x.xxx", confidence: "94.2%", status: "Detected" },
  { severity: "medium", name: "DNS Tunneling", src: "10.24.9.21", dst: "8.8.8.8", confidence: "87.4%", status: "Analyzing" },
  { severity: "high", name: "Data Exfiltration", src: "10.24.30.5", dst: "45.x.xxx.xx", confidence: "91.8%", status: "Detected" },
  { severity: "low", name: "Reconnaissance", src: "203.0.113.5", dst: "10.24.0.12", confidence: "72.1%", status: "Analyzing" },
  { severity: "critical", name: "Malicious Destination", src: "10.24.18.42", dst: "198.51.100.7", confidence: "96.3%", status: "Detected" },
];

const sevStyle: Record<SeverityKey, string> = {
  critical: colors.red,
  high: colors.pink,
  medium: colors.amber,
  low: colors.yellow,
};

const pipeline = [
  { name: "Ingestion", detail: "14.2K flows/s" },
  { name: "Feature Extraction", detail: "48 features" },
  { name: "Rules", detail: "3 paths" },
  { name: "AI / ML", detail: "3 models" },
  { name: "Decision", detail: "Risk fusion" },
  { name: "Classification", detail: "142 classes" },
];

const models = [
  { name: "XGBoost", acc: 96.4, p: 95.8, r: 94.7, f1: 95.2 },
  { name: "Random Forest", acc: 93.1, p: 92.6, r: 91.3, f1: 91.9 },
  { name: "Isolation Forest", acc: 91.3, p: 89.8, r: 90.4, f1: 90.1 },
];

export default function ThreatDetection() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Threat Detection" subtitle="Real-time detection pipeline — rules and AI operate in parallel across unidirectional traffic." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <Card title="Detection Pipeline" className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {pipeline.map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-2 flex-1 min-w-[110px]">
                <div className="flex-1 bg-white/[0.04] rounded-lg border border-white/[0.06] px-3 py-3 text-center">
                  <p className="text-[12px] font-semibold text-[#CBD5E1]">{stage.name}</p>
                  <p className="text-[10.5px] text-[#64748B] mt-0.5">{stage.detail}</p>
                </div>
                {i < pipeline.length - 1 && (
                  <span className="text-[#A78BFA] text-[14px]">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34D399] live-source" />
            <span className="text-[12px] text-[#94A3B8]">
              Rules engine and AI/ML engine operating in parallel across 14,281 live flows/sec.
            </span>
          </div>
        </Card>

        {/* Detected threats */}
        <Card title="Currently Detected" action={<span className="text-[11px] text-[#A78BFA]">View all</span>}>
          <div className="space-y-2 -mx-5 -mt-3 px-5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="w-[3px] h-8 rounded-full" style={{ backgroundColor: sevStyle[r.severity], boxShadow: `0 0 6px ${sevStyle[r.severity]}` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[#CBD5E1] truncate">{r.name}</p>
                  <p className="text-[11px] font-mono text-[#94A3B8] truncate">{r.src} → {r.dst}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#A78BFA] tabular">{r.confidence}</p>
                  <p className="text-[10px] text-[#64748B]">{r.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Model performance */}
      <Card title="Model Performance">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {models.map((m) => (
            <div key={m.name} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-[13px] font-semibold text-white mb-3">{m.name}</p>
              {[
                { label: "Accuracy", value: m.acc },
                { label: "Precision", value: m.p },
                { label: "Recall", value: m.r },
                { label: "F1", value: m.f1 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-[#94A3B8] w-16">{label}</span>
                  <div className="flex-1 h-[5px] bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#A78BFA]" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-[11px] text-[#A78BFA] tabular w-10 text-right">{value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Investigate Threats">
        <div className="flex items-center gap-3">
          <Button variant="primary" size="md">Start New Investigation</Button>
          <Button variant="secondary" size="md">Export Evidence</Button>
        </div>
      </Card>
    </div>
  );
}
