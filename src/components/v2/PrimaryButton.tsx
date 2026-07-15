import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * PrimaryButton — the navy primary action button for the new (HomeV2) design
 * system. Colors from tokens (bg-ink, ring-success-green-soft). RTL-safe.
 *
 * Wave 0 primitive. For the orange call-to-action variant use AccentButton.
 */
export type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5",
        "text-sm font-semibold text-white transition-colors hover:bg-ink/90",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-success-green-soft focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
PrimaryButton.displayName = "PrimaryButton";
