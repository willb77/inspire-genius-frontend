import { useState } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("jobBlueprintPages")
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
          {t("queue.askedLine", { defaultValue: "· v{{version}} · asked by {{by}} on {{date}}", version: item.version, by: item.requestedBy, date: item.requestedAt.slice(0, 10) })}
        </span>
      </button>
      {item.note ? <p className="mt-1 text-xs text-[#6b7280]">“{item.note}”</p> : null}
      {open ? (
        <div className="mt-3 space-y-3">
          {isLoading ? <p className="text-xs text-[#6b7280]">{t("queue.loading", { defaultValue: "Loading the benchmark…" })}</p> : null}
          {isError ? (
            <p role="alert" className="text-xs text-red-600">
              {t("queue.loadFailed", { defaultValue: "Could not load this role's benchmark." })}
            </p>
          ) : null}
          {report ? (
            <table className="w-full text-xs" data-testid="review-dimensions">
              <thead>
                <tr className="text-left text-[#6b7280]">
                  <th className="py-1">{t("queue.col.dimension", { defaultValue: "Dimension" })}</th>
                  <th>{t("queue.col.target", { defaultValue: "Target" })}</th>
                  <th>{t("queue.col.tier", { defaultValue: "Tier" })}</th>
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
  const { t } = useTranslation("jobBlueprintPages")
  const enabled = useValidationEnabled()
  const { data } = useAwaitingValidation(enabled)
  if (!enabled || !data?.length) return null
  return (
    <div className="mb-5" data-testid="validation-review-queue">
      <DataCard title={t("queue.title", { defaultValue: "Awaiting your validation" })} badge={data.length}>
        {data.map((item) => (
          <ReviewItem key={item.blueprintId} item={item} />
        ))}
      </DataCard>
    </div>
  )
}
