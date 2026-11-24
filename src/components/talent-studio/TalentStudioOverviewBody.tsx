/**
 * Talent Studio Overview (TS-2) — the stages of the Talent Studio group on one
 * page, each with links to the pages this role already has.
 *
 * Links only. It calls no API, shows no figures and nothing about any person.
 *
 * The rows come from `useTalentStudioStages`, the same list the sidebar group
 * is flattened from, so the page cannot offer a page the menu does not: a row
 * the role lacks is absent, and a row that is locked in the menu (a vertical
 * the person is not entitled to) is shown here as plain text with the same
 * reason, never as a link.
 *
 * `role` is set by the ROUTE, like `audience` on the shared workspace pages:
 * the links must sit under the prefix the page was opened on.
 */
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"
import type { UserRole } from "@/types/roles"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { translateNavLabel } from "@/components/shared/layout/navLabels"
import { TALENT_STUDIO_LABEL, useTalentStudioStages, type TalentStudioStageKey } from "@/hooks/nav/useToolsSection"

/** English defaults; the translations are `talentStudio.stages.*` in shellUi. */
const STAGE_COPY: Record<Exclude<TalentStudioStageKey, "overview">, { title: string; hint: string }> = {
  roles: { title: "Roles", hint: "Describe the role and what it asks for." },
  candidates: { title: "Candidates", hint: "Add candidates and see how they match the role." },
  interviews: { title: "Interviews", hint: "Prepare, run and review interviews." },
  insights: { title: "Insights", hint: "See how hiring is going across your roles." },
  retain: { title: "Retain", hint: "Keep what your experienced people know." },
}

export default function TalentStudioOverviewBody({ role }: { role: UserRole }) {
  const { t } = useTranslation("shellUi")
  const stages = useTalentStudioStages(role).filter((s) => s.key !== "overview")

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={TALENT_STUDIO_LABEL}
        description={t("talentStudio.intro", {
          defaultValue: "Find, interview and keep the people your team depends on. Each step opens a page you already have.",
        })}
      />
      <ol className="flex flex-col gap-4">
        {stages.map((stage, index) => {
          const copy = STAGE_COPY[stage.key as Exclude<TalentStudioStageKey, "overview">]
          const headingId = `talent-studio-stage-${stage.key}`
          return (
            <li key={stage.key}>
              <section aria-labelledby={headingId} className="rounded-lg border border-border bg-card p-4">
                <h2 id={headingId} className="text-base font-semibold text-foreground">
                  <span className="me-2 text-muted-foreground">{index + 1}.</span>
                  {t(`talentStudio.stages.${stage.key}.title`, { defaultValue: copy.title })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`talentStudio.stages.${stage.key}.hint`, { defaultValue: copy.hint })}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stage.rows.map((row) => {
                    const label = translateNavLabel(t, "items", row.label)
                    const Icon = row.icon
                    const shape = "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    const reason =
                      row.disabledReason ??
                      t("sidebar.notInPlan", { defaultValue: "{{label}} — not included in your plan", label })
                    return (
                      <li key={row.to}>
                        {row.disabled ? (
                          <span
                            className={`${shape} cursor-not-allowed border-border text-muted-foreground`}
                            title={reason}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            {label}
                            <Lock className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                            <span className="sr-only">{reason}</span>
                          </span>
                        ) : (
                          <Link
                            to={row.to}
                            state={row.state}
                            className={`${shape} border-border text-foreground hover:bg-accent hover:text-accent-foreground`}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            {label}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
