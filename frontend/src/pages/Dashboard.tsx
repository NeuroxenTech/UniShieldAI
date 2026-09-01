import {
  Activity,
  Network,
  ShieldAlert,
  AlertTriangle,
  Radar,
  Server,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { Card } from "../components/ui/Card";
import { ThreatDetectionChart } from "../components/dashboard/ThreatDetectionChart";
import { ThreatSeverity } from "../components/dashboard/ThreatSeverity";
import { UnidirectionalRadar } from "../components/dashboard/UnidirectionalRadar";
import { LiveThreatFeed } from "../components/dashboard/LiveThreatFeed";
import { AIIntelligenceCard } from "../components/dashboard/AIIntelligenceCard";
import { SecurityInsights } from "../components/dashboard/SecurityInsights";
import { NetworkFlowsTable } from "../components/dashboard/NetworkFlowsTable";
import { kpis, threatChartData, networkFlows } from "../data/demo";

const kpiIcons: Record<string, typeof Activity> = {
  activity: Activity,
  network: Network,
  shield: ShieldAlert,
  alert: AlertTriangle,
  radar: Radar,
  server: Server,
};

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] live-source" />
      LIVE
    </span>
  );
}

const chartLegend = [
  { label: "Detected", color: "#6366F1" },
  { label: "Anomalies", color: "#9333EA" },
  { label: "Baseline", color: "#64748B" },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Security Overview"
        subtitle="AI-powered monitoring and threat detection across unidirectional IP traffic."
        showTimeRange
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => {
          const Icon = kpiIcons[k.icon] ?? Activity;
          return (
            <KPICard
              key={k.label}
              label={k.label}
              value={k.value}
              change={k.change}
              icon={Icon}
              up={k.up}
              changeLabel="vs previous period"
            />
          );
        })}
      </div>

      {/* Main 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-col */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Threat Detection Overview"
            action={<LiveBadge />}
            headerClassName="!border-b-0"
          >
            <div className="flex items-center gap-4 px-1 pb-1">
              {chartLegend.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
            <ThreatDetectionChart data={threatChartData} />
          </Card>

          <Card title="Threats by Severity">
            <ThreatSeverity />
          </Card>
        </div>

        {/* Right 1-col sidebar */}
        <div className="space-y-6">
          <Card title="Unidirectional Traffic Intelligence">
            <UnidirectionalRadar />
          </Card>

          <Card title="Live Threat Feed">
            <LiveThreatFeed />
          </Card>

          <Card title="UniShield AI Analysis">
            <AIIntelligenceCard />
          </Card>
        </div>
      </div>

      {/* Insights */}
      <Card title="Insights" subtitle="16 AI-generated findings">
        <SecurityInsights />
      </Card>

      {/* Network flows */}
      <Card title="Recent Network Flows" action={<span className="text-[11px] text-[#818CF8]">View all</span>}>
        <NetworkFlowsTable rows={networkFlows} />
      </Card>
    </div>
  );
}
