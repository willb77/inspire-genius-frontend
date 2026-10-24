import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import {
  discoveryErrorMessage,
  useDiscoveryEducation,
  useDiscoverySchools,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { US_STATES, type EducationPath, type SchoolsQuery } from "@/types/career-discovery"
import ComingNextPage from "./ComingNextPage"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

/**
 * Education paths (DISC-2). The server decides whether this stage exists on
 * this tier: when its `education` stage is not `available`, this renders the
 * exact "Coming next" page the route rendered before DISC-2.
 */
export default function EducationPage() {
  const { journey } = useDiscoveryContext()
  const on = journey.stages.some((s) => s.id === "education" && s.available)
  if (!on) return <ComingNextPage stage="education" />
  // DISC-3: each school links to its cost and payback only when that stage is on.
  const costOn = journey.stages.some((s) => s.id === "cost" && s.available)
  return <EducationPaths enabled={journey.mayProceed} costOn={costOn} />
}

function EducationPaths({ enabled, costOn }: { enabled: boolean; costOn: boolean }) {
  const { data, isLoading, isError, error } = useDiscoveryEducation(enabled)
  const [state, setState] = useState("")
  const [query, setQuery] = useState<SchoolsQuery | null>(null)

  if (isLoading) return <DiscoveryLoading label="Working out education paths" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />

  const header = (
    <StageHeader
      title="Education paths"
      lead="For each career area that suits you: what people usually study to get there, and schools that offer it. These are routes, not rankings."
    />
  )
  if (data.paths.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title="Nothing to show yet">
          <p>{data.note}</p>
          <Link className="underline" to={ROUTES.CAREER_DISCOVERY.CAREERS}>
            Go to Career areas
          </Link>
        </NoticeCard>
      </div>
    )
  }

  const choose = (path: EducationPath, level: number) =>
    setQuery({ cip: path.field.code, level, state })

  return (
    <div className="space-y-6">
      {header}
      <label className="flex max-w-sm flex-col gap-1 text-sm">
        <span className="font-medium">Where would you study?</span>
        <select
          className="rounded-md border bg-background px-3 py-2"
          value={state}
          onChange={(e) => {
            setState(e.target.value)
            setQuery((q) => (q && e.target.value ? { ...q, state: e.target.value } : null))
          }}
        >
          <option value="">Choose a state to see schools</option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">Used only to look up schools. It isn&apos;t saved.</span>
      </label>
      <ol className="space-y-4">
        {data.paths.map((p) => (
          <li key={p.id}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.field.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {p.careerArea}
                  {p.fit !== null ? ` · ${Math.round(p.fit)}% natural fit` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{p.why}</p>
                {p.notes.map((n) => (
                  <p key={n} className="text-muted-foreground">
                    {n}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  {p.credentials.map((c) => (
                    <Button
                      key={c.level}
                      size="sm"
                      variant="outline"
                      disabled={!state}
                      onClick={() => choose(p, c.level)}
                    >
                      Schools: {c.title}
                    </Button>
                  ))}
                </div>
                {query && query.cip === p.field.code && p.credentials.some((c) => c.level === query.level) ? (
                  <SchoolList query={query} costOn={costOn} />
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <div className="max-w-3xl space-y-1 text-xs text-muted-foreground">
        <p>{data.crosswalkSource}</p>
        <p>{data.entrySource}</p>
        <p>{data.schoolsSource}</p>
      </div>
    </div>
  )
}

/** Scorecard URLs sometimes come without a scheme. */
function href(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function SchoolList({ query, costOn }: { query: SchoolsQuery; costOn: boolean }) {
  const { data, isLoading, isError, error } = useDiscoverySchools(query)
  if (isLoading) return <DiscoveryLoading label="Finding schools" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  if (data.unavailable || data.schools.length === 0) {
    return (
      <NoticeCard title={data.unavailable ? "School lists unavailable" : "No schools found"}>
        <p>{data.note}</p>
      </NoticeCard>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {data.total !== null && data.total > data.schools.length
          ? `Showing ${data.schools.length} of ${data.total} schools, A to Z.`
          : `${data.schools.length} school${data.schools.length === 1 ? "" : "s"}, A to Z.`}
      </p>
      <ul className="space-y-1">
        {data.schools.map((s) => (
          <li key={`${s.id ?? s.name}`}>
            {s.url ? (
              <a className="underline" href={href(s.url)} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
            ) : (
              <span>{s.name}</span>
            )}
            {s.city ? <span className="text-muted-foreground"> — {s.city}</span> : null}
            {costOn && s.id !== null ? (
              <>
                {" "}
                <Link
                  className="text-xs underline"
                  to={`${ROUTES.CAREER_DISCOVERY.COST}?cip=${query.cip}&level=${query.level}&school=${s.id}`}
                >
                  Cost and payback
                </Link>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
