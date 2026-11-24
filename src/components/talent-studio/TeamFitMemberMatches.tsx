/**
 * Team fit (TS-4a) — one team member's existing role matches, or the reason
 * there is nothing to show.
 *
 * The read is growth-service's fit-matches for ONE member, through the hook
 * Team Development Studio already uses. The server decides what comes back:
 * it checks the caller's relationship to the member and the member's sharing,
 * and answers with a `state`. This component only says what the server said.
 *
 * Every state has its own words. In particular:
 *
 *   - "Not shared" is never drawn as an empty list or a zero. A member who has
 *     not shared is a different fact from a member with no matches.
 *   - A failed load is an alert with a retry, never "no matches".
 *
 * Shown per match: rank, role title, score and (when partial) how many of the
 * role's dimensions the score rests on. Nothing else is read from a match: no
 * tier, no fit band, no classification. The fields are picked BY NAME below,
 * never spread, so a field the server one day sends does not reach the screen
 * by accident.
 */
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMemberFitMatches } from "@/hooks/manager/development/useMemberFitMatches"
import type { FitEngineMatch, FitMissingCategory } from "@/types/development"

const K = "talentStudio.teamFit"

/** Partial coverage of one match, or null when every dimension was measured (or the counts are absent). */
function partial(m: FitEngineMatch): { evaluated: number; total: number } | null {
  const evaluated = m.dimensionsEvaluated
  const total = m.dimensionsTotal
  if (typeof evaluated !== "number" || typeof total !== "number") return null
  if (total <= 0 || evaluated >= total) return null
  return { evaluated, total }
}

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
}

function Notice({ state, title, children }: { state: string; title?: string; children: ReactNode }) {
  return (
    <div
      data-team-fit-state={state}
      className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground"
    >
      {title && (
        <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
          {state === "not_shared" && <Lock className="size-3.5 shrink-0" aria-hidden="true" />}
          {title}
        </p>
      )}
      <p>{children}</p>
    </div>
  )
}

export interface TeamFitMemberMatchesProps {
  memberId: string
  memberName: string
}

export default function TeamFitMemberMatches({ memberId, memberName }: TeamFitMemberMatchesProps) {
  const { t, i18n } = useTranslation("shellUi")
  const { data, isLoading, isError, isFetching, refetch } = useMemberFitMatches(memberId, true)
  const name = memberName

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t(`${K}.matchesLoading`, { defaultValue: "Loading matches…" })}
      </p>
    )
  }

  // The request failed, or the server said its own fit read failed. Either way
  // it is a failure, said as one, with a way to try again.
  if (isError || !data || data.state === "unavailable") {
    return (
      <div
        role="alert"
        data-team-fit-state="error"
        className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      >
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {t(`${K}.matchesError`, {
            defaultValue: "{{name}}'s matches could not be loaded just now. That is not the same as having none.",
            name,
          })}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {t(`${K}.retry`, { defaultValue: "Try again" })}
        </Button>
      </div>
    )
  }

  if (data.state === "not_shared") {
    const missing: readonly FitMissingCategory[] = data.missingCategories ?? []
    const prism = missing.includes("prism")
    const development = missing.includes("development")
    const sentence =
      prism && development
        ? t(`${K}.notShared.both`, {
            defaultValue:
              "{{name}} has not shared their PRISM profile or Development with you. Role matches need both, so they stay private until {{name}} shares them.",
            name,
          })
        : development
          ? t(`${K}.notShared.development`, {
              defaultValue:
                "{{name}} has not shared Development with you. Role matches sit under Development, so they stay private until {{name}} shares it.",
              name,
            })
          : prism
            ? t(`${K}.notShared.prism`, {
                defaultValue:
                  "{{name}} has not shared their PRISM profile with you. Role matches come from it, so they stay private until {{name}} shares it.",
                name,
              })
            : t(`${K}.notShared.unspecified`, {
                defaultValue:
                  "{{name}} has not shared their role matches with you. They stay private until {{name}} shares them.",
                name,
              })
    return (
      <Notice state="not_shared" title={t(`${K}.notShared.title`, { defaultValue: "Not shared" })}>
        {sentence}
      </Notice>
    )
  }

  if (data.state === "no_account") {
    return (
      <Notice state="no_account">
        {t(`${K}.noAccount`, {
          defaultValue: "{{name}} does not have an Inspire Genius account yet, so there are no matches to show.",
          name,
        })}
      </Notice>
    )
  }

  if (data.state === "no_prism") {
    return (
      <Notice state="no_prism">
        {t(`${K}.noPrism`, {
          defaultValue: "{{name}} has no PRISM profile on file yet. Role matches are measured from it.",
          name,
        })}
      </Notice>
    )
  }

  if (data.state === "not_entitled") {
    return (
      <Notice state="not_entitled">
        {t(`${K}.notEntitled`, {
          defaultValue: "Career Fit is not switched on for {{name}}, so there are no matches to show.",
          name,
        })}
      </Notice>
    )
  }

  const noMatchesTitle = t(`${K}.noMatches.title`, { defaultValue: "No matches yet" })

  if (data.state === "no_snapshot") {
    return (
      <Notice state="no_matches" title={noMatchesTitle}>
        {t(`${K}.noMatches.notRun`, {
          defaultValue:
            "{{name}} has not opened their own Career Fit matches yet. They appear here after {{name}} does. Nothing is scored from this page.",
          name,
        })}
      </Notice>
    )
  }

  if (data.state !== "ok") {
    // A state this build does not know. Not guessed at, and not an empty list.
    return (
      <Notice state="unknown">
        {t(`${K}.unknownState`, {
          defaultValue: "{{name}}'s matches cannot be shown right now.",
          name,
        })}
      </Notice>
    )
  }

  if (data.matches.length === 0) {
    return (
      <Notice state="no_matches" title={noMatchesTitle}>
        {t(`${K}.noMatches.noRoles`, {
          defaultValue: "{{name}}'s own Career Fit had no published roles to compare against.",
          name,
        })}
      </Notice>
    )
  }

  const date = formatDate(data.asOf, i18n.language)
  return (
    <div data-team-fit-state="ok" className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {date
          ? t(`${K}.asOf`, { defaultValue: "From {{name}}'s own Career Fit, as of {{date}}.", name, date })
          : t(`${K}.asOfUnknown`, { defaultValue: "From {{name}}'s own Career Fit.", name })}
      </p>
      <ol className="flex flex-col gap-1.5">
        {data.matches.map((m) => {
          const coverage = partial(m)
          return (
            <li
              key={m.jobId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="min-w-0 font-medium text-foreground">
                <span className="me-1.5 text-muted-foreground">#{m.rank}</span>
                {m.roleTitle}
              </span>
              <span className="text-foreground">
                {t(`${K}.score`, { defaultValue: "Match score {{score}}%", score: Math.round(m.fitScore) })}
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
            </li>
          )
        })}
      </ol>
    </div>
  )
}
