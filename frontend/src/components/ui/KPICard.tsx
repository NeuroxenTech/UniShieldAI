import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { colors } from "../../theme";

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  up?: boolean;
  icon: LucideIcon;
  changeLabel?: string;
}

export function KPICard({ label, value, change, up = true, icon: Icon, changeLabel }: KPICardProps) {
  const changeClass = up ? "text-[#34D399]" : "text-[#F43F5E]";
  const arrow = up ? "▲" : "▼";

  return (
    <div className="bg-[#0E1324] rounded-xl border border-white/[0.05] card-shadow p-4 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#4F46E5]/10 blur-2xl transition-opacity opacity-0 group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center text-[#818CF8]">
          <Icon size={16} strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-[28px] font-semibold text-white leading-tight mt-2.5 tabular-nums">
        {value}
      </p>
      {typeof change === "number" && (
        <div className={cn("flex items-center gap-1.5 mt-1", changeClass)}>
          <span className="text-[10px] font-semibold">{arrow}</span>
          <span className="text-[11px] font-medium tabular-nums">{Math.abs(change)}%</span>
          <span className="text-[11px] text-[#64748B]">{changeLabel ?? `vs ${label.toLowerCase()}`}</span>
        </div>
      )}
    </div>
  );
}
