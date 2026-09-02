import type { InsightConfig } from "../../data/soc";

interface InsightCardProps {
  data: InsightConfig;
}

export function InsightCard({ data }: InsightCardProps) {
  const { icon: Icon, title, desc, accent, tone } = data;
  const toneLabel =
    tone === "report" ? "New report" : tone === "alert" ? "Alert" : "Setup";

  return (
    <div
      className="glass-panel glass-hover p-4 pl-5 relative overflow-hidden group cursor-default"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-300"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          <Icon size={17} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {toneLabel}
          </p>
          <h4 className="text-[14px] font-semibold text-white mt-0.5">
            {title}
          </h4>
          <p className="text-[12.5px] text-[#94A3B8] mt-1 leading-snug">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}