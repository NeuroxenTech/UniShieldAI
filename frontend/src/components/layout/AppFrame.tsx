import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "../../lib/cn";

export function AppFrame() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="h-full bg-[#0A0A14] text-white overflow-hidden">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      <TopBar expanded={expanded} />
      <main
        className={cn(
          "absolute top-16 bottom-14 left-0 right-0 md:bottom-0 overflow-y-auto thin-scroll transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          expanded ? "md:left-[15rem]" : "md:left-16"
        )}
      >
        <div className="min-h-full ambient">
          <Outlet />
        </div>
      </main>
    </div>
  );
}