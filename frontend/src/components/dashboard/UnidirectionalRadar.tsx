import { colors } from "../../theme";

interface RadarNode {
  label: string;
  angle: number; // degrees
  intensity: number; // 0..1 relative
  status: "normal" | "watch" | "alert";
}

const nodes: RadarNode[] = [
  { label: "Traffic Ingestion", angle: 0, intensity: 0.7, status: "normal" },
  { label: "Flow Analysis", angle: 45, intensity: 0.85, status: "normal" },
  { label: "Protocol Detection", angle: 90, intensity: 0.6, status: "normal" },
  { label: "Anomaly Detection", angle: 135, intensity: 0.95, status: "alert" },
  { label: "Threat Classification", angle: 180, intensity: 0.9, status: "normal" },
  { label: "Behavior Analysis", angle: 225, intensity: 0.78, status: "watch" },
  { label: "Risk Scoring", angle: 270, intensity: 0.88, status: "normal" },
  { label: "Alert Engine", angle: 315, intensity: 0.92, status: "watch" },
];

const statusColor: Record<RadarNode["status"], string> = {
  normal: colors.periwinkle,
  watch: colors.amber,
  alert: colors.red,
};

const R = 150; // radar radius
const CX = 200;
const CY = 200;

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

export function UnidirectionalRadar() {
  const ringRadii = [50, 100, 150];

  return (
    <div className="ambient-radar w-full h-[400px] relative overflow-hidden rounded-lg flex items-center justify-center">
      <svg
        width="400"
        height="400"
        viewBox="0 0 400 400"
        className="select-none"
      >
        {/* faint dot grid */}
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.18)" />
          <stop offset="60%" stopColor="rgba(99,102,241,0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <defs>
          <linearGradient id="wedgeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(129,140,248,0.0)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0.22)" />
          </linearGradient>
        </defs>

        <circle cx={CX} cy={CY} r={R} fill="url(#radarGlow)" />

        {/* rings */}
        {ringRadii.map((r) => (
          <circle
            key={r}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke="rgba(99,102,241,0.18)"
            strokeWidth="1"
            strokeDasharray={r === 150 ? "2 5" : "1 5"}
          />
        ))}

        {/* cross hairs */}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(99,102,241,0.10)" strokeWidth="1" />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(99,102,241,0.10)" strokeWidth="1" />

        {/* radial sector guides (every 45deg) */}
        {nodes.map((n) => {
          const p = polar(n.angle, R);
          return (
            <line
              key={n.label}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(99,102,241,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* rotating scan wedge */}
        <g className="scan-wedge">
          <path
            d={`M ${CX} ${CY} L ${CX + R} ${CY} A ${R} ${R} 0 0 1 ${polar(36, R).x} ${polar(36, R).y} Z`}
            fill="url(#wedgeGrad)"
          />
        </g>

        {/* center node */}
        <circle cx={CX} cy={CY} r={38} fill="#0E1324" stroke="rgba(79,70,229,0.5)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={30} fill="#161D2F" stroke="rgba(129,140,248,0.6)" strokeWidth="1" strokeDasharray="3 3" />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="Inter, sans-serif"
        >
          UNISHIELD
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="7" fontWeight="600" fill="#818CF8" fontFamily="Inter, sans-serif">
          AI ENGINE
        </text>
        <circle cx={CX} cy={CY + 14} r={2.5} fill="#34D399" className="pulse-soon" />

        {/* surrounding nodes */}
        {nodes.map((n) => {
          const p = polar(n.angle, R - 24);
          const c = statusColor[n.status];
          return (
            <g key={n.label}>
              {/* connection line */}
              <line x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={c} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 4" />
              {/* glow ring */}
              <circle cx={p.x} cy={p.y} r={9} fill="none" stroke={c} strokeOpacity="0.35" strokeWidth="1" />
              {/* data point */}
              <circle cx={p.x} cy={p.y} r={n.status === "alert" ? 4 : 3} fill={c} style={{ filter: `drop-shadow(0 0 5px ${c})` }} />
              {/* label */}
              <text x={polar(n.angle, R - 52).x} y={polar(n.angle, R - 52).y + 3} textAnchor="middle" fontSize="8.5" fill="#CBD5E1" fontFamily="Inter, sans-serif">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
