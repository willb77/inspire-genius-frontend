import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { discoveryErrorMessage } from "@/hooks/career-discovery/useCareerDiscovery"
import { useLearningLocal } from "@/hooks/career-discovery/useLearningLocal"
import {
  LOCAL_KIND_TITLES,
  publishedCost,
  type LearningBlock,
  type LearningMark,
  type LocalKind,
} from "@/lib/career-discovery/learningSection"
import type { EducationPath } from "@/types/career-discovery"
import { DiscoveryError, DiscoveryLoading } from "./DiscoveryParts"
import { STAGE_ROUTES } from "./stageRoutes"

/**
 * JF-10: the four Learning and Education buttons (D8 keeps My Plan). Rendered
 * only when the server marked the education stage; the current page is marked,
 * and a stage that is not switched on yet is greyed out and says so.
 */
export function LearningButtons({ learning, current }: { learning: LearningMark; current: string }) {
  return (
    <nav aria-label={learning.title} className="flex flex-wrap gap-2">
      {learning.buttons.map((b) => {
        const here = b.stageId === current
        const to = STAGE_ROUTES[b.stageId]
        if (!b.available || !to) {
          return (
            <span key={b.stageId} className="flex flex-col">
              <Button size="sm" variant="outline" disabled aria-describedby={`cd-learning-why-${b.stageId}`}>
                {b.label}
              </Button>
              <span id={`cd-learning-why-${b.stageId}`} className="text-xs text-muted-foreground">
                Not switched on here yet.
              </span>
            </span>
          )
        }
        return (
          <Button key={b.stageId} size="sm" variant={here ? "default" : "outline"} asChild>
            <Link to={to} aria-current={here ? "page" : undefined}>
              {b.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

/** One kind of local listing. A non-ready answer shows the server's reason, never a bare empty list. */
function LocalList({ kind, soc, state }: { kind: LocalKind; soc: string; state: string }) {
  const { data, isLoading, isError, error } = useLearningLocal({ soc, kind, state })
  if (isLoading) return <DiscoveryLoading label={`Finding ${LOCAL_KIND_TITLES[kind].toLowerCase()}`} />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  if (data.state !== "ready" || data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{data.note ?? "Nothing listed here."}</p>
  }
  const anyCost = data.data.some((i) => publishedCost(i) !== null)
  return (
    <div className="space-y-1">
      <ul className="space-y-1 text-sm">
        {data.data.map((i, n) => {
          const cost = publishedCost(i)
          return (
            <li key={`${i.id ?? i.title}-${n}`}>
              {i.url ? (
                <a className="underline" href={i.url} target="_blank" rel="noopener noreferrer">
                  {i.title}
                </a>
              ) : (
                <span>{i.title}</span>
              )}
              {i.organisation && i.organisation !== i.title ? (
                <span className="text-muted-foreground"> — {i.organisation}</span>
              ) : null}
              {i.location ? <span className="text-muted-foreground">, {i.location}</span> : null}
              {i.credential ? <span className="block text-xs text-muted-foreground">Credential: {i.credential}</span> : null}
              {cost ? <span className="block text-xs text-muted-foreground">Cost: {cost}</span> : null}
            </li>
          )
        })}
      </ul>
      {kind === "training" && !anyCost ? (
        <p className="text-xs text-muted-foreground">
          This listing doesn&apos;t publish costs. Check with each provider.
        </p>
      ) : null}
    </div>
  )
}

/**
 * JF-10: training providers, licences and apprenticeships beside the colleges,
 * for one path's occupation in the chosen state. Nothing is fetched until a
 * state is chosen and the person asks.
 */
export function LocalOptions({ path, state, block }: { path: EducationPath; state: string; block: LearningBlock }) {
  const [open, setOpen] = useState(false)
  const [soc, setSoc] = useState(path.occupations[0]?.soc ?? "")
  if (path.occupations.length === 0) return null
  const why = `cd-local-why-${path.id}`
  return (
    <div className="space-y-3">
      <Button
        size="sm"
        variant="outline"
        disabled={!state}
        aria-expanded={open}
        aria-describedby={!state ? why : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Training, licences and apprenticeships
      </Button>
      {!state ? (
        <p id={why} className="text-xs text-muted-foreground">
          Choose a state above first. These are listed by state.
        </p>
      ) : null}
      {open && state ? (
        <div className="space-y-3 rounded-md border p-3">
          {path.occupations.length > 1 ? (
            <label className="flex max-w-sm flex-col gap-1 text-sm">
              <span className="font-medium">For which job?</span>
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={soc}
                onChange={(e) => setSoc(e.target.value)}
              >
                {path.occupations.map((o) => (
                  <option key={o.soc} value={o.soc}>
                    {o.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm font-medium">For: {path.occupations[0].title}</p>
          )}
          {block.localKinds.map((kind) => (
            <section key={kind} className="space-y-1">
              <h3 className="text-sm font-medium">{LOCAL_KIND_TITLES[kind]}</h3>
              <LocalList kind={kind} soc={soc} state={state} />
            </section>
          ))}
          <p className="text-xs text-muted-foreground">
            From{" "}
            <a className="underline" href={block.localSourceUrl} target="_blank" rel="noopener noreferrer">
              {block.localSource}
            </a>
            .
          </p>
        </div>
      ) : null}
    </div>
  )
}
