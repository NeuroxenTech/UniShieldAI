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
  HelpCircle,
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
];

const footerItems = [
  { label: "Help", icon: HelpCircle },
  { label: "Settings", path: "/settings", icon: Settings },
];

function Tooltip({ label }: { label: string }) {
  return (
    <span className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[#161D2F] border border-white/[0.08] text-[12px] font-medium text-[#CBD5E1] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl">
      {label}
    </span>
  );
}

function NavLinkButton({
  label,
  path,
  icon: Icon,
  end,
}: {
  label: string;
  path: string;
  icon: typeof Radar;
  end?: boolean;
}) {
  return (
    <div className="relative group">
      <NavLink
        to={path}
        end={end ?? path === "/"}
        className={({ isActive }) =>
          cn(
            "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150",
            isActive
              ? "accent-gradient glow-violet text-white"
              : "text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.05]"
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute top-0 md:top-1/2 right-1/2 translate-x-1/2 md:translate-x-0 md:right-auto md:left-0 md:-translate-y-1/2 w-6 md:w-[3px] h-[3px] md:h-6 rounded-full md:rounded-r bg-white/80 md:bg-[#A78BFA]" />
            )}
            <Icon size={20} strokeWidth={1.75} />
          </>
        )}
      </NavLink>
      <Tooltip label={label} />
    </div>
  );
}

function IconButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Radar;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-label={label}
        className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.05]"
      >
        <Icon size={20} strokeWidth={1.75} />
      </button>
      <Tooltip label={label} />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed z-40 bottom-0 inset-x-0 h-14 md:h-full md:inset-y-0 md:left-0 md:w-16 flex items-center md:items-stretch md:flex-col px-2 md:px-0 md:py-4 bg-[#0B0B17]/95 md:bg-[#0B0B17] backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/[0.06]">
      {/* Logo (desktop only) */}
      <div className="hidden md:block mb-6">
        <div className="w-8 h-8 rounded-xl accent-gradient glow-violet flex items-center justify-center">
          <Shield size={16} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Primary nav — row on mobile, column on desktop */}
      <nav className="flex md:flex-col md:flex-1 gap-1.5 w-full items-center justify-around md:justify-start">
        {navItems.map((item) => (
          <NavLinkButton key={item.path} {...item} />
        ))}
      </nav>

      {/* Secondary nav — pinned bottom (desktop only) */}
      <div className="hidden md:flex flex-col gap-1.5 border-t border-white/[0.06] pt-3">
        {footerItems.map((item) =>
          item.path ? (
            <NavLinkButton key={item.label} label={item.label} path={item.path} icon={item.icon} />
          ) : (
            <IconButton key={item.label} label={item.label} icon={item.icon} />
          )
        )}
      </div>
    </aside>
  );
}