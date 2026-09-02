import { cn } from "../../lib/cn";

interface SeverityRow {
  label: string;
  count: number;
  total: number;
  color: string;
}

const severities: SeverityRow[] = [
  { label: "Critical", count: 18, total: 342, color: "#F43F5E" },
  { label: "High", count: 74, total: 342, color: "#EC4899" },
  { label: "Medium", count: 132, total: 342, color: "#F59E0B" },
  { label: "Low", count: 118, total: 342, color: "#FACC15" },
];

export function ThreatSeverity() {
  return (
    <div>
      {/* Total risk header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[12px] text-[#94A3B8]">Total Risk</p>
          <p className="text-[30px] font-semibold text-white tracking-tight tabular mt-0.5">
            342
          </p>
        </div>
        <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#34D399] bg-[#34D399]/10 px-2 py-1 rounded-md mb-1">
          +8.2%
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {severities.map((s) => {
          const pct = (s.count / s.total) * 100;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-[#CBD5E1]">{s.label}</span>
                <span className="text-[12px] text-[#94A3B8] tabular">
                  {s.count}
                </span>
              </div>
              <div className="h-[6px] w-full bg-[#161D2F] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: s.color,
                    boxShadow: `0 0 8px ${s.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
