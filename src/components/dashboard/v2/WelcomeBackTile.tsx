import type { JSX } from "react";
import { CalendarDays, CheckCircle2, Circle, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WelcomeBackAssessment {
  name: string;
  done: boolean;
}

/** Resume / Bio / Additional info — same shape, separate column. */
export interface WelcomeBackPersonalInfo {
  name: string;
  done: boolean;
}

interface WelcomeBackTileProps {
  displayName: string;
  lastTopic?: string;
  onResumeConversation: () => void;
  hasReport: boolean;
  reportFileName?: string;
  prismLoading?: boolean;
  onRequestAssessment: () => void;
  onViewReportPdf: () => void;
  profilePercent: number;
  assessments: WelcomeBackAssessment[];
  personalInfo: WelcomeBackPersonalInfo[];
  onAddAssessment?: (name: string) => void;
  onAddPersonalInfo?: (name: string) => void;
}

/**
 * One "Add"/"done" row shared by both the assessment and personal-info
 * columns: a left indicator (✓ when the item exists, ○ when missing), the
 * label, then an Add pill on the right. When the item already exists the Add
 * pill is greyed + disabled and the checkmark is filled — the completeness
 * contract requested for HomeV3.
 */
function CompletionRow({
  name,
  done,
  onAdd,
}: {
  name: string;
  done: boolean;
  onAdd?: (name: string) => void;
}): JSX.Element {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-[14px]">
        {done ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-[#3E6B55]"
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-[#7C93B5]" aria-hidden="true" />
        )}
        <span className={cn("truncate", done ? "text-[#3E6B55]" : "text-[#0B1B33]")}>
          {name}
        </span>
      </span>
      <button
        type="button"
        onClick={done ? undefined : () => onAdd?.(name)}
        disabled={done}
        aria-label={done ? `${name} added` : `Add ${name}`}
        aria-disabled={done}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
          done
            ? "cursor-default border-[rgba(11,27,51,0.06)] bg-[#F1F1F1] text-[#9AA3B0]"
            : "border-[rgba(11,27,51,0.10)] bg-white text-[#C9711A] hover:bg-[#FBF7F0]",
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add
      </button>
    </li>
  );
}

export function WelcomeBackTile({
  displayName,
  lastTopic,
  onResumeConversation,
  hasReport,
  reportFileName,
  prismLoading = false,
  onRequestAssessment,
  onViewReportPdf,
  profilePercent,
  assessments,
  personalInfo,
  onAddAssessment,
  onAddPersonalInfo,
}: WelcomeBackTileProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(profilePercent)));

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm">
      {/* 1. Header */}
      <h2 className="font-serif text-[22px] leading-tight text-[#0B1B33]">
        Welcome back, <span className="text-[#C9711A]">{displayName}</span>.
      </h2>

      {/* 2. Continuation line */}
      <p className="mt-1.5 text-[13px] text-[#4b5f80]">
        {lastTopic ? (
          <>
            Last time we discussed{" "}
            <button
              type="button"
              onClick={onResumeConversation}
              className="font-medium text-[#C9711A] underline underline-offset-2 hover:text-[#E8932B]"
            >
              {lastTopic}
            </button>
            . Continue, or start a new conversation?
          </>
        ) : (
          <button
            type="button"
            onClick={onResumeConversation}
            className="text-left hover:text-[#0B1B33]"
          >
            Continue where you left off, or start a new conversation?
          </button>
        )}
      </p>

      {/* 3. Divider */}
      <div className="my-5 h-px w-full bg-[rgba(11,27,51,0.10)]" />

      {/* 4. Behavioral row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-base text-[#0B1B33]">Behavioral assessment</h3>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#7C93B5]">
            Powered by PRISM
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={onRequestAssessment}
            className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
          >
            <CalendarDays className="size-4" />
            Request PRISM Inventory
          </Button>
          {hasReport ? (
            <Button
              type="button"
              variant="outline"
              onClick={onViewReportPdf}
              className={cn("border-[rgba(11,27,51,0.10)] text-[#0B1B33]")}
            >
              <FileText className="size-4" />
              View Inventory PDF
            </Button>
          ) : null}
        </div>
      </div>

      {prismLoading ? (
        <p className="mt-3 text-[13px] text-[#4b5f80]">Checking your latest report…</p>
      ) : hasReport ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 text-[13px] text-[#4b5f80]">
          <FileText className="size-3.5 shrink-0 text-[#7C93B5]" />
          <span className="min-w-0 truncate">Latest report: {reportFileName}</span>
        </div>
      ) : null}

      {/* 5. Complete-profile progress */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium text-[#0B1B33]">
            Complete profile ({pct}%)
          </span>
          <span className="font-serif text-[24px] leading-none text-[#0B1B33]">{pct}%</span>
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

      {/* 6. Divider */}
      <div className="my-5 h-px w-full bg-[rgba(11,27,51,0.10)]" />

      {/* 7. Additional assessments + Additional Personal Info */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="text-[13px] font-semibold text-[#0B1B33]">
            Additional assessments
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {assessments.map((a) => (
              <CompletionRow
                key={a.name}
                name={a.name}
                done={a.done}
                onAdd={onAddAssessment}
              />
            ))}
          </ul>
        </div>

        <div className="md:col-span-1">
          <div className="text-[13px] font-semibold text-[#0B1B33]">
            Additional Personal Info
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {personalInfo.map((p) => (
              <CompletionRow
                key={p.name}
                name={p.name}
                done={p.done}
                onAdd={onAddPersonalInfo}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
