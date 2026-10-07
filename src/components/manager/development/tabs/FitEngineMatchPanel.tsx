/**
 * 3.3a — Careers tab on the fit engine (rendered only when
 * FIT_ENGINE_MATCHES_ENABLED; CareerMatchPanel stays the default).
 *
 * Shows the member's ranked roles from their own My fit: rank, role, score,
 * and when they last ran it. Deliberately NOT shown:
 *   - a tier / band / classification badge — the person's own Job Fit page no
 *     longer shows one (4.1 option D), and a manager acting on a label is a
 *     stronger use than the person reading it;
 *   - "Set as target" / "View gaps" — the Gaps tab's target picker belongs to
 *     3.2 and keeps reading the dossier until that ships;
 *   - an Internal / External toggle — every fit-engine role is a published
 *     benchmark, so there is one list (the old panel opened on an empty
 *     Internal view for everyone whose rows were all external, TDS-F-3.3a).
 *
 * Every non-ok state gets its own sentence. An empty list would say all of
 * them at once, and say none of them correctly.
 */
import { Info, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DEVELOPMENT_INPUT_DISCLAIMER } from "@/constants/development"
import type { FitEngineMatchesState, MemberFitMatches } from "@/types/development"
import { useDevSkin } from "../skin"
import { fitStateMessage, formatAsOf } from "./fitEngineMatchCopy"

export interface FitEngineMatchPanelProps {
  memberName: string
  result?: MemberFitMatches
  loading?: boolean
  /** The request itself failed (network, 5xx). Rendered, never swallowed. */
  error?: boolean
}

export function FitEngineMatchPanel({ memberName, result, loading, error }: FitEngineMatchPanelProps) {
  const sk = useDevSkin()

  if (loading) {
    return <div className={cn("py-10 text-center text-sm", sk.text400)}>Loading matches…</div>
  }

  const state: FitEngineMatchesState = error || !result ? "unavailable" : result.state
  const asOf = formatAsOf(result?.asOf ?? null)

  return (
    <div className="space-y-4">
      <p className={cn("flex items-start gap-1.5 rounded-md p-2.5 text-[11px]", sk.bgMuted50, sk.text500)}>
        <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sk.text400)} aria-hidden="true" />
        <span>{DEVELOPMENT_INPUT_DISCLAIMER}</span>
      </p>

      {state !== "ok" ? (
        <Card className="border-dashed">
          <CardContent
            className={cn("p-6 text-center text-sm", sk.text500)}
            data-testid={`fit-matches-${state}`}
            role={state === "unavailable" ? "alert" : undefined}
          >
            {fitStateMessage(state, memberName)}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className={cn("text-xs", sk.text500)} data-testid="fit-matches-as-of">
            From {memberName}&rsquo;s own My fit{asOf ? `, as of ${asOf}` : ""}.
          </p>
          {result && result.matches.length > 0 ? (
            <ol className="grid gap-3 lg:grid-cols-2">
              {result.matches.map((m) => (
                <li key={m.jobId}>
                  <Card data-testid="fit-match-item">
                    <CardContent className="flex items-center justify-between gap-2 p-4">
                      <span className={cn("text-sm font-medium", sk.text900)}>
                        <span className={cn("mr-1.5", sk.text400)}>#{m.rank}</span>
                        {m.roleTitle}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", sk.text700)}>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        {Math.round(m.fitScore)}%
                      </span>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          ) : (
            <Card className="border-dashed">
              <CardContent className={cn("p-6 text-center text-sm", sk.text500)} data-testid="fit-matches-no-roles">
                {memberName}&rsquo;s My fit had no published roles to compare against.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
