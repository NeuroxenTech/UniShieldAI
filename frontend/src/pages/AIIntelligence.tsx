import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const modelConfidence = [
  { label: "Threat Classification", value: 98.2 },
  { label: "Anomaly Detection", value: 95.7 },
  { label: "Behavior Analysis", value: 92.4 },
  { label: "Risk Confidence", value: 96.8 },
  { label: "Protocol Detection", value: 99.1 },
];

const actions = [
  "Isolate affected host",
  "Capture live traffic",
  "Revoke suspect credentials",
  "Update detection rules",
];

export default function AIIntelligence() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="AI Security Intelligence" subtitle="Explainable AI analysis of unidirectional network traffic." />

      {/* Large AI summary card */}
      <Card
        title="UniShield AI Threat Summary"
        action={
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] live-source" /> AI ENGINE ACTIVE
          </span>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-2">THREAT SUMMARY</p>
              <p className="text-[13.5px] leading-relaxed text-[#CBD5E1]">
                Elevated outbound traffic from host{" "}
                <span className="font-mono text-white">10.24.18.42</span> shows
                periodic beaconing behavior. The pattern matches known
                command-and-control communication to{" "}
                <span className="font-mono text-white">185.x.x.xxx</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-2">BEHAVIOR ANALYSIS</p>
              <p className="text-[13.5px] leading-relaxed text-[#CBD5E1]">
                Connections occur at regular 60-second intervals with consistent
                packet sizes, deviating from the host's typical baseline by 4.2
                standard deviations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-2">ANOMALY EXPLANATION</p>
              <p className="text-[13.5px] leading-relaxed text-[#CBD5E1]">
                Anomaly score of <span className="font-mono text-[#FF4757]">0.91</span>{" "}
                driven by high periodicity and low inter-arrival time variance,
                inconsistent with legitimate traffic.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-2">RISK ASSESSMENT</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[24px] font-semibold text-[#FF4757] tabular">97.4</p>
                  <p className="text-[11px] text-[#64748B]">Risk Score</p>
                </div>
                <div className="w-[2px] h-10 bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-[24px] font-semibold text-white tabular">Critical</p>
                  <p className="text-[11px] text-[#64748B]">Severity</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-3">MODEL CONFIDENCE</p>
              <div className="space-y-3">
                {modelConfidence.map((c) => (
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
            </div>
          </div>
        </div>
      </Card>

      {/* Recommended actions */}
      <Card title="Recommended Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((a) => (
            <div key={a} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <span className="text-[#A78BFA] text-[14px]">▸</span>
              <span className="text-[13px] text-[#CBD5E1]">{a}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="primary" size="md">Apply Recommended Actions</Button>
          <Button variant="secondary" size="md">Dismiss</Button>
        </div>
      </Card>
    </div>
  );
}
