import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import {
  discoveryErrorMessage,
  useDegreePlan,
  useProgramSchools,
  useProgramSuggestions,
  useSaveProgramChoice,
} from "@/hooks/career-discovery/useCareerDiscovery"
import type {
  DiscoveryProgramSchools,
  DiscoveryProgramsCatalog,
  ProgramCard,
  ProgramComponent,
} from "@/types/career-discovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard } from "./DiscoveryParts"

/**
 * DISC-4: a school's own programs, inside Education paths. Rendered only when
 * the server's `/education` says `programsAvailable`. The server ranks and
 * explains every program; this page shows what it says and never re-orders it.
 * When the school has no published catalog, the server says so and the public
 * education paths below stand.
 */
export function ProgramsAtSchool() {
  const { t } = useTranslation("careerDiscoveryPages")
  const schools = useProgramSchools(true)
  if (schools.isLoading) return <DiscoveryLoading label={t("progFinding", "Finding school programs")} />
  if (schools.isError || !schools.data) {
    return <DiscoveryError message={discoveryErrorMessage(schools.error)} />
  }
  if (!schools.data.available) {
    return (
      <NoticeCard title={t("progAtYourSchool", "Programs at your school")}>
        <p>{schools.data.note}</p>
      </NoticeCard>
    )
  }
  return <SchoolPrograms schools={schools.data} />
}

/** The saved school, else the one school the server suggests, else none. */
function initialSchool(s: DiscoveryProgramSchools): string | null {
  if (s.chosenSchoolId) return s.chosenSchoolId
  const suggested = s.schools.filter((x) => x.suggested)
  return suggested.length === 1 ? suggested[0].id : null
}

