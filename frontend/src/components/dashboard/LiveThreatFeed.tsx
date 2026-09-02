import { cn } from "../../lib/cn";
import { colors } from "../../theme";

interface FeedItem {
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  src: string;
  dst?: string;
  proto: string;
  port?: string;
  confidence: string;
  time: string;
}

const feed: FeedItem[] = [
  {
    severity: "CRITICAL",
    title: "C2 Beaconing Detected",
    src: "10.24.18.42",
    dst: "185.x.xxx.xxx",
    proto: "TCP",
    port: "443",
    confidence: "98.7%",
    time: "12 sec ago",
  },
  {
    severity: "HIGH",
    title: "Port Scan Anomaly",
    src: "10.24.22.17",
    proto: "TCP",
    port: "—",
    confidence: "94.2%",
    time: "34 sec ago",
  },
  {
    severity: "MEDIUM",
    title: "DNS Tunneling Suspicion",
    src: "10.24.9.21",
    proto: "DNS",
    port: "53",
    confidence: "87.4%",
    time: "1 min ago",
  },
];

const sevStyle: Record<FeedItem["severity"], { color: string; bg: string; dot: string }> = {
  CRITICAL: { color: colors.red, bg: "rgba(244,63,94,0.10)", dot: colors.red },
  HIGH: { color: colors.pink, bg: "rgba(236,72,153,0.10)", dot: colors.pink },
  MEDIUM: { color: colors.amber, bg: "rgba(245,158,11,0.10)", dot: colors.amber },
};

export function LiveThreatFeed() {
  return (
    <div className="space-y-2.5">
      {feed.map((item, i) => {
        const s = sevStyle[item.severity];
        return (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl bg-[#0E1324] border border-white/[0.05] hover:bg-[#101731] transition-colors"
          >
            {/* severity bar */}
            <div
              className={cn(
                "w-[3px] self-stretch rounded-full",
                i === 0 && "pulse-soon"
              )}
              style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded",
                    i === 0 && "pulse-soon"
                  )}
                  style={{ color: s.color, backgroundColor: s.bg }}
                >
                  {item.severity}
                </span>
                <span className="text-[12.5px] font-medium text-[#CBD5E1] truncate">
                  {item.title}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] font-mono text-[#94A3B8]">
                {item.src}
                {item.dst && <span className="text-[#64748B]"> → {item.dst}</span>}
                <span className="text-[#64748B]">
                  {" "}
                  · {item.proto}
                  {item.port && item.port !== "—" ? ` / ${item.port}` : ""}
                </span>
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-[11px] text-[#818CF8]">
                  {item.confidence} confidence
                </span>
                <span className="text-[11px] text-[#64748B]">{item.time}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
