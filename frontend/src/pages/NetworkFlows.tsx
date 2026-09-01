import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { NetworkFlowsTable, type FlowRow } from "../components/dashboard/NetworkFlowsTable";

const allFlows: FlowRow[] = [
  { timestamp: "14:22:08", src: "10.24.18.42", dst: "185.x.x.xxx", protocol: "TCP", packets: "12,492", bytes: "8.4 MB", direction: "Outbound", risk: "Critical", status: "Detected" },
  { timestamp: "14:21:57", src: "10.24.22.17", dst: "91.x.x.xxx", protocol: "TCP", packets: "841", bytes: "320 KB", direction: "Outbound", risk: "High", status: "Detected" },
  { timestamp: "14:21:43", src: "10.24.9.21", dst: "8.8.8.8", protocol: "UDP", packets: "2,310", bytes: "540 KB", direction: "Outbound", risk: "Medium", status: "Analyzing" },
  { timestamp: "14:21:30", src: "203.0.113.5", dst: "10.24.0.12", protocol: "HTTPS", packets: "1,204", bytes: "2.1 MB", direction: "Inbound", risk: "Low", status: "Normal" },
  { timestamp: "14:21:12", src: "10.24.5.88", dst: "192.0.2.44", protocol: "ICMP", packets: "96", bytes: "8 KB", direction: "Outbound", risk: "Normal", status: "Normal" },
  { timestamp: "14:20:58", src: "198.51.100.7", dst: "10.24.0.9", protocol: "HTTPS", packets: "3,872", bytes: "5.3 MB", direction: "Inbound", risk: "Low", status: "Normal" },
  { timestamp: "14:20:47", src: "10.24.18.42", dst: "45.x.xxx.xx", protocol: "TCP", packets: "4,011", bytes: "1.9 MB", direction: "Outbound", risk: "High", status: "Analyzing" },
  { timestamp: "14:20:31", src: "10.24.0.254", dst: "10.24.255.255", protocol: "UDP", packets: "312", bytes: "48 KB", direction: "Outbound", risk: "Normal", status: "Normal" },
];

export default function NetworkFlows() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Network Flows" subtitle="Detailed unidirectional traffic flow analysis." showTimeRange />

      <Card
        title="All Network Flows"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {["All", "Outbound", "Inbound"].map((f, i) => (
                <button key={f} className={`px-3 h-7 rounded-md text-[12px] font-medium ${i === 0 ? "bg-[#1A2235] text-white" : "text-[#94A3B8]"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {["Detected", "Analyzing", "Normal"].map((f, i) => (
                <button key={f} className={`px-3 h-7 rounded-md text-[12px] font-medium ${i === 0 ? "bg-[#1A2235] text-white" : "text-[#94A3B8]"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <NetworkFlowsTable rows={allFlows} />
      </Card>
    </div>
  );
}
