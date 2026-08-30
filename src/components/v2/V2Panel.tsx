import type { ReactNode, ReactElement } from "react";
import { cn } from "@/lib/utils";

/**
 * V2Panel — the cream page frame for the new (HomeV2) design system.
 *
 * Wave 0 primitive. Wraps a page's content in the warm working-surface panel
 * and constrains it to a centered max-width column. This is the standard outer
 * frame every migrated page's content sits in (inside the unchanged role
 * layout/shell). Colors come from design tokens (bg-panel), not inline hex.
 *
 * RTL-safe: no physical-direction utilities.
 */
export interface V2PanelProps {
  children: ReactNode;
  /** Extra classes for the inner content column. */
  className?: string;
  /** Extra classes for the outer cream panel. */
  panelClassName?: string;
}

export function V2Panel({
  children,
  className,
  panelClassName,
}: V2PanelProps): ReactElement {
  return (
    <div className={cn("rounded-2xl bg-panel p-4 md:p-6", panelClassName)}>
      <div className={cn("mx-auto flex max-w-6xl flex-col gap-4", className)}>
        {children}
      </div>
    </div>
  );
}
