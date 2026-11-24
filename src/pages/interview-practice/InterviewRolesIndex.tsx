/**
 * /interview-practice/roles — public index of the per-occupation Interview
 * Practice role guides. Lists every generated role page and funnels into the
 * coach.
 */
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useSeo } from "@/hooks/useSeo"
import RolePageShell from "@/components/interview/RolePageShell"
import { ROLE_PAGE_INDEX } from "@/types/interviewRolePage"

export default function InterviewRolesIndex() {
  const { t } = useTranslation("interviewPages")
  useSeo({
    title: t("rolesIndex.seoTitle", "Interview Practice by Role — Questions & Prep Guides | InspiresGenius"),
    description: t("rolesIndex.seoDescription", "Free AI interview practice for dozens of roles. Pick your occupation for role-specific questions, STAR-method feedback, and a scored write-up."),
    canonical: `${window.location.origin}${ROUTES.INTERVIEW_PRACTICE_ROLES}`,
  })

  return (
    <RolePageShell>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("rolesIndex.heading", "Practice interviews by role")}</h1>
        <p className="mt-3 text-lg text-slate-600">
          {t("rolesIndex.intro", "Pick your role for role-specific questions and instant STAR-method feedback, or jump straight into practice.")}
        </p>
        <div className="mt-5">
          <Button asChild size="lg">
            <Link to={ROUTES.INTERVIEW_PRACTICE}>{t("rolesIndex.startPracticing", "Start practicing")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_PAGE_INDEX.map((role) => (
          <li key={role.slug}>
            <Link
              to={role.path}
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              {role.title}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-slate-400">
        {t("rolesIndex.footnote", { defaultValue: "{{total}} roles · wage & outlook figures are planning references, not offers.", total: ROLE_PAGE_INDEX.length })}
      </p>
    </RolePageShell>
  )
}
