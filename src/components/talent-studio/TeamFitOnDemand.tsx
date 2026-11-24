/**
 * Team fit (TS-4b) — score one team member against a role the viewer chooses.
 *
 * Off by default. The server decides whether this is offered for a member
 * (its switch is per organisation and starts off), and this component only
 * says what the server said:
 *
 *   - `off`, or a backend without the route (404): nothing is drawn. No
 *     picker, no placeholder, no hint that the feature exists.
 *   - a failed role read: an alert with a retry. Never a hidden picker, and
 *     never something that reads as "no fit".
 *   - any other state: its own sentence.
 *
 * Scoring is one explicit click. The request carries the role only; the server
 * takes the viewer from the session, checks the member's sharing again, writes
 * its record and tells the member. A failed score is an alert, never a zero.
 *
 * Shown for a score: role title, score and (when partial) how many dimensions
 * it rests on. The fields are picked BY NAME, never spread: no tier, no fit
 * band, no classification reaches the screen even if a response carried one.
 */
import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useMemberFitOnDemandRoles,
  useScoreMemberFitOnDemand,
} from "@/hooks/manager/development/useMemberFitOnDemand"
import { useMemberFitMatches } from "@/hooks/manager/development/useMemberFitMatches"
import { withPrism } from "@/lib/withPrism"
import type { FitOnDemandResult, FitOnDemandState } from "@/types/development"

const K = "talentStudio.teamFit"
const D = `${K}.onDemand`

/** States the matches block above already explains in the same words. */
const SHARED_WITH_MATCHES: readonly FitOnDemandState[] = ["not_shared", "no_account", "no_prism", "not_entitled"]

function partial(r: FitOnDemandResult): { evaluated: number; total: number } | null {
  const evaluated = r.dimensionsEvaluated
  const total = r.dimensionsTotal
  if (typeof evaluated !== "number" || typeof total !== "number") return null
  if (total <= 0 || evaluated >= total) return null
  return { evaluated, total }
}

export interface TeamFitOnDemandProps {
  memberId: string
  memberName: string
  /** Called once the server has offered scoring for this member. */
  onOffered?: () => void
}

