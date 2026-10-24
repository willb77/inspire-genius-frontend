import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ROUTES } from "@/constants/routes"
import {
  discoveryErrorMessage,
  isNotOffered,
  useDegreePlan,
  useSaveDegreePlanInputs,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { exportDegreePlanPdf } from "@/lib/exportDegreePlan"
import type { DegreePlanReady, PlanLoad, PlanSeason, PlanTerm } from "@/types/career-discovery"
import ComingNextPage from "./ComingNextPage"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

const LEAD =
  "Your chosen program, course by course and term by term: what's left, when you could finish, " +
  "where it leads and what it costs to get there. Built from your school's published catalog."

/**
 * DISC-5: the degree plan. The server builds every term, credit and refusal;
 * this page shows what it says and never re-orders it. When the server hasn't
 * switched the plan on (403), the page says so instead of failing.
 */
export default function DegreePlanPage() {
  const { journey } = useDiscoveryContext()
  const on = journey.stages.some((s) => s.id === "education" && s.available)
  if (!on) return <ComingNextPage stage="education" />
  return <DegreePlanView enabled={journey.mayProceed} />
}

function DegreePlanView({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError, error } = useDegreePlan(enabled)
  const header = <StageHeader title="Degree plan" lead={LEAD} />
  if (isLoading) return <DiscoveryLoading label="Building your degree plan" />
  if (isError || !data) {
    return (
      <div className="space-y-6">
        {header}
        {isNotOffered(error) ? (
          <NoticeCard title="Not switched on here yet">
            <p>{discoveryErrorMessage(error)}</p>
          </NoticeCard>
        ) : (
          <DiscoveryError message={discoveryErrorMessage(error)} />
        )}
      </div>
    )
  }
  if (data.plan === null) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title="No plan yet">
          <p>{data.note}</p>
          <Link className="underline" to={ROUTES.CAREER_DISCOVERY.EDUCATION}>
            Go to Education paths
          </Link>
        </NoticeCard>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {header}
      <PlanSettings data={data} />
      <PlanBody data={data} />
    </div>
  )
}

// ─── settings: the self-report checklist, load, start term ──────────────

const SEASONS: PlanSeason[] = ["fall", "spring", "summer"]

const settingsSchema = z
  .object({
    load: z.enum(["full_time", "part_time"]),
    creditsPerTerm: z.coerce.number(),
    season: z.enum(["fall", "spring", "summer"]),
    year: z.coerce.number().int(),
    summer: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const band = v.load === "part_time" ? { min: 6, max: 9 } : { min: 12, max: 15 }
    if (!(v.creditsPerTerm >= band.min && v.creditsPerTerm <= band.max)) {
      ctx.addIssue({
        code: "custom",
        path: ["creditsPerTerm"],
        message: `${v.load === "part_time" ? "Part-time" : "Full-time"} is ${band.min} to ${band.max} credits a term.`,
      })
    }
    if (v.season === "summer" && !v.summer) {
      ctx.addIssue({ code: "custom", path: ["season"], message: "Turn on summer terms to start in a summer." })
    }
  })
type SettingsIn = z.input<typeof settingsSchema>
type SettingsOut = z.output<typeof settingsSchema>

function seasonLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function PlanSettings({ data }: { data: DegreePlanReady }) {
  const save = useSaveDegreePlanInputs()
  const primary = data.inputs.programIds[0]
  const [completed, setCompleted] = useState<string[]>(data.checklist.filter((c) => c.completed).map((c) => c.id))
  const [extras, setExtras] = useState<string[]>(data.inputs.programIds.slice(1))
  const form = useForm<SettingsIn, unknown, SettingsOut>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      load: data.inputs.load,
      creditsPerTerm: data.inputs.creditsPerTerm,
      season: data.inputs.startTerm.season,
      year: data.inputs.startTerm.year,
      summer: data.inputs.summer,
    },
  })
  const errors = form.formState.errors
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const onSubmit = form.handleSubmit((v) =>
    save.mutate({
      completedCourseIds: completed,
      load: v.load as PlanLoad,
      creditsPerTerm: v.creditsPerTerm,
      startTerm: { season: v.season as PlanSeason, year: v.year },
      summer: v.summer,
      extraProgramIds: extras,
    })
  )
  const others = data.options.programs.filter((p) => p.id !== primary)
  const tooMany = extras.length > data.options.maxExtraPrograms

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What you've done and how you'll study</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Courses you've already completed</legend>
            <p className="text-xs text-muted-foreground">
              Tick what you've passed. Only the course is saved — no grades.
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {data.checklist.map((c) => (
                <li key={c.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={completed.includes(c.id)}
                      onChange={() => setCompleted((l) => toggle(l, c.id))}
                    />
                    <span>
                      <span className="font-medium">{c.code}</span> {c.title}
                      {c.credits !== null ? ` · ${c.credits} cr` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {data.inputs.droppedCompleted > 0 ? (
              <p className="text-xs text-muted-foreground">
                {data.inputs.droppedCompleted} course(s) you ticked before aren't in your school's newest catalog.
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dp-load">Load</Label>
              <select
                id="dp-load"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("load", {
                  onChange: (e) =>
                    form.setValue(
                      "creditsPerTerm",
                      data.options.loads[e.target.value as PlanLoad]?.default ?? 15
                    ),
                })}
              >
                <option value="full_time">
                  Full-time ({data.options.loads.full_time.min}–{data.options.loads.full_time.max} credits)
                </option>
                <option value="part_time">
                  Part-time ({data.options.loads.part_time.min}–{data.options.loads.part_time.max} credits)
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-credits">Credits a term</Label>
              <input
                id="dp-credits"
                type="number"
                step="1"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("creditsPerTerm")}
              />
              {errors.creditsPerTerm ? (
                <p className="text-sm text-destructive">{errors.creditsPerTerm.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-season">Start term</Label>
              <div className="flex gap-2">
                <select
                  id="dp-season"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("season")}
                >
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {seasonLabel(s)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Start year"
                  type="number"
                  className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("year")}
                />
              </div>
              {errors.season ? <p className="text-sm text-destructive">{errors.season.message}</p> : null}
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" {...form.register("summer")} />
              Take courses in summer terms too
            </label>
          </div>

          {others.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Also plan (up to {data.options.maxExtraPrograms})</legend>
              <p className="text-xs text-muted-foreground">
                A second program or a minor. Courses they share are planned once.
              </p>
              <ul className="space-y-1">
                {others.map((p) => (
                  <li key={p.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={extras.includes(p.id)}
                        onChange={() => setExtras((l) => toggle(l, p.id))}
                      />
                      {p.title} ({[p.credential, p.code].filter(Boolean).join(", ")})
                    </label>
                  </li>
                ))}
              </ul>
              {tooMany ? (
                <p className="text-sm text-destructive">
                  Choose at most {data.options.maxExtraPrograms} programs beside your main one.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {save.isError ? <DiscoveryError message={discoveryErrorMessage(save.error)} /> : null}
          <Button type="submit" disabled={save.isPending || tooMany}>
            Update my plan
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── the plan itself ────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function PlanBody({ data }: { data: DegreePlanReady }) {
  const plan = data.plan
  const [pdfError, setPdfError] = useState<string | null>(null)
  const download = () => {
    setPdfError(null)
    exportDegreePlanPdf(data).catch(() => setPdfError("The PDF couldn't be made. Try again."))
  }
  return (
    <>
      <section aria-labelledby="dp-summary" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="dp-summary" className="text-lg font-semibold">
            Your plan
          </h2>
          <Button size="sm" variant="outline" onClick={download}>
            Download PDF
          </Button>
        </div>
        {pdfError ? <DiscoveryError message={pdfError} /> : null}
        <p className="text-sm text-muted-foreground">
          {data.catalog.catalogYear} catalog ·{" "}
          {(plan.programs ?? []).map((p) => `${p.title ?? p.code} (${p.credential ?? ""})`).join(" + ")}
        </p>
        {plan.refused ? (
          <Card role="alert" className="border-destructive/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This plan can't be built yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>{plan.refused.statement}</p>
            </CardContent>
          </Card>
        ) : plan.alreadyComplete ? (
          <NoticeCard title="Nothing left to take">
            <p>Every course these programs name is done ({plan.creditsDone} credits).</p>
          </NoticeCard>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label="Credits done" value={String(plan.creditsDone ?? 0)} />
            <Stat label="Credits to go" value={String(plan.creditsLeft ?? 0)} />
            <Stat label="Expected to finish" value={plan.expectedCompletion?.label ?? "—"} />
          </dl>
        )}
      </section>

      {plan.refused ? null : (
        <section aria-label="Terms" className="space-y-3">
          {(plan.terms ?? []).map((t) => (
            <TermCard key={t.label} term={t} />
          ))}
          {(plan.notes ?? []).length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {(plan.notes ?? []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <Careers data={data} />
      <CostToFinishCard data={data} />
      <GapsCard data={data} />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  )
}

function TermCard({ term }: { term: PlanTerm }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {term.label}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {term.credits} credits{term.overLoad ? " · over your load" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {term.courses.length === 0 ? <p className="text-muted-foreground">{term.note}</p> : null}
        <ul className="space-y-2">
          {term.courses.map((c) => (
            <li key={c.code}>
              <p>
                <span className="font-medium">{c.code}</span> {c.title} · {c.credits} credits
              </p>
              <p className="text-xs text-muted-foreground">{c.whyNow}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Careers({ data }: { data: DegreePlanReady }) {
  if (data.careers.length === 0) {
    return (
      <NoticeCard title="Where it leads">
        <p>This program hasn't been linked to careers yet.</p>
      </NoticeCard>
    )
  }
  return (
    <section aria-labelledby="dp-careers" className="space-y-2">
      <h2 id="dp-careers" className="text-lg font-semibold">
        Where it leads
      </h2>
      {data.fit.available ? null : <p className="text-xs text-muted-foreground">{data.fit.reason}</p>}
      <ul className="space-y-1 text-sm">
        {data.careers.map((c, i) => (
          <li key={`${c.program}-${c.role?.id ?? c.roleFamily}-${i}`}>
            <span className="font-medium">{c.role?.title ?? c.roleFamily}</span>
            {c.socCode ? <span className="text-muted-foreground"> · {c.socCode}</span> : null}
            {c.overallFit !== null ? <span> · Overall fit {Math.round(c.overallFit)}%</span> : null}
            {c.prismFit !== null ? <span> · PRISM fit {Math.round(c.prismFit)}%</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{data.socCodeNote}</p>
    </section>
  )
}

function CostToFinishCard({ data }: { data: DegreePlanReady }) {
  const c = data.costToFinish
  return (
    <NoticeCard title="Cost to finish">
      {c.available ? (
        <>
          <p className="text-foreground">
            {c.terms === 0
              ? c.note
              : `${money(c.low)} to ${money(c.high)} after grants, over ${c.terms} term${c.terms === 1 ? "" : "s"}.`}
          </p>
          {c.basis ? <p className="text-xs">{c.basis}</p> : null}
          {c.note && c.terms > 0 ? <p className="text-xs">{c.note}</p> : null}
        </>
      ) : (
        <>
          <p>{c.note ?? "There's no cost to finish for this plan yet."}</p>
          {c.missingStatements.map((s) => (
            <p key={s} className="text-xs">
              {s}
            </p>
          ))}
        </>
      )}
    </NoticeCard>
  )
}

function GapsCard({ data }: { data: DegreePlanReady }) {
  const g = data.gaps
  return (
    <NoticeCard title="Still to work on">
      {!g.available ? (
        <p>{g.note}</p>
      ) : g.items.length === 0 ? (
        <p>{g.note ?? "No behaviour or skill gaps are on file."}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-foreground">
          {g.items.map((item, i) => (
            <li key={`${item.title}-${i}`}>{item.title ?? item.competency}</li>
          ))}
        </ul>
      )}
    </NoticeCard>
  )
}
