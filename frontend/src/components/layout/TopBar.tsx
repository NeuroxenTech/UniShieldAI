import { useState } from "react";
import { Plus, Bell, Settings, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

type Segment = "All Customers" | "Single Customer";

export function TopBar({ expanded }: { expanded: boolean }) {
  const [segment, setSegment] = useState<Segment>("All Customers");

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 h-16 px-4 md:px-6 bg-[#0A0A14]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between gap-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:left-16",
        expanded && "md:left-[15rem]"
      )}
    >
      {/* Segmented pill toggle */}
      <div className="hidden sm:flex items-center p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
        {(["All Customers", "Single Customer"] as Segment[]).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={cn(
              "px-4 h-9 rounded-full text-[13px] font-medium transition-all duration-150",
              segment === s
                ? "bg-white/[0.08] text-white"
                : "text-[#94A3B8] hover:text-[#CBD5E1]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Button variant="primary" size="md">
          <Plus size={15} strokeWidth={2.25} />
          Add Now
        </Button>

        {/* Notification */}
        <button
          className="relative w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#94A3B8] hover:text-[#CBD5E1] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={17} strokeWidth={1.75} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF4757]">
            <span className="absolute inset-0 rounded-full bg-[#FF4757] animate-ping opacity-60" />
          </span>
        </button>

        {/* Settings */}
        <button
          className="hidden md:flex w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] items-center justify-center text-[#94A3B8] hover:text-[#CBD5E1] transition-colors"
          aria-label="Settings"
        >
          <Settings size={17} strokeWidth={1.75} />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors">
          <div className="w-9 h-9 rounded-xl accent-gradient glow-violet flex items-center justify-center text-white text-[12px] font-semibold">
            SA
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-[12.5px] font-medium text-[#CBD5E1] leading-tight">
              Security Admin
            </p>
            <p className="text-[11px] text-[#64748B] leading-tight">
              admin@unishield.ai
            </p>
          </div>
          <ChevronDown size={15} className="hidden lg:block text-[#64748B]" />
        </button>
      </div>
    </header>
  );
}