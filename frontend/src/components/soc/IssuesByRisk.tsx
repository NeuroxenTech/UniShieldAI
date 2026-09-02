import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { IssuesByRiskConfig, CustomerRow } from "../../data/soc";
import { TrendBadge } from "./TrendBadge";
import { cn } from "../../lib/cn";

const statusColor: Record<CustomerRow["status"], string> = {
  active: "#6BCB77",
  warning: "#FF9F43",
  critical: "#FF4757",
};

function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? customers : customers.slice(0, 3);

  return (
    <div className="border-t border-white/[0.06] pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-white">Customers</p>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-0.5 text-[12px] font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
        >
          {showAll ? "Show less" : "View all"}
          <ChevronRight
            size={13}
            className={cn("transition-transform", showAll && "rotate-90")}
          />
        </button>
      </div>
      <div className="space-y-1">
        {visible.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-default"
          >
            <div className="w-8 h-8 rounded-full accent-gradient glow-violet flex items-center justify-center text-[11px] font-bold text-white">
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#CBD5E1] truncate">
                {c.name}
              </p>
              <p className="text-[11px] text-[#64748B] tabular-nums">
                {c.issues} issues
              </p>
            </div>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: statusColor[c.status] }}
              title={`Status: ${c.status}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface IssuesByRiskProps {
  data: IssuesByRiskConfig;
}

export function IssuesByRisk({ data }: IssuesByRiskProps) {
  const max = Math.max(...data.rows.map((r) => r.count));

  return (
    <div className="glass-panel glass-hover p-5 h-full">
      {/* Total risk + trend */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">
            Issues By Risk
          </p>
          <p className="text-[34px] font-bold text-white leading-none tracking-tight tabular-nums mt-2">
            {data.total.toLocaleString("en-US")}
          </p>
        </div>
        <div className="mt-1">
          <TrendBadge change={data.change} positiveIsGood={false} />
        </div>
      </div>

      {/* Risk bars */}
      <div className="space-y-4 mb-6">
        {data.rows.map((row) => {
          const pct = (row.count / max) * 100;
          return (
            <div key={row.level}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-[#CBD5E1]">{row.label}</span>
                <span className="text-[12px] text-[#94A3B8] tabular-nums">
                  {row.count}
                </span>
              </div>
              <div className="h-[6px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: row.color,
                    boxShadow: `0 0 10px ${row.color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer mini-list */}
      <CustomerList customers={data.customers} />
    </div>
  );
}