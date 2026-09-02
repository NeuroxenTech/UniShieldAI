import { Button } from "../ui/Button";

interface Confidence {
  label: string;
  value: number; // 0..100
}

const confidences: Confidence[] = [
  { label: "Threat Classification", value: 98.2 },
  { label: "Anomaly Detection", value: 95.7 },
  { label: "Behavior Analysis", value: 92.4 },
  { label: "Risk Confidence", value: 96.8 },
];

export function AIIntelligenceCard() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#34D399] live-source" />
        <span className="text-[12px] font-semibold text-[#34D399] tracking-wide">
          AI ENGINE ACTIVE
        </span>
      </div>

      <div className="space-y-3.5 mb-4">
        {confidences.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12.5px] text-[#CBD5E1]">{c.label}</span>
              <span className="text-[12px] text-[#818CF8] tabular">
                {c.value.toFixed(1)}%
              </span>
            </div>
            <div className="h-[5px] w-full bg-[#161D2F] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA]"
                style={{ width: `${c.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[12.5px] leading-relaxed text-[#94A3B8] mb-4">
        Elevated outbound traffic from{" "}
        <span className="font-mono text-[#CBD5E1]">10.24.18.42</span> shows
        periodic beaconing behavior consistent with command-and-control
        activity.
      </p>

      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm">
          View Analysis
        </Button>
        <Button variant="secondary" size="sm">
          Investigate
        </Button>
      </div>
    </div>
  );
}
