import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Renders an optional centred big number + badge on the right of the header. */
  bodyClassName?: string;
}

export function GlassPanel({
  children,
  className,
  title,
  subtitle,
  action,
  bodyClassName,
}: GlassPanelProps) {
  return (
    <div className={cn("glass-panel glass-hover", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[15px] font-semibold text-white leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-[#94A3B8] mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}