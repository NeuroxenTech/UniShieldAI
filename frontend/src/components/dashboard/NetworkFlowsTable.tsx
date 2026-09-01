import { cn } from "../../lib/cn";
import { colors } from "../../theme";

export interface FlowRow {
  timestamp: string;
  src: string;
  dst: string;
  protocol: string;
  packets: string;
  bytes: string;
  direction: "Outbound" | "Inbound";
  risk: "Critical" | "High" | "Medium" | "Low" | "Normal";
  status: "Detected" | "Analyzing" | "Normal";
}

const riskColor: Record<FlowRow["risk"], string> = {
  Critical: colors.red,
  High: colors.pink,
  Medium: colors.amber,
  Low: colors.yellow,
  Normal: colors.green,
};

const statusStyle: Record<FlowRow["status"], { color: string; bg: string }> = {
  Detected: { color: colors.red, bg: "rgba(244,63,94,0.10)" },
  Analyzing: { color: colors.amber, bg: "rgba(245,158,11,0.10)" },
  Normal: { color: colors.green, bg: "rgba(52,211,153,0.10)" },
};

export function NetworkFlowsTable({ rows }: { rows: FlowRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {[
              "Timestamp",
              "Source IP",
              "Destination IP",
              "Protocol",
              "Packets",
              "Bytes",
              "Direction",
              "Risk",
              "Status",
            ].map((h) => (
              <th
                key={h}
                className="py-2.5 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.03] bg-[#0E1324] hover:bg-[#161D2F] transition-colors"
            >
              <td className="py-3 px-3 text-[12px] font-mono text-[#94A3B8] whitespace-nowrap">
                {r.timestamp}
              </td>
              <td className="py-3 px-3 text-[12px] font-mono text-[#CBD5E1] whitespace-nowrap">
                {r.src}
              </td>
              <td className="py-3 px-3 text-[12px] font-mono text-[#CBD5E1] whitespace-nowrap">
                {r.dst}
              </td>
              <td className="py-3 px-3 text-[12px] font-mono text-[#818CF8] uppercase">
                {r.protocol}
              </td>
              <td className="py-3 px-3 text-[12px] font-mono text-[#94A3B8] tabular">
                {r.packets}
              </td>
              <td className="py-3 px-3 text-[12px] font-mono text-[#94A3B8] tabular">
                {r.bytes}
              </td>
              <td className="py-3 px-3 text-[12px] text-[#94A3B8] whitespace-nowrap">
                {r.direction}
              </td>
              <td className="py-3 px-3 text-[12px] font-semibold whitespace-nowrap" style={{ color: riskColor[r.risk] }}>
                {r.risk}
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <span
                  className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-md",
                    r.status === "Detected" && "pulse-soon"
                  )}
                  style={{ color: statusStyle[r.status].color, backgroundColor: statusStyle[r.status].bg }}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
