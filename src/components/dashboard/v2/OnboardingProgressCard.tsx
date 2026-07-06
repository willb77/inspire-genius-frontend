import type { JSX } from "react";
import { CheckCircle2, Circle, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdditionalAssessment {
  name: string;
  done: boolean;
}

interface OnboardingProgressCardProps {
  profilePercent: number; // e.g. 40
  missing: string[]; // e.g. ["Resume","Bio","Additional info"]
  prismStatusLabel: string; // e.g. "PRISM · Jun 9, 2026"
  assessments: AdditionalAssessment[]; // the additional-assessment roster
  onAddAssessment?: (name: string) => void;
}

export function OnboardingProgressCard({
  profilePercent,
  missing,
  prismStatusLabel,
  assessments,
  onAddAssessment,
}: OnboardingProgressCardProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(profilePercent)));

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      {/* Eyebrow */}
      <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#C9711A]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Your onboarding</span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium text-[#0B1B33]">
            Complete profile ({pct}%)
          </span>
          <span className="font-serif text-[24px] leading-none text-[#0B1B33]">
            {pct}%
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(11,27,51,0.08)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Complete profile"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E8932B] to-[#5B8A72] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Missing chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-[#4b5f80]">Missing:</span>
        {missing.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] px-2.5 py-0.5 text-[12px] font-medium text-[#4b5f80]"
          >
            {item}
          </span>
        ))}
      </div>

      {/* Profile Status */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(11,27,51,0.10)] pt-4">
        <span className="text-[13px] font-semibold text-[#0B1B33]">
          Profile Status
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3E6B55]">
          <CheckCircle2 className="h-4 w-4 text-[#5B8A72]" aria-hidden="true" />
          {prismStatusLabel}
        </span>
      </div>

      {/* Additional assessments */}
      <div className="mt-4 border-t border-[rgba(11,27,51,0.10)] pt-4">
        <div className="text-[13px] font-semibold text-[#0B1B33]">
          Additional assessments
        </div>
        <ul className="mt-2 space-y-2">
          {assessments.map((assessment) => (
            <li
              key={assessment.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="inline-flex items-center gap-2 text-[14px] text-[#0B1B33]">
                {assessment.done ? (
                  <CheckCircle2
                    className="h-4 w-4 text-[#5B8A72]"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle className="h-4 w-4 text-[#7C93B5]" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    assessment.done ? "text-[#3E6B55]" : "text-[#0B1B33]",
                  )}
                >
                  {assessment.name}
                </span>
              </span>
              {!assessment.done && (
                <button
                  type="button"
                  onClick={() => onAddAssessment?.(assessment.name)}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgba(11,27,51,0.10)] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#C9711A] transition-colors hover:bg-[#FBF7F0]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Additional Assessment
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
