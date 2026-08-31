/**
 * SupportAgentLauncher — the always-available Help & Support button.
 *
 * WHY A GLOBAL LAUNCHER RATHER THAN A BUTTON PER PAGE
 * ---------------------------------------------------
 * Per-page triggers are a standing trap here: the app runs two generations of
 * most user pages (Home/HomeV2, Dashboard/DashboardV2, Help/HelpV2) behind
 * `surfaceFlags`, and the V2 set is the DEFAULT. A trigger added to the classic
 * page is invisible to nearly every real user, and nothing in a build, a test
 * or a bundle grep catches it — the code ships, it just is not on the page the
 * route resolves to. That is exactly how #442 shipped triggers users could not
 * reach.
 *
 * Rendering once from `SupportAgentProvider` sidesteps the whole class of bug:
 * whatever the surface resolver picks, the launcher is outside it.
 *
 * POSITION
 * `bottom-6 right-24` deliberately, NOT `right-6` — AlexFloating already owns
 * `bottom-6 right-6` (z-30) and VoiceDeskWidget claims the same spot at z-50.
 * Sitting to their left avoids stacking three buttons on one pixel. The
 * launcher hides while the popup is open, since the popup itself occupies the
 * bottom-right corner.
 */
import { LifeBuoy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSupportAgent } from "@/context/useSupportAgent";

export type SupportAgentLauncherProps = {
  className?: string;
};

export default function SupportAgentLauncher({ className }: SupportAgentLauncherProps) {
  const { isOpen, open } = useSupportAgent();

  // The popup owns the corner while it is up.
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open Help &amp; Support assistant"
      title="Help & Support"
      data-testid="support-agent-launcher"
      className={cn(
        "fixed bottom-6 right-24 z-40",
        "flex items-center justify-center size-12 rounded-full",
        "bg-blue-600 text-white shadow-lg",
        "transition-all duration-200 hover:bg-blue-700 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
        className,
      )}
    >
      <LifeBuoy className="size-5" />
    </button>
  );
}
