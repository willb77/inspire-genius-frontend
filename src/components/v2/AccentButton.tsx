import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * AccentButton — the orange call-to-action button for the new (HomeV2) design
 * system (e.g. "Request PRISM Inventory", primary Meridian CTA). Colors from
 * tokens (bg-accent-orange → hover bg-accent-orange-dark). RTL-safe.
 *
 * Wave 0 primitive. For the navy primary action use PrimaryButton.
 */
export type AccentButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AccentButton = forwardRef<HTMLButtonElement, AccentButtonProps>(
  ({ className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-accent-orange px-4 py-2.5",
        "text-sm font-semibold text-white transition-colors hover:bg-accent-orange-dark",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-success-green-soft focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
AccentButton.displayName = "AccentButton";
