import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Radar,
  Activity,
  Bell,
  Network,
  Brain,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/cn";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutGrid },
  { label: "Threat Detection", path: "/detection", icon: Radar },
  { label: "Traffic Analysis", path: "/traffic", icon: Activity },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "Network Flows", path: "/network", icon: Network },
  { label: "AI Intelligence", path: "/ai", icon: Brain },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-16 bg-[#080B14] border-r border-white/[0.05] flex flex-col items-center py-4">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center glow-purple">
          <Shield size={16} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map((item) => (
          <div key={item.path} className="relative group">
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all duration-150",
                  isActive
                    ? "bg-[rgba(99,102,241,0.20)] text-[#818CF8]"
                    : "text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.04]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r bg-[#818CF8]" />
                  )}
                  <item.icon size={20} strokeWidth={1.75} />
                </>
              )}
            </NavLink>
            {/* Tooltip */}
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[#161D2F] border border-white/[0.08] text-[12px] font-medium text-[#CBD5E1] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl">
              {item.label}
            </span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
