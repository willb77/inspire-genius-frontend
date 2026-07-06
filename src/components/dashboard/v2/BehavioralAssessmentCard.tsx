import type { JSX } from "react"
import { CalendarDays, ClipboardCheck, FileCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AssessmentTone = "none" | "pending" | "active" | "error"

interface BehavioralAssessmentCardProps {
  statusLabel: string
  tone: AssessmentTone
  lastReportLabel: string
  hasReport: boolean
  surveyDisabled?: boolean
  loading?: boolean
  onViewReport: () => void
  onRequestSurvey: () => void
}

const TONE_PILL: Record<AssessmentTone, string> = {
  none: "bg-[rgba(124,147,181,0.15)] text-[#4b5f80]",
  pending: "bg-[rgba(232,147,43,0.16)] text-[#C9711A]",
  active: "bg-[rgba(91,138,114,0.16)] text-[#3E6B55]",
  error: "bg-[rgba(194,97,79,0.16)] text-[#C2614F]",
}

export function BehavioralAssessmentCard({
  statusLabel,
  tone,
  lastReportLabel,
  hasReport,
  surveyDisabled = false,
  loading = false,
  onViewReport,
  onRequestSurvey,
}: BehavioralAssessmentCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(29,58,102,0.10)]">
          <ClipboardCheck className="size-5 text-[#1D3A66]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base text-[#0B1B33]">
            Behavioral assessment
            <span className="ml-2 text-[13px] font-normal text-[#7C93B5]">
              PRISM
            </span>
          </h3>
          <div className="mt-2">
            {loading ? (
              <span className="inline-flex items-center rounded-full bg-[rgba(124,147,181,0.15)] px-3 py-1 text-xs font-medium text-[#7C93B5]">
                Loading…
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                  TONE_PILL[tone]
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] text-[#4b5f80]">
        <CalendarDays className="size-3.5 shrink-0 text-[#7C93B5]" />
        <span>{lastReportLabel}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onRequestSurvey}
          disabled={surveyDisabled}
          className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
        >
          Request survey
        </Button>
        {hasReport ? (
          <Button
            type="button"
            variant="outline"
            onClick={onViewReport}
            className="border-[rgba(11,27,51,0.10)] text-[#0B1B33]"
          >
            <FileCheck className="size-4" />
            View PRISM report
          </Button>
        ) : null}
        <span className="text-xs text-[#7C93B5]">~15 min</span>
      </div>
    </div>
  )
}
