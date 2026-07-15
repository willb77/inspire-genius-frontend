import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * V2Card — the standard section container for the new (HomeV2) design system.
 *
 * Wave 0 primitive. Large-radius, hairline-bordered, soft-shadowed white card
 * with generous padding — the reusable section box that replaces ad-hoc
 * `rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm`
 * strings. Colors come from tokens (border-hairline). RTL-safe.
 */
export type V2CardProps = HTMLAttributes<HTMLDivElement>;

export const V2Card = forwardRef<HTMLDivElement, V2CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-hairline bg-white p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
V2Card.displayName = "V2Card";
