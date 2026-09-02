import { useCountUp } from "../../hooks/useCountUp";
import type { StatCardConfig } from "../../data/soc";
import { TrendBadge } from "./TrendBadge";

function formatValue(value: number): string {
  return value.toLocaleString("en-US");
}

interface StatCardProps {
  data: StatCardConfig;
}

export function StatCard({ data }: StatCardProps) {
  const { label, value, change, icon: Icon, color } = data;
  const display = formatValue(Math.round(useCountUp(value)));

  return (
    <div className="glass-panel glass-hover p-4 relative overflow-hidden group">
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium text-[#94A3B8] uppercase tracking-wide">
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          <Icon size={17} strokeWidth={1.75} />
        </div>
      </div>

      <p className="text-[32px] font-bold text-white leading-none tracking-tight tabular-nums">
        {display}
      </p>

      <div className="mt-3">
        <TrendBadge change={change} />
      </div>
    </div>
  );
}