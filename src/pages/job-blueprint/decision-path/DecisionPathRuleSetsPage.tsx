import { useState } from "react"
import { toast } from "sonner"
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
  const status = useDecisionPathStatus()
  const staff = !!status?.staff
  const sets = useDecisionRuleSets(staff)
  const activate = useActivateRuleSet()
  const newVersion = useNewRuleSetVersion()
  const [editing, setEditing] = useState<DecisionRuleSet | "new" | null>(null)

  if (!status || !staff) {
    return (
      <div className="max-w-4xl">
        <JobDnaEmptyState>Rule sets are managed by your organisation&apos;s recruiting staff.</JobDnaEmptyState>
      </div>
    )
  }

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast.success(ok)
    } catch (err) {
      toast.error(decisionPathErrorMessage(err, "That did not work."))
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <JobDnaPageHeader
        icon={ListChecks}
        title="Rule sets"
        description="Your organisation's written minimum standard, as rules. Each version is frozen when activated."
        action={<Button onClick={() => setEditing("new")}>New rule set</Button>}
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
        <JobDnaLoading label="Loading rule sets…" />
      ) : (sets.data ?? []).length === 0 ? (
        <JobDnaEmptyState>No rule sets yet.</JobDnaEmptyState>
      ) : (
        (sets.data ?? []).map((rs) => (
          <JobDnaCardSurface key={rs.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-[#1f2937]">
                  {rs.name} — version {rs.version} ({rs.status})
                </p>
                <p className="text-xs text-[#6b7280]">
                  {rs.rules.length} rules · decision-makers: {rs.decisionMakers.map((d) => d.name).join(", ")}
                </p>
              </div>
              <div className="flex gap-2">
                {rs.status === "draft" ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(rs)}>
                      Edit draft
                    </Button>
                    <Button onClick={() => void act(() => activate.mutateAsync(rs.id), "Activated.")}>Activate</Button>
                  </>
                ) : rs.status === "active" ? (
                  <Button variant="outline" onClick={() => void act(() => newVersion.mutateAsync(rs.id), "New draft version started.")}>
                    Start a new version
                  </Button>
                ) : null}
              </div>
            </div>
            <ul className="mt-2 list-disc pl-5 text-xs text-[#374151]">
              {rs.rules.map((r) => (
                <li key={r.id}>
                  {r.label} — {r.sourceRef} ({r.onFail === "none" ? "route only" : `${r.onFail} if not met`})
                </li>
              ))}
            </ul>
          </JobDnaCardSurface>
        ))
      )}
    </div>
  )
}
