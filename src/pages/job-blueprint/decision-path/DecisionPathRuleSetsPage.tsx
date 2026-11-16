import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  decisionPathErrorMessage,
  useActivateRuleSet,
  useDecisionPathStatus,
  useDecisionRuleSets,
  useNewRuleSetVersion,
} from "@/hooks/job-blueprint/useDecisionPath"
import { RuleSetEditor } from "@/components/job-blueprint/decision-path/RuleSetEditor"
import { JobDnaCardSurface, JobDnaEmptyState, JobDnaLoading, JobDnaPageHeader } from "../_shared"
import type { DecisionRuleSet } from "@/types/job-blueprint"

/**
 * The organisation's rule sets (recruiting staff only). A draft is edited and
 * activated; an active version is frozen, and a change starts a new version,
 * which retires the old one when it is activated.
 */
export default function DecisionPathRuleSetsPage() {
  const { t } = useTranslation("jobBlueprintPages")
  const status = useDecisionPathStatus()
  const staff = !!status?.staff
  const sets = useDecisionRuleSets(staff)
  const activate = useActivateRuleSet()
  const newVersion = useNewRuleSetVersion()
  const [editing, setEditing] = useState<DecisionRuleSet | "new" | null>(null)

  if (!status || !staff) {
    return (
      <div className="max-w-4xl">
        <JobDnaEmptyState>{t("ruleSets.staffOnly", { defaultValue: "Rule sets are managed by your organisation's recruiting staff." })}</JobDnaEmptyState>
      </div>
    )
  }

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast.success(ok)
    } catch (err) {
      toast.error(decisionPathErrorMessage(err, t("ruleSets.actionFailed", { defaultValue: "That did not work." })))
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <JobDnaPageHeader
        icon={ListChecks}
        title={t("ruleSets.title", { defaultValue: "Rule sets" })}
        description={t("ruleSets.description", { defaultValue: "Your organisation's written minimum standard, as rules. Each version is frozen when activated." })}
        action={<Button onClick={() => setEditing("new")}>{t("ruleSets.new", { defaultValue: "New rule set" })}</Button>}
      />
      {editing ? (
        <JobDnaCardSurface>
          <RuleSetEditor
            status={status}
            draft={editing === "new" ? null : editing}
            onSaved={() => setEditing(null)}
          />
        </JobDnaCardSurface>
      ) : null}
      {sets.isLoading ? (
        <JobDnaLoading label={t("ruleSets.loading", { defaultValue: "Loading rule sets…" })} />
      ) : (sets.data ?? []).length === 0 ? (
        <JobDnaEmptyState>{t("ruleSets.none", { defaultValue: "No rule sets yet." })}</JobDnaEmptyState>
      ) : (
        (sets.data ?? []).map((rs) => (
          <JobDnaCardSurface key={rs.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-[#1f2937]">
                  {t("ruleSets.versionLine", { defaultValue: "{{name}} — version {{version}} ({{status}})", name: rs.name, version: rs.version, status: rs.status })}
                </p>
                <p className="text-xs text-[#6b7280]">
                  {t("ruleSets.summaryLine", { defaultValue: "{{rules}} rules · decision-makers: {{makers}}", rules: rs.rules.length, makers: rs.decisionMakers.map((d) => d.name).join(", ") })}
                </p>
              </div>
              <div className="flex gap-2">
                {rs.status === "draft" ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(rs)}>
                      {t("ruleSets.editDraft", { defaultValue: "Edit draft" })}
                    </Button>
                    <Button
                      onClick={() =>
                        void act(() => activate.mutateAsync(rs.id), t("ruleSets.activated", { defaultValue: "Activated." }))
                      }
                    >
                      {t("ruleSets.activate", { defaultValue: "Activate" })}
                    </Button>
                  </>
                ) : rs.status === "active" ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void act(() => newVersion.mutateAsync(rs.id), t("ruleSets.newVersionStarted", { defaultValue: "New draft version started." }))
                    }
                  >
                    {t("ruleSets.newVersion", { defaultValue: "Start a new version" })}
                  </Button>
                ) : null}
              </div>
            </div>
            <ul className="mt-2 list-disc pl-5 text-xs text-[#374151]">
              {rs.rules.map((r) => (
                <li key={r.id}>
                  {t("ruleSets.ruleLine", { defaultValue: "{{label}} — {{source}} ({{outcome}})", label: r.label, source: r.sourceRef, outcome: r.onFail === "none" ? t("ruleSets.routeOnly", { defaultValue: "route only" }) : t("ruleSets.ifNotMet", { defaultValue: "{{onFail}} if not met", onFail: r.onFail }) })}
                </li>
              ))}
            </ul>
          </JobDnaCardSurface>
        ))
      )}
    </div>
  )
}
