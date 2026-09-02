import type { FlowRow } from "../components/dashboard/NetworkFlowsTable";

export const kpis = [
  { label: "Total Flows", value: "1.28M", change: 18.4, icon: "activity" },
  { label: "Packets Analyzed", value: "84.6M", change: 12.8, icon: "network" },
  { label: "Threats Detected", value: "342", change: 8.2, icon: "shield" },
  { label: "Critical Alerts", value: "18", change: -12.4, up: false, icon: "alert" },
  { label: "Anomalies", value: "1,482", change: 24.7, icon: "radar" },
  { label: "Protected Assets", value: "126", change: 6.4, icon: "server" },
];

export const threatChartData = [
  { time: "00:00", detected: 42, anomalies: 30, baseline: 24, isAnomaly: false },
  { time: "02:00", detected: 48, anomalies: 33, baseline: 26, isAnomaly: false },
  { time: "04:00", detected: 40, anomalies: 28, baseline: 25, isAnomaly: false },
  { time: "06:00", detected: 55, anomalies: 41, baseline: 27, isAnomaly: true },
  { time: "08:00", detected: 62, anomalies: 44, baseline: 29, isAnomaly: true },
  { time: "10:00", detected: 58, anomalies: 40, baseline: 28, isAnomaly: false },
  { time: "12:00", detected: 70, anomalies: 52, baseline: 30, isAnomaly: true },
  { time: "14:00", detected: 66, anomalies: 47, baseline: 31, isAnomaly: false },
  { time: "16:00", detected: 74, anomalies: 55, baseline: 32, isAnomaly: true },
  { time: "18:00", detected: 68, anomalies: 48, baseline: 30, isAnomaly: false },
  { time: "20:00", detected: 60, anomalies: 43, baseline: 28, isAnomaly: false },
  { time: "22:00", detected: 51, anomalies: 36, baseline: 26, isAnomaly: true },
];

export const networkFlows: FlowRow[] = [
  { timestamp: "14:22:08", src: "10.24.18.42", dst: "185.x.x.xxx", protocol: "TCP", packets: "12,492", bytes: "8.4 MB", direction: "Outbound", risk: "Critical", status: "Detected" },
  { timestamp: "14:21:57", src: "10.24.22.17", dst: "91.x.x.xxx", protocol: "TCP", packets: "841", bytes: "320 KB", direction: "Outbound", risk: "High", status: "Detected" },
  { timestamp: "14:21:43", src: "10.24.9.21", dst: "8.8.8.8", protocol: "UDP", packets: "2,310", bytes: "540 KB", direction: "Outbound", risk: "Medium", status: "Analyzing" },
  { timestamp: "14:21:30", src: "203.0.113.5", dst: "10.24.0.12", protocol: "HTTPS", packets: "1,204", bytes: "2.1 MB", direction: "Inbound", risk: "Low", status: "Normal" },
  { timestamp: "14:21:12", src: "10.24.5.88", dst: "192.0.2.44", protocol: "ICMP", packets: "96", bytes: "8 KB", direction: "Outbound", risk: "Normal", status: "Normal" },
  { timestamp: "14:20:58", src: "198.51.100.7", dst: "10.24.0.9", protocol: "HTTPS", packets: "3,872", bytes: "5.3 MB", direction: "Inbound", risk: "Low", status: "Normal" },
  { timestamp: "14:20:47", src: "10.24.18.42", dst: "45.x.xxx.xx", protocol: "TCP", packets: "4,011", bytes: "1.9 MB", direction: "Outbound", risk: "High", status: "Analyzing" },
];
