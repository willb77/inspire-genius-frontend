import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

/**
 * ProgressBar — the orange→green completeness bar for the new (HomeV2) design
 * system (e.g. "Complete profile (40%)"). Colors from tokens
 * (from-accent-orange to-success-green-soft). RTL-safe: the fill grows by
 * width, which mirrors correctly under dir="rtl".
 *
 * Wave 0 primitive.
 */
export interface ProgressBarProps {
  /** Completion 0–100. Clamped. */
  value: number;
  className?: string;
  /** Accessible label for the bar. Pass a translated string. */
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  className,
  ariaLabel,
}: ProgressBarProps): ReactElement {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-hairline", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-orange to-success-green-soft transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
