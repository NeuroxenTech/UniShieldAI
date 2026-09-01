import { useState } from "react";
import { Plus, Bell, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

type Segment = "Overview" | "Live Monitor";

export function TopBar() {
  const [segment, setSegment] = useState<Segment>("Overview");

  return (
    <header className="fixed top-0 left-16 right-0 z-30 h-16 px-6 bg-[#050810]/80 backdrop-blur-md border-b border-white/[0.05] flex items-center justify-between">
      {/* Segmented control */}
      <div className="flex items-center p-1 rounded-full bg-[#0E1324] border border-white/[0.05]">
        {(["Overview", "Live Monitor"] as Segment[]).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={cn(
              "px-4 h-9 rounded-full text-[13px] font-medium transition-all duration-150",
              segment === s
                ? "bg-[#1A2235] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#CBD5E1]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <Button variant="primary" size="md">
          <Plus size={15} strokeWidth={2} />
          New Investigation
        </Button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-[#0E1324] border border-white/[0.06] flex items-center justify-center text-[#94A3B8] hover:text-[#CBD5E1] transition-colors">
          <Bell size={17} strokeWidth={1.75} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#34D399] live-source" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#9333EA] flex items-center justify-center text-white text-[12px] font-semibold">
            SA
          </div>
          <div className="hidden md:block text-left">
            <p className="text-[12.5px] font-medium text-[#CBD5E1] leading-tight">
              Security Admin
            </p>
            <p className="text-[11px] text-[#64748B] leading-tight">
              security@unishield.ai
            </p>
          </div>
          <ChevronDown size={15} className="text-[#64748B]" />
        </button>
      </div>
    </header>
  );
}
