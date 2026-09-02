// Design tokens matching the UniShield AI reference visual identity.
export const colors = {
  page: "#050810",
  sidebar: "#080b14",
  primary: "#0e1324",
  secondary: "#161d2f",
  segment: "#1a2235",
  accent: "#4f46e5",
  indigo: "#6366f1",
  purple: "#9333ea",
  periwinkle: "#818CF8",
  track: "#161d2f",
  border: "rgba(255,255,255,0.05)",
  borderHover: "rgba(255,255,255,0.10)",
  activeBg: "rgba(99,102,241,0.20)",
  text: "#ffffff",
  text2: "#cbd5e1",
  text3: "#94a3b8",
  text4: "#64748b",
  green: "#34D399",
  red: "#F43F5E",
  pink: "#EC4899",
  amber: "#F59E0B",
  yellow: "#FACC15",
} as const;

// Severity config used across threat / alert / risk UI.
export const severity = {
  critical: { color: colors.red },
  high: { color: colors.pink },
  medium: { color: colors.amber },
  low: { color: colors.yellow },
} as const;

export type SeverityKey = keyof typeof severity;

// SOC Command Center palette (violet glassmorphic identity).
export const soc = {
  page: "#0a0a14",
  sidebar: "#0b0b17",
  accent: "#7C5CFC",
  accent2: "#A78BFA",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.06)",
  risk: {
    critical: "#FF4757",
    high: "#FF9F43",
    medium: "#FFD93D",
    low: "#6BCB77",
  } as const,
} as const;

export type RiskLevel = keyof typeof soc.risk;