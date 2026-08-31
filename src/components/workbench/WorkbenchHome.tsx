import { Link } from "react-router-dom"
import { AlertTriangle } from "lucide-react"

import { V2Card, V2Panel, SectionLabel } from "@/components/v2"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { WorkbenchConfig, WorkbenchListPanel, WorkbenchPerson } from "./types"

/**
 * The shared manager / practitioner Workbench home.
 *
 * One component, two roles — see `types.ts` for why. Everything role-specific
 * arrives as config; nothing here branches on `role` except the hero chrome,
 * which is the only thing the two wireframes actually disagree about.
 *
 * ## The rules this surface keeps
 *
 * **Loading, error and empty are three states.** A failed fetch rendered as an
 * empty roster tells a manager their people have done nothing — a fabricated
 * and alarming claim about real students. Each gets its own branch and words.
 *
 * **A number we did not measure is never 0.** `value: null` renders as an em
 * dash with an explanation. Zero means "we counted, and it was none"; the dash
 * means "we have no measurement". On a roster those are opposite facts about a
 * person.
 *
 * **People with no name on file sort last.** The natural key sorts the empty
 * string ahead of every real name, putting the least identifiable person at the
 * top — the same defect fixed in the student roster ordering.
 */
export function WorkbenchHome(config: WorkbenchConfig) {
  const { isLoading, error, onRetry } = config

  return (
    <V2Panel>
      <Hero config={config} />

      {isLoading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorBody error={error} onRetry={onRetry} />
      ) : (
        <>
          <StatRow stats={config.stats} />
          <ListPanel panel={config.upcoming} />
          <ListPanel panel={config.attention} />
        </>
      )}
    </V2Panel>
  )
}

function Hero({ config }: { config: WorkbenchConfig }) {
  const actions = config.actions ?? []

  if (config.hero === "gradient") {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-[#2E5BFF] to-[#2BC3B4] p-6 text-white">
        <h1 className="font-serif text-[26px] leading-tight tracking-tight">
          {config.greeting}
        </h1>
        <p className="mt-1 text-sm text-white/90">{config.subtitle}</p>
        {actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.label}
                asChild
                size="sm"
                className={cn(
                  a.variant === "primary"
                    ? "bg-white/25 text-white hover:bg-white/35"
                    : "bg-transparent text-white ring-1 ring-inset ring-white/60 hover:bg-white/15",
                )}
              >
                <Link to={a.to}>{a.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-[26px] leading-tight tracking-tight text-ink">
        {config.greeting}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{config.subtitle}</p>
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              asChild
              size="sm"
              variant={a.variant === "primary" ? "default" : "outline"}
            >
              <Link to={a.to}>{a.label}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ stats }: { stats: WorkbenchConfig["stats"] }) {
  if (stats.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <V2Card key={s.key} className="p-4">
          <SectionLabel>{s.label}</SectionLabel>
          <p
            className={cn(
              "mt-1 font-serif text-[30px] leading-none",
              s.tone === "alert" ? "text-red-600" : "text-ink",
            )}
          >
            {s.value === null ? (
              <span
                className="text-muted-foreground"
                title="Not measured — this is not a count of zero."
              >
                &mdash;
              </span>
            ) : (
              s.value
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
        </V2Card>
      ))}
    </div>
  )
}

/** Nameless people sort last. See the module note. */
function orderRows(rows: WorkbenchPerson[]): WorkbenchPerson[] {
  return [...rows].sort((a, b) => {
    const an = (a.name ?? "").trim()
    const bn = (b.name ?? "").trim()
    if (Boolean(an) !== Boolean(bn)) return an ? -1 : 1
    return an.toLowerCase().localeCompare(bn.toLowerCase())
  })
}

function ListPanel({ panel }: { panel: WorkbenchListPanel }) {
  const rows = orderRows(panel.rows)
  return (
    <V2Card className="p-0">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-serif text-lg text-ink">{panel.title}</h2>
        {panel.action && (
          <Button asChild variant="outline" size="sm">
            <Link to={panel.action.to}>{panel.action.label}</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-border/60 px-5 py-6 text-sm text-muted-foreground">
          {panel.emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={r.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {r.name ?? (
                    <span className="text-muted-foreground">Name not on file</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
              </div>
              {r.badge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs",
                    r.badgeTone === "warn"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-800",
                  )}
                >
                  {r.badge}
                </span>
              )}
              <Button asChild size="sm" className="shrink-0">
                <Link to={r.href}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </V2Card>
  )
}

function Avatar({ name }: { name: string | null }) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-white"
    >
      {initials || "?"}
    </span>
  )
}

function LoadingBody() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading workbench">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

function ErrorBody({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-900">
            Your workbench could not be loaded.
          </p>
          <p className="text-sm text-red-800">
            {(error as Error)?.message ?? "The service did not respond."} This is
            an error, not an empty roster &mdash; nothing on this screen should be
            read as a statement about the people you work with.
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Exported for the tests that assert the ordering rule directly. */
export const __testables = { orderRows }

export default WorkbenchHome
