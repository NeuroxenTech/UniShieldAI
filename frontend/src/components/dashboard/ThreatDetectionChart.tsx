import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  time: string;
  detected: number;
  anomalies: number;
  baseline: number;
  isAnomaly?: boolean;
}

interface Props {
  data: DataPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#161D2F] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#94A3B8] mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] text-white tabular">
          <span className="mr-1.5" style={{ color: p.color || "#fff" }}>
            ●
          </span>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// Renders a small glowing dot only where isAnomaly is true.
function anomalyDot(props: {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!payload?.isAnomaly || cx === undefined || cy === undefined) return <></>;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill="#818CF8"
      stroke="#0E1324"
      strokeWidth={1.5}
      style={{ filter: "drop-shadow(0 0 4px rgba(129,140,248,0.8))" }}
    />
  );
}

export function ThreatDetectionChart({ data }: Props) {
  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 12, left: -14, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradDetected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 8"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="#64748B"
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            stroke="#64748B"
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <Area
            type="monotone"
            dataKey="detected"
            name="Detected"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#gradDetected)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#6366F1",
              stroke: "#fff",
              strokeWidth: 1,
            }}
          />
          <Line
            type="monotone"
            dataKey="anomalies"
            name="Anomalies"
            stroke="#9333EA"
            strokeWidth={1.75}
            dot={anomalyDot}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke="#64748B"
            strokeWidth={1}
            strokeDasharray="6 6"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
