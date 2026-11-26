import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { UserRole } from "@/types/roles"
import { translateNavLabel } from "@/components/shared/layout/navLabels"
import { isVerticalTab, useTalentStudioStageTabsHere } from "@/hooks/nav/useToolsSection"
import { cn } from "@/lib/utils"

/**
 * RM-7 (2026-11-26, Bill's RM-D5) — the tabs of a Talent Studio stage page.
 *
 * The hub pattern of the super-admin PRISM and Usage pages (`AdminHub`): each
 * tab IS an existing route, and the page that owns the route renders this strip
 * above its own content. No route is added, removed or redirected, and only the
 * open tab's page loads its data, exactly as visiting it does today.
 *
 * The tabs are the stage's rows from `talentStudioStages`, the same list the
 * menu and the Overview page read, so a tab cannot reach anything the role's
 * menu does not. Renders nothing unless `job_fit_v2` is on, the page is a tab
 * of a stage with two or more tabs, and the role has the group.
 *
 * `role` is the role whose chrome the page renders (the route's audience on the
 * shared manager/practitioner pages), never read from the signed-in user.
 */
export default function TalentStudioStageTabs({ role }: { role: UserRole }) {
  const { pathname, search } = useLocation()
  const view = useTalentStudioStageTabsHere(role)
  const { t } = useTranslation("shellUi")
  if (!view) return null
  const stage = translateNavLabel(t, "items", view.label)

  return (
    <nav
      aria-label={t("talentStudio.tabs.aria", { defaultValue: "{{stage}} pages", stage })}
      className="mx-auto flex w-full max-w-6xl flex-wrap gap-1 border-b border-border px-4 pt-4 md:px-6"
    >
      {view.tabs.map((tab) => {
        const label = translateNavLabel(t, "items", tab.label)
        const isCurrent = tab === view.current
        const tabClass = "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors"
        if (tab.disabled && !isCurrent) {
          return (
            <span
              key={tab.to}
              aria-disabled="true"
              title={tab.disabledReason}
              className={cn(tabClass, "cursor-not-allowed border-transparent text-muted-foreground/50")}
            >
              {label}
            </span>
          )
        }
        return (
          <Link
            key={tab.to}
            // The open tab points at the address being shown, so a page that
            // carries a parameter (an open interview session) stays put.
            to={isCurrent ? `${pathname}${search}` : tab.to}
            aria-current={isCurrent ? "page" : undefined}
            title={
              !isCurrent && isVerticalTab(tab)
                ? t("talentStudio.tabs.leaves", { defaultValue: "Opens its own page" })
                : undefined
            }
            className={cn(
              tabClass,
              isCurrent ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
