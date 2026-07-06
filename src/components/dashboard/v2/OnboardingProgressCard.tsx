import type { JSX } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgressCardProps {
  percent: number; // 0-100
  caption?: string; // e.g. "You're just getting started"
}

export function OnboardingProgressCard({
  percent,
  caption,
}: OnboardingProgressCardProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const resolvedCaption = caption ?? "You're just getting started";

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#C9711A]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Your onboarding</span>
          </div>
          <div className="mt-1 text-[15px] font-medium text-[#4b5f80]">
            {resolvedCaption}
          </div>
        </div>
        <div
          className={cn(
            "font-serif text-[26px] leading-none text-[#0B1B33]",
            pct >= 100 && "text-[#3E6B55]",
          )}
        >
          {pct}%
        </div>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(11,27,51,0.08)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E8932B] to-[#5B8A72] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
