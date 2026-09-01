import { Activity, Gauge, ArrowLeftRight, Globe, MapPin } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { Card } from "../components/ui/Card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  type TooltipProps,
} from "recharts";

const volumeData = [
  { time: "00:00", in: 40, out: 55 },
  { time: "03:00", in: 45, out: 52 },
  { time: "06:00", in: 52, out: 60 },
  { time: "09:00", in: 64, out: 72 },
  { time: "12:00", in: 70, out: 80 },
  { time: "15:00", in: 66, out: 76 },
  { time: "18:00", in: 60, out: 70 },
  { time: "21:00", in: 50, out: 62 },
];

const protocolData = [
  { name: "TCP", value: 42, color: "#6366F1" },
  { name: "UDP", value: 28, color: "#9333EA" },
  { name: "HTTPS", value: 14, color: "#818CF8" },
  { name: "DNS", value: 9, color: "#A78BFA" },
  { name: "HTTP", value: 5, color: "#64748B" },
  { name: "ICMP", value: 2, color: "#94A3B8" },
];

const talkers = [
  { ip: "10.24.18.42", pct: 34, color: "#F43F5E" },
  { ip: "10.24.22.17", pct: 26, color: "#EC4899" },
  { ip: "10.24.9.21", pct: 18, color: "#F59E0B" },
  { ip: "10.24.5.88", pct: 12, color: "#818CF8" },
  { ip: "10.24.0.12", pct: 10, color: "#34D399" },
];

const ChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161D2F] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#94A3B8] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] text-white tabular">
          <span className="mr-1.5" style={{ color: p.color }}>●</span>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function TrafficAnalysis() {

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Traffic Analysis" subtitle="Unidirectional traffic monitoring and flow analysis." showTimeRange />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard label="Traffic Volume" value="84.6M" change={12.8} icon={Activity} />
        <KPICard label="Packets/sec" value="14.2K" change={4.1} icon={Gauge} />
        <KPICard label="Bytes/sec" value="3.4 GB" change={9.6} icon={ArrowLeftRight} />
        <KPICard label="Unique Sources" value="1,204" change={6.2} icon={Globe} />
        <KPICard label="Unique Destinations" value="3,871" change={-2.3} up={false} icon={MapPin} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic volume */}
        <Card title="Traffic Volume" className="lg:col-span-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333EA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} dy={8} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip content={ChartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="in" name="Inbound" stroke="#6366F1" strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="out" name="Outbound" stroke="#9333EA" strokeWidth={2} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Protocol distribution */}
        <Card title="Protocol Distribution">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={protocolData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="transparent">
                  {protocolData.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip content={ChartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top talkers */}
        <Card title="Top Talkers">
          <div className="space-y-3.5">
            {talkers.map((t) => (
              <div key={t.ip}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-mono text-[#CBD5E1]">{t.ip}</span>
                  <span className="text-[12px] text-[#94A3B8] tabular">{t.pct}%</span>
                </div>
                <div className="h-[6px] w-full bg-[#161D2F] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.pct * 2.5}%`, backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}66` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Inbound vs Outbound */}
        <Card title="Inbound vs Outbound" className="lg:col-span-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} dy={8} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip content={ChartTooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="in" name="Inbound" fill="#6366F1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="out" name="Outbound" fill="#9333EA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
