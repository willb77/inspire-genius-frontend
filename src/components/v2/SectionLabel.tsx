import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionLabel — the uppercase "eyebrow" label for the new (HomeV2) design
 * system (e.g. "BEHAVIORAL ASSESSMENT", "RECENT ACTIVITY").
 *
 * Wave 0 primitive. Muted, small, letter-spaced, semibold. Colors from tokens
 * (text-mute). RTL-safe: text-start (not text-left).
 */
export type SectionLabelProps = HTMLAttributes<HTMLParagraphElement>;

export const SectionLabel = forwardRef<HTMLParagraphElement, SectionLabelProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-start text-[11px] font-semibold uppercase tracking-wide text-mute",
        className,
      )}
      {...props}
    />
  ),
);
SectionLabel.displayName = "SectionLabel";
