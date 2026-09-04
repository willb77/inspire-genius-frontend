/**
 * AskMeridianButton — drop-in trigger for the floating Meridian assistant.
 *
 * The popup itself is mounted once by `SupportAgentProvider` (in
 * SidebarScaffold), so exposing it on a page is only ever a trigger. This
 * component exists so that stays a one-liner instead of each page repeating
 * the hook call, icon choice and label:
 *
 *   <AskMeridianButton />
 *
 * The glyph is the universal information "i" (2026-09-04, request) rather
 * than the sparkle it carried before: sparkles read as "AI magic" on a
 * control whose actual job is "get an answer about this".
 *
 * Outside the provider `useSupportAgent` degrades to a no-op, so rendering
 * this in a bare test harness is safe.
 */
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupportAgent } from "@/context/useSupportAgent";
import { cn } from "@/lib/utils";

export type AskMeridianButtonProps = {
  /** Visible label. Keep it short — this sits in page headers. */
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

export default function AskMeridianButton({
  label = "Ask Meridian",
  variant = "outline",
  size = "sm",
  className,
}: AskMeridianButtonProps) {
  const { open } = useSupportAgent();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      onClick={open}
      data-testid="ask-meridian-button"
    >
      <Info className="size-4 mr-2" />
      {label}
    </Button>
  );
}
