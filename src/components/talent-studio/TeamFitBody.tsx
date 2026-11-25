/**
 * Team fit (TS-4a) — the role matches team members already have, for the
 * people the viewer already has in Team Development Studio.
 *
 * What it is: a read-only view of two existing reads.
 *
 *   1. The Team Development Studio roster (ONE request), for the list of
 *      people. Only the name and job title are drawn from it.
 *   2. growth-service's fit-matches for one member, requested ONLY when the
 *      viewer opens that member's row (`TeamFitMemberMatches`). The read is per
 *      member and there is no roster-wide form of it, so the page does not
 *      fan out: opening the page asks for nobody's matches.
 *
 * What it is not: by default it scores nobody. A match exists only because the
 * member opened their own Career Fit, and it is shown only when the member's
 * sharing covers it. The server decides both; nothing here widens what it
 * returns.
 *
 * TS-4b adds one exception, off by default: where the server switch
 * `manager_fit_on_demand` is on for a member's organisation, an opened row also
 * offers "score against a role" (`TeamFitOnDemand`). With the switch off, or a
 * backend without the route, that component draws nothing and this page is
 * exactly TS-4a.
 *
 * `audience` is set by the ROUTE (ROLE-C). The member link must sit under the
 * prefix the page was opened on: ProtectedRoute gates by path prefix, and a
 * practitioner sent to /manager/* is bounced to their home page.
 *
 * The page is offered only with `job_fit_v2` on and the build's Team fit flags
 * on, the same gate as its menu row. Opened directly with either off, it says
 * so and requests nothing.
 */
import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { TEAM_FIT_BUILD_ENABLED, TEAM_FIT_PAGE_SIZE } from "@/constants/teamFit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { translateNavLabel } from "@/components/shared/layout/navLabels"
import { useSavedJobsEnabledStatus } from "@/hooks/job-fit/useSavedJobs"
import { useTeamDevelopmentRoster } from "@/hooks/manager/development/useTeamDevelopmentRoster"
import type { WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import type { RosterMember } from "@/types/development"
import TeamFitMemberMatches from "./TeamFitMemberMatches"
import TeamFitOnDemand from "./TeamFitOnDemand"

const K = "talentStudio.teamFit"

/** The audience's own Team Development Studio routes. Never the other role's. */
function studioRoutes(audience: WorkspaceAudience): { roster: string; member: string } {
  return audience === "practitioner"
    ? { roster: ROUTES.PRACTITIONER.DEVELOPMENT, member: ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER }
    : { roster: ROUTES.MANAGER.DEVELOPMENT, member: ROUTES.MANAGER.DEVELOPMENT_MEMBER }
}

function MemberRow({
  member,
  memberRoute,
  onOnDemandOffered,
}: {
  member: RosterMember
  memberRoute: string
  onOnDemandOffered: () => void
}) {
  const { t } = useTranslation("shellUi")
  const [open, setOpen] = useState(false)
  const name = member.name
  const panelId = `team-fit-matches-${member.memberId}`
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {member.title && <p className="truncate text-xs text-muted-foreground">{member.title}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={
              open
                ? t(`${K}.hideMatchesFor`, { defaultValue: "Hide matches for {{name}}", name })
                : t(`${K}.showMatchesFor`, { defaultValue: "Show matches for {{name}}", name })
            }
            onClick={() => setOpen((v) => !v)}
          >
            <Chevron className="size-4 shrink-0" aria-hidden="true" />
            {open
              ? t(`${K}.hideMatches`, { defaultValue: "Hide matches" })
              : t(`${K}.showMatches`, { defaultValue: "Show matches" })}
          </Button>
          <Link
            to={memberRoute.replace(":memberId", encodeURIComponent(member.memberId))}
            aria-label={t(`${K}.openMemberFor`, {
              defaultValue: "Open {{name}} in Team Development Studio",
              name,
            })}
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            {t(`${K}.openMember`, { defaultValue: "Open in Team Development Studio" })}
          </Link>
        </div>
      </div>
      {/* Mounted only when opened: this is what makes the request. */}
      <div id={panelId} className={open ? "mt-3" : undefined}>
        {open && <TeamFitMemberMatches memberId={member.memberId} memberName={name} />}
        {/* TS-4b: draws nothing unless the server offers scoring for this member. */}
        {open && <TeamFitOnDemand memberId={member.memberId} memberName={name} onOffered={onOnDemandOffered} />}
      </div>
    </li>
  )
}

function TeamFitRoster({
  audience,
  onOnDemandOffered,
}: {
  audience: WorkspaceAudience
  onOnDemandOffered: () => void
}) {
  const { t } = useTranslation("shellUi")
  const routes = studioRoutes(audience)
  const { data: roster, isLoading, isError, isFetching, refetch } = useTeamDevelopmentRoster()
  const [search, setSearch] = useState("")
  const [shown, setShown] = useState(TEAM_FIT_PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = roster ?? []
    if (!q) return rows
    return rows.filter((m) => m.name.toLowerCase().includes(q) || (m.title ?? "").toLowerCase().includes(q))
  }, [roster, search])

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t(`${K}.rosterLoading`, { defaultValue: "Loading your team…" })}
      </p>
    )
  }

  // A failed roster is a failure, not an empty team.
  if (isError || !roster) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      >
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {t(`${K}.rosterError`, {
            defaultValue: "Your team could not be loaded. This is a loading problem, not an empty team.",
          })}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {t(`${K}.retry`, { defaultValue: "Try again" })}
        </Button>
      </div>
    )
  }

  if (roster.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p>
          {t(`${K}.rosterEmpty`, {
            defaultValue: "You have no team members in Team Development Studio yet. Add them there first.",
          })}
        </p>
        <Link to={routes.roster} className="mt-2 inline-block text-primary underline-offset-4 hover:underline">
          {t(`${K}.openStudio`, { defaultValue: "Open Team Development Studio" })}
        </Link>
      </div>
    )
  }

  const visible = filtered.slice(0, shown)
  const searchLabel = t(`${K}.search`, { defaultValue: "Search team members" })
  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setShown(TEAM_FIT_PAGE_SIZE)
        }}
        placeholder={searchLabel}
        aria-label={searchLabel}
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(`${K}.noSearchResults`, { defaultValue: "No team member matches that search." })}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <MemberRow
              key={m.memberId}
              member={m}
              memberRoute={routes.member}
              onOnDemandOffered={onOnDemandOffered}
            />
          ))}
        </ul>
      )}
      {filtered.length > visible.length && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setShown((n) => n + TEAM_FIT_PAGE_SIZE)}
        >
          {t(`${K}.showMore`, {
            defaultValue: "Show more ({{remaining}} left)",
            remaining: filtered.length - visible.length,
          })}
        </Button>
      )}
    </div>
  )
}

