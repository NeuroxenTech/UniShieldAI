import { GlassPanel } from "../components/soc/GlassPanel";
import { StatCard } from "../components/soc/StatCard";
import { CoverageRadar } from "../components/soc/CoverageRadar";
import { IssuesByRisk } from "../components/soc/IssuesByRisk";
import { InsightCard } from "../components/soc/InsightCard";
import { ChatWidget } from "../components/soc/ChatWidget";
import {
  statCards,
  coverageAxes,
  coverageIssues,
  issuesByRisk,
  insights,
  chat,
} from "../data/soc";

const legend = [
  { label: "Uncovered", swatch: "border border-dashed border-[#64748B]" },
  { label: "Covered", swatch: "bg-[#7C5CFC] shadow-[0_0_6px_rgba(124,92,252,0.8)]" },
  { label: "Issues", swatch: "bg-[#FF4757] shadow-[0_0_6px_rgba(255,71,87,0.8)]" },
];

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stat card row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      {/* Coverage + Issues 65/35 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <GlassPanel
          className="lg:col-span-3"
          title="Coverage & Issues by Security Control"
          subtitle="Unidirectional coverage across monitored security controls"
          action={
            <div className="flex items-center gap-3">
              {legend.map((l) => (
                <span
                  key={l.label}
                  className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]"
                >
                  <span className={`w-2 h-2 rounded-full inline-block ${l.swatch}`} />
                  {l.label}
                </span>
              ))}
            </div>
          }
        >
          <CoverageRadar axes={coverageAxes} issues={coverageIssues} />
        </GlassPanel>

        <div className="lg:col-span-2">
          <IssuesByRisk data={issuesByRisk} />
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight) => (
          <InsightCard key={insight.id} data={insight} />
        ))}
      </div>

      {/* Floating chat widget */}
      <ChatWidget config={chat} />
    </div>
  );
}