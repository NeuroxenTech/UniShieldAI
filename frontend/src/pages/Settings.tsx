import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";

const categories = [
  "Detection Engine",
  "AI Models",
  "Network Sources",
  "Data Retention",
  "Alert Rules",
  "Users & Roles",
  "API",
  "System",
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors",
        on ? "bg-[#7C5CFC]" : "bg-white/[0.08]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[13px] text-[#CBD5E1]">{label}</p>
        {desc && <p className="text-[11px] text-[#64748B] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [active, setActive] = useState("Detection Engine");
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    signature: true,
    statistical: true,
    behavioral: true,
    supervised: true,
    anomaly: true,
    realtime: true,
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Settings" subtitle="Configure the UniShield AI detection and analysis engine." />

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Left settings nav */}
        <div className="glass-panel p-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active === c
                  ? "accent-gradient text-white shadow-[0_2px_12px_rgba(124,92,252,0.25)]"
                  : "text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-white/[0.03]"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Right config panel */}
        <Card title={active}>
          {active === "Detection Engine" && (
            <div>
              <Row label="Signature Rules" desc="Pattern-based detection of known threats">
                <Toggle on={toggles.signature} onChange={(v) => setToggles((s) => ({ ...s, signature: v }))} />
              </Row>
              <Row label="Statistical Rules" desc="Baseline-based detection of deviations">
                <Toggle on={toggles.statistical} onChange={(v) => setToggles((s) => ({ ...s, statistical: v }))} />
              </Row>
              <Row label="Behavioral Rules" desc="Behavioral anomaly detection">
                <Toggle on={toggles.behavioral} onChange={(v) => setToggles((s) => ({ ...s, behavioral: v }))} />
              </Row>
              <Row label="Real-time Analysis" desc="Process flows as they arrive">
                <Toggle on={toggles.realtime} onChange={(v) => setToggles((s) => ({ ...s, realtime: v }))} />
              </Row>
            </div>
          )}

          {active === "AI Models" && (
            <div>
              <Row label="Supervised Classification" desc="XGBoost model">
                <Toggle on={toggles.supervised} onChange={(v) => setToggles((s) => ({ ...s, supervised: v }))} />
              </Row>
              <Row label="Anomaly Detection" desc="Isolation Forest model">
                <Toggle on={toggles.anomaly} onChange={(v) => setToggles((s) => ({ ...s, anomaly: v }))} />
              </Row>
              <Row label="Retrain Models" desc="Automatically retrain on new data">
                <Toggle on={true} onChange={() => {}} />
              </Row>
            </div>
          )}

          {(active === "Network Sources" || active === "Data Retention" || active === "Alert Rules" ||
            active === "Users & Roles" || active === "API" || active === "System") && (
            <div className="py-8 text-center text-[13px] text-[#64748B]">
              {active} configuration panel.
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center gap-2">
            <Button variant="primary" size="md">Save Changes</Button>
            <Button variant="secondary" size="md">Reset</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
