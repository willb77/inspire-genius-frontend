import { useState } from "react"
import { cn } from "@/lib/utils"
import { withPrism } from "@/lib/withPrism"
import { TeamViewComparePanel } from "@/components/manager/development/tabs/TeamComparePanel"
import { TeamViewScenarioPanel } from "@/components/manager/development/tabs/TeamScenarioPanel"
import { useTranslation } from "react-i18next"

/**
 * U5 — the Studio's Team view: Compare and Scenarios, picking people from the
 * roster rather than from one person's page.
 *
 * Mounted by DevelopmentStudio only when `TDS_STUDIO_ENABLED` is on, which is
 * the same flag that offers Compare and Scenarios on a person's page. That is a
 * UI gate, not a security boundary (see TDS_STUDIO_ENABLED).
 *
 * Who can be picked is `useTeamCast`: people whose PRISM is shared with the
 * caller, per the roster's server `sharing` field. Runs kept on a person's page
 * before this view existed stay there, untouched (decision D2).
 */
export function TeamStudioView() {
  const { t } = useTranslation("managerPages")
  const [tool, setTool] = useState<"compare" | "scenarios">("compare")

  const pill = (value: "compare" | "scenarios", label: string) => (
    <button
      type="button"
      onClick={() => setTool(value)}
      aria-pressed={tool === value}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition",
        tool === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {label}
    </button>
  )

  return (
    <section className="space-y-4" data-testid="team-studio-view">
      <div className="space-y-1">
        <p className="text-sm text-slate-600">
          {withPrism(
            t("teamStudioView.subtitle", { defaultValue: "Compare people and try scenarios across your roster. Only people who share their PRISM with you can be picked." }),
          )}
        </p>
        <p className="text-xs text-slate-500">
          {t("teamStudioView.earlierRuns", { defaultValue: "Comparisons and scenarios kept on a person's page before this view stay on that person's page." })}
        </p>
      </div>
      <div
        className="flex w-fit items-center rounded-full border p-0.5"
        role="group"
        aria-label={t("teamStudioView.toolLabel", { defaultValue: "Team tool" })}
      >
        {pill("compare", t("teamStudioView.compare", { defaultValue: "Compare" }))}
        {pill("scenarios", t("teamStudioView.scenarios", { defaultValue: "Scenarios" }))}
      </div>
      {tool === "compare" ? <TeamViewComparePanel /> : <TeamViewScenarioPanel />}
    </section>
  )
}

export default TeamStudioView