export default function TeamFitBody({ audience }: { audience: WorkspaceAudience }) {
  const { t } = useTranslation("shellUi")
  const status = useSavedJobsEnabledStatus()
  const on = TEAM_FIT_BUILD_ENABLED && status === "on"
  // TS-4b: true once the server has offered on-demand scoring for a member the
  // viewer opened. Until then nothing can be scored here and the intro says so.
  const [onDemandOffered, setOnDemandOffered] = useState(false)
  const offered = useCallback(() => setOnDemandOffered(true), [])

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={translateNavLabel(t, "items", "Team fit")}
        description={
          onDemandOffered
            ? t(`${K}.introOnDemand`, {
                defaultValue:
                  "The role matches your team members found for themselves, shown only where they have shared them with you. Where it is switched on, you can also score a member against a role you choose. A record is kept and the member is told.",
              })
            : t(`${K}.intro`, {
                defaultValue:
                  "The role matches your team members found for themselves, shown only where they have shared them with you. Nothing is scored here.",
              })
        }
      />
      {on ? (
        <>
          <p className="mb-4 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {t(`${K}.advisory`, {
              defaultValue:
                "A match score is one input for a development conversation. It is not a hiring, pay or performance decision.",
            })}
          </p>
          <TeamFitRoster audience={audience} onOnDemandOffered={offered} />
        </>
      ) : TEAM_FIT_BUILD_ENABLED && status === "loading" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t(`${K}.rosterLoading`, { defaultValue: "Loading your team…" })}
        </p>
      ) : (
        <p data-team-fit-state="off" className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          {t(`${K}.notOn`, { defaultValue: "Team fit is not switched on for your organization." })}
        </p>
      )}
    </div>
  )
}
