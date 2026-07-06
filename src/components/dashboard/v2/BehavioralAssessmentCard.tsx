import type { JSX } from "react"
import { CalendarDays, ClipboardCheck, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BehavioralAssessmentCardProps {
  hasReport: boolean
  reportFileName?: string
  loading?: boolean
  onRequestAssessment: () => void
  onViewReportPdf: () => void
}

export function BehavioralAssessmentCard({
  hasReport,
  reportFileName,
  loading = false,
  onRequestAssessment,
  onViewReportPdf,
}: BehavioralAssessmentCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(29,58,102,0.10)]">
          <ClipboardCheck className="size-5 text-[#0B1B33]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B5]">
            Powered by PRISM
          </p>
          <h3 className="font-serif text-base text-[#0B1B33]">
            Behavioral assessment
          </h3>
        </div>
        <div className="shrink-0">
          {loading ? (
            <span className="inline-flex items-center rounded-full bg-[rgba(124,147,181,0.15)] px-3 py-1 text-xs font-medium text-[#4b5f80]">
              Loading…
            </span>
          ) : hasReport ? (
            <span className="inline-flex items-center rounded-full bg-[rgba(91,138,114,0.16)] px-3 py-1 text-xs font-medium text-[#3E6B55]">
              Report ready
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[rgba(124,147,181,0.15)] px-3 py-1 text-xs font-medium text-[#4b5f80]">
              No assessment yet
            </span>
          )}
        </div>
      </div>

      {hasReport ? (
        <div className="mt-4 flex min-w-0 items-center gap-2 text-[13px] text-[#4b5f80]">
          <FileText className="size-3.5 shrink-0 text-[#7C93B5]" />
          <span className="min-w-0 truncate">
            Latest report: {reportFileName}
          </span>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onRequestAssessment}
          className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
        >
          <CalendarDays className="size-4" />
          Request an Assessment
        </Button>
        {hasReport ? (
          <Button
            type="button"
            variant="outline"
            onClick={onViewReportPdf}
            className={cn(
              "border-[rgba(11,27,51,0.10)] text-[#0B1B33]"
            )}
          >
            <FileText className="size-4" />
            View Report PDF
          </Button>
        ) : null}
      </div>
    </div>
  )
}
