import { CheckCircle2, MessageSquareQuote } from "lucide-react"

import { cn } from "@/lib/utils"
import { EXERCISE_STAGES } from "@/types/career-exercise/counselor"
import type { ExerciseSession, FactCell, RoleFactCells } from "@/types/career-exercise/student"
import {
  BUCKETS,
  REACTION_LABELS,
  WORKSHEET_SECTIONS,
  notesFor,
  pillarLabel,
  roleTitle,
  type WorksheetSection,
} from "./worksheetModel"

/**
 * CX-5 — the student's worksheet, filled in live from the session the server
 * keeps. Read-only: the exercise writes it as the chat goes. Pay and education
 * cells show their area and data year, or the reason there is no figure.
 */

const NOT_YET = "Fills in as you talk it through."

function Empty() {
  return <p className="text-sm text-muted-foreground">{NOT_YET}</p>
}

export function FactCellView({ cell, label }: { cell: FactCell; label: string }) {
  if (cell.kind === "value") {
    return (
      <div>
        <span className="sr-only">{label}: </span>
        <span>{cell.text}</span>
        <span className="block text-xs text-muted-foreground" data-testid="fact-source">
          {cell.area} · {cell.vintage}
        </span>
      </div>
    )
  }
  return (
    <span className={cn("text-xs", cell.kind === "pending" ? "text-muted-foreground" : "italic text-muted-foreground")}>
      <span className="sr-only">{label}: </span>
      {cell.text}
    </span>
  )
}

function Notes({ session, section }: { session: ExerciseSession; section: WorksheetSection }) {
  const notes = notesFor(session, section.stage)
  if (!notes.length) return null
  return (
    <ul className="mt-3 space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-md bg-primary/5 p-2 text-sm">
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden /> Note from your counselor
          </span>
          <span className="whitespace-pre-wrap">{n.text}</span>
        </li>
      ))}
    </ul>
  )
}

function SectionBody({
  session,
  section,
  cells,
}: {
  session: ExerciseSession
  section: WorksheetSection
  cells: Record<string, RoleFactCells>
}) {
  switch (section.stage) {
    case "discover":
      if (!session.self_portrait && session.profile_reactions.length === 0) return <Empty />
      return (
        <div className="space-y-2 text-sm">
          {session.self_portrait && (
            <blockquote className="border-l-2 border-primary pl-3 italic">{session.self_portrait}</blockquote>
          )}
          {session.profile_reactions.length > 0 && (
            <ul className="list-disc pl-5">
              {session.profile_reactions.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )
    case "pillars": {
      const entries = Object.entries(session.pillars)
      if (!entries.length) return <Empty />
      return (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium">{pillarLabel(k)}</dt>
              <dd>{v.length ? v.join(", ") : "—"}</dd>
            </div>
          ))}
        </dl>
      )
    }
    case "explore": {
      const reactions = Object.entries(session.posting_reaction)
      if (!session.roles.length && !reactions.length) return <Empty />
      return (
        <div className="space-y-3 text-sm">
          {session.roles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Role</th>
                    <th className="py-1 pr-3 font-medium">Typical education</th>
                    <th className="py-1 font-medium">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {session.roles.map((r) => {
                    const c = cells[r.onet_soc]
                    return (
                      <tr key={r.onet_soc} className="border-t align-top">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{r.title}</span>
                          <span className="block text-xs text-muted-foreground">{r.cluster}</span>
                        </td>
                        <td className="py-2 pr-3">{c && <FactCellView cell={c.education} label="Typical education" />}</td>
                        <td className="py-2">{c && <FactCellView cell={c.pay} label="Pay" />}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {reactions.map(([k, v]) => (
            <p key={k}>
              <span className="font-medium">{REACTION_LABELS[k] ?? k}:</span> {v.join(", ")}
            </p>
          ))}
        </div>
      )
    }
    case "narrow": {
      const sorted = session.roles.filter((r) => r.bucket)
      if (!sorted.length) return <Empty />
      return (
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {BUCKETS.map(({ key, label }) => (
            <div key={key}>
              <h4 className="font-medium">{label}</h4>
              <ul className="space-y-1">
                {sorted
                  .filter((r) => r.bucket === key)
                  .map((r) => (
                    <li key={r.onet_soc}>
                      {r.title}
                      {r.reason && <span className="block text-xs text-muted-foreground">{r.reason}</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )
    }
    case "test":
      if (!session.experiments.length) return <Empty />
      return (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {session.experiments.map((e, i) => (
            <li key={`${e.onet_soc}-${i}`}>
              <span className="capitalize">{e.kind}</span> — {roleTitle(session, e.onet_soc)}
              {e.target_date && <span className="text-muted-foreground"> · by {e.target_date}</span>}
            </li>
          ))}
        </ol>
      )
    case "commit": {
      const p = session.paths
      if (!p) return <Empty />
      const conf = session.paths_confirmation
      return (
        <div className="space-y-2 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Primary Path</dt>
              <dd className="font-medium">{p.primary}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Backup Path</dt>
              <dd className="font-medium">{p.backup}</dd>
            </div>
            {p.check_in_adult && (
              <div>
                <dt className="text-xs text-muted-foreground">Adult who will check in</dt>
                <dd>{p.check_in_adult}</dd>
              </div>
            )}
            {p.follow_up && (
              <div>
                <dt className="text-xs text-muted-foreground">Follow up by</dt>
                <dd>{p.follow_up}</dd>
              </div>
            )}
          </dl>
          {conf?.at && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              {conf.current
                ? "Your counselor has confirmed these paths."
                : "Your counselor confirmed an earlier version of these paths."}
            </p>
          )}
        </div>
      )
    }
    default:
      return null
  }
}

export function Worksheet({
  session,
  cells,
}: {
  session: ExerciseSession
  cells: Record<string, RoleFactCells>
}) {
  const reached = EXERCISE_STAGES.indexOf(session.stage)
  return (
    <section aria-label="Your worksheet" className="space-y-4">
      {WORKSHEET_SECTIONS.map((s) => {
        const at = EXERCISE_STAGES.indexOf(s.stage)
        const current = at === reached && session.status !== "closed"
        return (
          <article
            key={s.id}
            aria-labelledby={`ws-${s.id}`}
            aria-current={current ? "step" : undefined}
            className={cn("rounded-xl border bg-card p-4", current && "border-primary ring-1 ring-primary/30")}
          >
            <h3 id={`ws-${s.id}`} className="mb-2 flex items-center justify-between text-sm font-semibold">
              {s.title}
              {current && <span className="text-xs font-normal text-primary">You are here</span>}
            </h3>
            <SectionBody session={session} section={s} cells={cells} />
            <Notes session={session} section={s} />
          </article>
        )
      })}
    </section>
  )
}
