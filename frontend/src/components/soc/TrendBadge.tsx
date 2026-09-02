import { cn } from "../../lib/cn";

interface TrendBadgeProps {
  change: number;
  /** When false (e.g. a rising risk total), positive changes render red. */
  positiveIsGood?: boolean;
  suffix?: string;
}

export function TrendBadge({
  change,
  positiveIsGood = true,
  suffix = "for last month",
}: TrendBadgeProps) {
  const good = positiveIsGood ? change >= 0 : change < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums",
        good ? "bg-[#6BCB77]/12 text-[#6BCB77]" : "bg-[#FF4757]/12 text-[#FF4757]"
      )}
    >
      <span>{change >= 0 ? "\u2191" : "\u2193"}</span>
      <span>{Math.abs(change).toFixed(1)}%</span>
      <span className="font-normal text-[#94A3B8]">{suffix}</span>
    </span>
  );
}