import type { CoverageAxis, CoverageIssueDot } from "../../data/soc";
import type { RiskLevel } from "../../theme";

interface CoverageRadarProps {
  axes: CoverageAxis[];
  issues: CoverageIssueDot[];
}

// ViewBox geometry — wider than tall so axis labels at the sides never clip.
const VB_W = 480;
const VB_H = 400;
const CX = 240;
const CY = 200;
const R = 145; // plot radius
const R_LABEL = 175; // label anchor radius

const riskColor: Record<RiskLevel, string> = {
  critical: "#FF4757",
  high: "#FF9F43",
  medium: "#FFD93D",
  low: "#6BCB77",
};

const issueSize: Record<RiskLevel, number> = {
  critical: 4.5,
  high: 4,
  medium: 3.3,
  low: 2.7,
};

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

export function CoverageRadar({ axes, issues }: CoverageRadarProps) {
  const ringFracs = [0.25, 0.5, 0.75, 1];
  // Covered area: one point per axis (axis i sits at angle i*45deg).
  const polygonPoints = axes
    .map((axis, i) => polar(i * 45, axis.covered * R))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div
      className="relative w-full max-w-[560px] mx-auto"
      style={{ aspectRatio: `${VB_W}/${VB_H}` }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 w-full h-full select-none"
      >
        <defs>
          <linearGradient id="socCoverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.22" />
          </linearGradient>
          <filter id="socCoverBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* concentric dotted grid rings */}
        {ringFracs.map((frac) => (
          <circle
            key={frac}
            cx={CX}
            cy={CY}
            r={R * frac}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {/* axis spokes */}
        {axes.map((axis, i) => {
          const p = polar(i * 45, R);
          return (
            <line
              key={axis.key}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(124,92,252,0.14)"
              strokeWidth="1"
            />
          );
        })}

        {/* covered area — glow layer + crisper fill */}
        <polygon
          points={polygonPoints}
          fill="url(#socCoverGrad)"
          stroke="none"
          filter="url(#socCoverBlur)"
        />
        <polygon
          points={polygonPoints}
          fill="url(#socCoverGrad)"
          stroke="#7C5CFC"
          strokeOpacity="0.75"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* scatter dots — individual issues */}
        {issues.map((dot) => {
          const p = polar(dot.angle, dot.radius * R);
          const c = riskColor[dot.risk];
          return (
            <circle
              key={dot.id}
              className="radar-pulse"
              cx={p.x}
              cy={p.y}
              r={issueSize[dot.risk]}
              fill={c}
              stroke="#0A0A14"
              strokeWidth="1.2"
              style={{
                filter: `drop-shadow(0 0 4px ${c})`,
                animationDelay: `${(dot.angle / 360) * 2.6}s`,
              }}
            />
          );
        })}
      </svg>

      {/* rotating radar sweep — cosmetic, no content change */}
      <div className="radar-sweep">
        <div className="radar-sweep-beam" />
      </div>

      {/* axis labels — HTML overlays for crisp text + lucide icons */}
      {axes.map((axis, i) => {
        const p = polar(i * 45, R_LABEL);
        const Icon = axis.icon;
        return (
          <div
            key={axis.key}
            className="absolute flex flex-col items-center gap-1 pointer-events-none"
            style={{
              left: `${(p.x / VB_W) * 100}%`,
              top: `${(p.y / VB_H) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Icon size={15} className="text-[#A78BFA]" strokeWidth={1.75} />
            <span className="text-[10px] font-medium text-[#CBD5E1] whitespace-nowrap">
              {axis.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}