export default function TeamFitOnDemand({ memberId, memberName, onOffered }: TeamFitOnDemandProps) {
  const { t } = useTranslation("shellUi")
  const name = memberName
  const selectId = useId()
  const roles = useMemberFitOnDemandRoles(memberId, true)
  // Same query as the matches block above (one request, shared by key).
  const matches = useMemberFitMatches(memberId, true)
  const score = useScoreMemberFitOnDemand(memberId)
  const [jobId, setJobId] = useState("")

  const offered = roles.data?.state === "ok"
  useEffect(() => {
    if (offered) onOffered?.()
  }, [offered, onOffered])

  function stateSentence(s: FitOnDemandState): string {
    switch (s) {
      case "not_shared":
        return t(`${D}.notShared`, {
          defaultValue:
            "Scoring {{name}} against a role needs {{name}} to have shared both their PRISM profile and Development with you.",
          name,
        })
      case "no_account":
        return t(`${K}.noAccount`, {
          defaultValue: "{{name}} does not have an InspiresGenius account yet, so there are no matches to show.",
          name,
        })
      case "no_prism":
        return t(`${K}.noPrism`, {
          defaultValue: "{{name}} has no PRISM profile on file yet. Role matches are measured from it.",
          name,
        })
      case "not_entitled":
        return t(`${K}.notEntitled`, {
          defaultValue: "Career Fit is not switched on for {{name}}, so there are no matches to show.",
          name,
        })
      case "role_not_available":
        return t(`${D}.roleNotAvailable`, {
          defaultValue: "That role can no longer be scored for {{name}}. Choose another.",
          name,
        })
      case "off":
        return t(`${D}.off`, {
          defaultValue: "Scoring against a role is not switched on for {{name}}'s organization.",
          name,
        })
      default:
        // A state this build does not know. Not guessed at.
        return t(`${D}.unknownState`, {
          defaultValue: "Scoring {{name}} against a role is not available right now.",
          name,
        })
    }
  }

  // Nothing while the question is open: a feature that is off for nearly
  // everyone should not flash a loading line on every row.
  if (roles.isLoading) return null

  // The request failed, or the server said its own read failed. Either way it
  // is a failure, said as one, with a way to try again.
  if (roles.isError || !roles.data || roles.data.state === "unavailable") {
    return (
      <div
        role="alert"
        data-team-fit-on-demand="error"
        className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      >
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {t(`${D}.rolesError`, {
            defaultValue: "We could not check whether you can score {{name}} against a role. This is a loading problem.",
            name,
          })}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={roles.isFetching} onClick={() => void roles.refetch()}>
          {t(`${K}.retry`, { defaultValue: "Try again" })}
        </Button>
      </div>
    )
  }

  const state = roles.data.state
  if (state === "off") return null
  // The matches block already says this, in the same words. Not said twice.
  if (SHARED_WITH_MATCHES.includes(state) && matches.data?.state === state) return null

  const title = t(`${D}.title`, { defaultValue: "Score against a role" })

  if (state !== "ok") {
    return (
      <section data-team-fit-on-demand={state} className="mt-3 rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm">
        <h3 className="mb-1 font-medium text-foreground">{title}</h3>
        <p className="text-muted-foreground">{withPrism(stateSentence(state))}</p>
      </section>
    )
  }

  if (roles.data.roles.length === 0) {
    return (
      <section data-team-fit-on-demand="no_roles" className="mt-3 rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm">
        <h3 className="mb-1 font-medium text-foreground">{title}</h3>
        <p className="text-muted-foreground">
          {t(`${D}.noRoles`, {
            defaultValue: "There is no published role that both you and {{name}} can see, so there is nothing to score against.",
            name,
          })}
        </p>
      </section>
    )
  }

  const outcome = score.data
  const result = outcome?.state === "ok" ? outcome.result : null
  const coverage = result ? partial(result) : null
  // The request failed, the server said it failed, or it said "ok" with no score.
  const failed =
    score.isError || outcome?.state === "unavailable" || (outcome?.state === "ok" && !outcome.result)

  return (
    <section data-team-fit-on-demand="ok" className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
      <h3 className="mb-1 font-medium text-foreground">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {withPrism(
          t(`${D}.intro`, {
            defaultValue:
              "Scores {{name}} against a role you choose, from their PRISM profile. A record is kept, and {{name}} is told on their own Career Fit page that you viewed their fit for that role.",
            name,
          }),
        )}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-foreground">
            {t(`${D}.roleLabel`, { defaultValue: "Role to score {{name}} against", name })}
          </label>
          <select
            id={selectId}
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value)
              score.reset()
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">{t(`${D}.choose`, { defaultValue: "Choose a role…" })}</option>
            {roles.data.roles.map((r) => (
              <option key={r.jobId} value={r.jobId}>
                {r.roleTitle}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" size="sm" disabled={!jobId || score.isPending} onClick={() => score.mutate(jobId)}>
          {score.isPending
            ? t(`${D}.scoring`, { defaultValue: "Scoring…" })
            : t(`${D}.score`, { defaultValue: "Score {{name}} for this role", name })}
        </Button>
      </div>

      {failed && (
        <p role="alert" data-team-fit-on-demand-result="error" className="mt-3 flex items-start gap-2 text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {t(`${D}.scoreError`, {
            defaultValue: "{{name}} could not be scored just now. That is not a score of zero. Try again.",
            name,
          })}
        </p>
      )}

      {!failed && outcome && outcome.state !== "ok" && (
        <p role="status" data-team-fit-on-demand-result={outcome.state} className="mt-3 text-muted-foreground">
          {withPrism(stateSentence(outcome.state))}
        </p>
      )}

      {result && (
        <div role="status" data-team-fit-on-demand-result="ok" className="mt-3 rounded-md border border-border px-3 py-2">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 font-medium text-foreground">{result.roleTitle}</span>
            <span className="text-foreground">
              {t(`${K}.score`, { defaultValue: "Match score {{score}}%", score: Math.round(result.fitScore) })}
              {coverage && (
                <span className="ms-2 text-xs text-muted-foreground">
                  {t(`${K}.coverage`, {
                    defaultValue: "{{evaluated}} of {{total}} dimensions measured",
                    evaluated: coverage.evaluated,
                    total: coverage.total,
                  })}
                </span>
              )}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`${D}.resultNote`, {
              defaultValue:
                "Scored just now at your request. It is not added to {{name}}'s own fit reports, and {{name}} can see that you viewed it.",
              name,
            })}
          </p>
        </div>
      )}
    </section>
  )

}