function SchoolPrograms({ schools }: { schools: DiscoveryProgramSchools }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const [picked, setPicked] = useState<string | null>(null)
  const school = picked ?? initialSchool(schools)
  const list = useProgramSuggestions(school, school !== null)

  return (
    <section aria-labelledby="cd-programs-heading" className="space-y-4">
      <h2 id="cd-programs-heading" className="text-lg font-semibold">
        {t("progAtYourSchool", "Programs at your school")}
      </h2>
      {schools.schools.length === 0 ? (
        <p className="text-sm text-muted-foreground">{schools.note}</p>
      ) : (
        <label className="flex max-w-sm flex-col gap-1 text-sm">
          <span className="font-medium">{t("progYourSchool", "Your school")}</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={school ?? ""}
            onChange={(e) => setPicked(e.target.value || null)}
          >
            <option value="">{t("progChooseSchool", "Choose your school")}</option>
            {schools.schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.suggested ? ` ${t("progYourOrganisation", "(your organisation)")}` : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {t("progOnlyPublished", "Only schools that have published their catalog here are listed.")}
          </span>
        </label>
      )}
      {school === null ? null : list.isLoading ? (
        <DiscoveryLoading label={t("progRanking", "Ranking programs")} />
      ) : list.isError || !list.data ? (
        <DiscoveryError message={discoveryErrorMessage(list.error)} />
      ) : list.data.mode === "public_paths" ? (
        <NoticeCard title={t("progPublicPathsTitle", "Public education paths for now")}>
          <p>{list.data.note}</p>
        </NoticeCard>
      ) : (
        <ProgramList data={list.data} />
      )}
    </section>
  )
}

function ProgramList({ data }: { data: DiscoveryProgramsCatalog }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const save = useSaveProgramChoice()
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("progRankedBy", {
          defaultValue:
            "{{school}}, {{year}} catalog. Ranked by your Overall fit with the roles each program leads to, how well its career areas suit you, and your goals.",
          school: data.school.name ?? t("progThisSchool", "This school"),
          year: data.catalog.catalogYear,
        })}
      </p>
      {data.fit.available ? (
        data.fit.asOf ? (
          <p className="text-xs text-muted-foreground">
            {t("progFitAsOf", {
              defaultValue: "Fit as of your last Career Fit visit ({{date}}).",
              date: data.fit.asOf.slice(0, 10),
            })}
          </p>
        ) : null
      ) : (
        <p className="text-xs text-muted-foreground">{data.fit.reason}</p>
      )}
      {data.carriedForward ? (
        <NoticeCard title={t("progCarriedTitle", "Your choice moved to the new catalog")}>
          <p>{data.carriedForward.note}</p>
        </NoticeCard>
      ) : null}
      {save.isError ? <DiscoveryError message={discoveryErrorMessage(save.error)} /> : null}
      {data.chosenProgramId ? <DegreePlanLink /> : null}
      <ol className="space-y-3">
        {data.programs.map((p) => (
          <li key={p.id}>
            <ProgramItem
              program={p}
              chosen={data.chosenProgramId === p.id}
              saving={save.isPending}
              onChoose={() => save.mutate({ schoolId: data.school.id, programId: p.id })}
            />
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{data.socCodeNote}</p>
    </div>
  )
}

/**
 * DISC-5: a way into the degree plan once a program is chosen — shown only
 * when the server answers for it. A 403 (not switched on) or any failure
 * renders nothing here; the plan page itself says why.
 */
function DegreePlanLink() {
  const { t } = useTranslation("careerDiscoveryPages")
  const plan = useDegreePlan(true)
  if (!plan.data || !plan.data.available) return null
  return (
    <p className="text-sm">
      <Link className="font-medium underline" to={ROUTES.CAREER_DISCOVERY.DEGREE_PLAN}>
        {t("progSeeDegreePlan", "See your degree plan, term by term")}
      </Link>
    </p>
  )
}

function componentLine(t: TFunction, label: string, c: ProgramComponent, text: string): string {
  return t("progComponentLine", {
    defaultValue: "{{label}}: {{text}}",
    label,
    text: c.status === "scored" ? text : (c.reason ?? t("progNotAvailable", "not available")),
  })
}

function ProgramItem({
  program: p,
  chosen,
  saving,
  onChoose,
}: {
  program: ProgramCard
  chosen: boolean
  saving: boolean
  onChoose: () => void
}) {
  const { t } = useTranslation("careerDiscoveryPages")
  const { fit, affinity, goal } = p.components
  const facts = [
    p.credential,
    p.totalCredits !== null ? t("progCredits", { defaultValue: "{{credits}} credits", credits: p.totalCredits }) : null,
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {p.rank !== null ? `${p.rank}. ` : ""}
          {p.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {p.code}
          {facts ? ` · ${facts}` : ""}
          {p.rank === null && p.note ? ` · ${p.note}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{p.why}</p>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          <li>
            {componentLine(
              t,
              t("progOverallFit", "Overall fit"),
              fit,
              t("progFitWith", {
                defaultValue: "{{percent}}% with {{role}}",
                percent: Math.round(fit.score ?? 0),
                role: fit.role?.title ?? t("progItsRole", "its role"),
              })
            )}
          </li>
          <li>
            {componentLine(
              t,
              t("progCareerArea", "Career area"),
              affinity,
              t("progAffinity", {
                defaultValue: "{{percent}}% natural fit ({{family}})",
                percent: Math.round(affinity.score ?? 0),
                family: affinity.family ?? "",
              })
            )}
          </li>
          <li>
            {componentLine(
              t,
              t("progYourGoals", "Your goals"),
              goal,
              (goal.score ?? 0) > 0
                ? t("progGoalPointsHere", "one points here")
                : t("progGoalsPointElsewhere", "they point to other career areas")
            )}
          </li>
        </ul>
        {p.careers.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {p.careers.map((c, i) => (
              <li key={`${c.roleFamily}-${c.role?.id ?? i}`} className="rounded-full border px-2 py-0.5">
                {c.role?.title ?? c.roleFamily}
                {c.socCode ? ` · ${c.socCode}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <Button size="sm" variant={chosen ? "secondary" : "outline"} disabled={chosen || saving} onClick={onChoose}>
          {chosen ? t("progYourChoice", "Your choice") : t("progChooseProgram", "Choose this program")}
        </Button>
      </CardContent>
    </Card>
  )
}
