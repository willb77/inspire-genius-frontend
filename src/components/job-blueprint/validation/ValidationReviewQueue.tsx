import { useState } from "react"
import DataCard from "@/components/dashboard/DataCard"
import {
  useAwaitingValidation,
  useRationale,
  useValidationEnabled,
} from "@/hooks/job-blueprint/useBlueprintValidation"
import type { AwaitingValidation } from "@/types/job-blueprint"
import { RationaleExportButton } from "./BlueprintValidationPanel"
import { VerdictForm } from "./ValidationForms"

function ReviewItem({ item }: { item: AwaitingValidation }) {
  const [open, setOpen] = useState(false)
  const { data: report, isLoading, isError } = useRationale(item.blueprintId, open)
  const dims = (report?.dimensions ?? []).map((d) => ({
    key: `${d.category}:${d.dimensionId}`,
    label: d.dimensionName,
  }))
  return (
    <div className="border-b border-[#f3f4f6] py-2.5">
      <button
        className="w-full text-left text-[13px]"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-medium text-[#111827]">{item.roleTitle}</span>
        <span className="text-[#6b7280]">
          {" "}
          · v{item.version} · asked by {item.requestedBy} on {item.requestedAt.slice(0, 10)}
        </span>
      </button>
      {item.note ? <p className="mt-1 text-xs text-[#6b7280]">“{item.note}”</p> : null}
      {open ? (
        <div className="mt-3 space-y-3">
          {isLoading ? <p className="text-xs text-[#6b7280]">Loading the benchmark…</p> : null}
          {isError ? (
            <p role="alert" className="text-xs text-red-600">
              Could not load this role&apos;s benchmark.
            </p>
          ) : null}
          {report ? (
            <table className="w-full text-xs" data-testid="review-dimensions">
              <thead>
                <tr className="text-left text-[#6b7280]">
                  <th className="py-1">Dimension</th>
                  <th>Target</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {report.dimensions.map((d) => (
                  <tr key={`${d.category}:${d.dimensionId}`}>
                    <td className="py-0.5">
                      {d.categoryLabel} — {d.dimensionName}
                    </td>
                    <td>{d.targetPercent}%</td>
                    <td>{d.importanceTier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <RationaleExportButton blueprintId={item.blueprintId} />
          <VerdictForm blueprintId={item.blueprintId} dims={dims} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * N-4 — the reviewer's screen: roles whose open validation request names the
 * signed-in manager. Renders nothing when the `blueprint_validation` switch is
 * off for the caller or nothing is waiting, so the page is otherwise unchanged.
 */
export function ValidationReviewQueue() {
  const enabled = useValidationEnabled()
  const { data } = useAwaitingValidation(enabled)
  if (!enabled || !data?.length) return null
  return (
    <div className="mb-5" data-testid="validation-review-queue">
      <DataCard title="Awaiting your validation" badge={data.length}>
        {data.map((item) => (
          <ReviewItem key={item.blueprintId} item={item} />
        ))}
      </DataCard>
    </div>
  )
}
