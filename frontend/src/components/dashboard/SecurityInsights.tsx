import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "../../lib/cn";

interface Insight {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  tag: "Security" | "AI" | "Operations";
}

const insights: Insight[] = [
  {
    icon: Sparkles,
    title: "New Threat Pattern",
    desc: "AI identified a new outbound traffic pattern requiring investigation.",
    tag: "Security",
  },
  {
    icon: Sparkles,
    title: "Potential C2 Communication",
    desc: "Periodic connections detected from an internal host to an unusual external destination.",
    tag: "AI",
  },
  {
    icon: Sparkles,
    title: "Model Performance",
    desc: "Threat classification confidence increased to 98.2%.",
    tag: "Operations",
  },
];

const filters = ["Security", "AI Analysis", "Operations"];

export function SecurityInsights() {
  const [active, setActive] = useState("Security");
  const [ignored, setIgnored] = useState(false);

  const visible = ignored
    ? insights
    : insights.filter((i) => i.tag === (active === "AI Analysis" ? "AI" : active));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-white">
          Security Insights{" "}
          <span className="text-[13px] font-normal text-[#64748B]">(16)</span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-[#0E1324] border border-white/[0.05]">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={cn(
                  "px-3 h-7 rounded-md text-[12px] font-medium transition-all duration-150",
                  active === f
                    ? "bg-[#1A2235] text-white"
                    : "text-[#94A3B8] hover:text-[#CBD5E1]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIgnored((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium px-2.5 h-7 rounded-md border transition-colors",
              ignored
                ? "text-[#818CF8] border-[#4F46E5]/40 bg-[#4F46E5]/10"
                : "text-[#64748B] border-white/[0.06] hover:text-[#94A3B8]"
            )}
          >
            <span
              className={cn(
                "w-7 h-3.5 rounded-full relative transition-colors",
                ignored ? "bg-[#4F46E5]" : "bg-[#161D2F]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all",
                  ignored ? "left-[15px]" : "left-0.5"
                )}
              />
            </span>
            Ignored
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {visible.map((insight, i) => (
          <button
            key={i}
            className="group flex items-start gap-3 p-4 bg-[#161D2F] rounded-xl border border-white/[0.05] text-left hover:bg-[#1a2136] hover:border-white/[0.10] transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center text-[#818CF8] flex-shrink-0">
              <insight.icon size={17} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-[#CBD5E1]">
                {insight.title}
              </p>
              <p className="text-[12px] text-[#94A3B8] mt-1 leading-snug">
                {insight.desc}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-[#64748B] mt-1 group-hover:text-[#94A3B8] group-hover:translate-x-0.5 transition-all"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
