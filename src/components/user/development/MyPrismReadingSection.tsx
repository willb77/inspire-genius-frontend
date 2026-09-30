/**
 * My PRISM reading — the person's own 88-scale profile, addressed to them.
 *
 * Reads `GET /v1/growth/me/profile` (`useMyFullPrism`), the self counterpart of
 * the coach-side `/members/{id}/profile`, with an identical response shape.
 *
 * ## The three properties of that response that are load-bearing here
 *
 *  1. **`isConflicted` is a refusal, not a warning.** When it is set, this
 *     component renders `conflictMessage` and NOTHING ELSE — no scales, no
 *     colours, no coverage line. It means two assessments under this account
 *     disagree, which on dev was two different people's PRISM reports filed
 *     under one account. `scales` already drops the disagreeing entries, but
 *     the agreeing remainder is not trustworthy either, because the overlap
 *     that reveals a conflict is only a lower bound. It is never a newest-wins.
 *  2. **`coverage < 88` is the ordinary case, not an error.** 75–87 measured,
 *     plus one 26-scale legacy outlier; nobody has all 88. So the coverage line
 *     says what is missing rather than implying a complete picture, and a
 *     short profile is not treated as a failure.
 *  3. **A missing scale is never shown as zero.** Only what the server sent is
 *     rendered. A profile of zeroes is not "no data" — it is a specific and
 *     wrong personality.
 *
 * ## Why no generated prose (yet)
 *
 * The brief for this package pairs this section with a `REAL_SELF` framing on
 * `POST /v1/agents/team-studio/analyse`, so the write-up is addressed TO the
 * person rather than about them to a manager. `AnalyseRequest` on
 * origin/development carries `subject` and `part` and no framing selector, and
 * a Pydantic model ignores an unknown extra field by default — so sending a
 * guessed selector name would return 200 carrying MANAGER-framed prose, read by
 * its own subject, with nothing in the response saying so. That is the same
 * shape as the `team_development` grounding bug (`.claude/rules/agents.md` §6):
 * a fluent answer in the wrong voice is worse than no answer, because silence
 * is visibly broken and this is not. The prose slots in here once the framing
 * field is on the tip and its name can be read rather than assumed.
 */
import { Brain } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import apiErrorMessage from "@/lib/apiErrorMessage"
import { useMyFullPrism } from "@/hooks/me/useMyDevelopment"
import type { FullPrismScale } from "@/types/development"
import SelfSection from "./SelfSection"

/** How many of the missing scale names to name before summarising the rest. */
const MISSING_SHOWN = 6

function groupScales(scales: FullPrismScale[]): [string, FullPrismScale[]][] {
  const byGroup = new Map<string, FullPrismScale[]>()
  for (const scale of scales) {
    const key = scale.group || "Other"
    const list = byGroup.get(key)
    if (list) list.push(scale)
    else byGroup.set(key, [scale])
  }
  return [...byGroup.entries()]
}

/**
 * The value to show for one scale.
 *
 * `Underlying` is what IG treats as canonical. `Adapted` answers a different
 * question in the same units, so it is shown as its own labelled number and
 * never substituted for a missing Underlying — a substituted value is
 * indistinguishable from a measured one.
 */
function ScaleRow({ scale }: { scale: FullPrismScale }) {
  const entries = Object.entries(scale.scores ?? {})
  return (
    <li className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="min-w-0 truncate">{scale.label || scale.key}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {entries.length === 0
          ? "not scored"
          : entries.map(([type, value]) => `${type} ${value}`).join(" · ")}
      </span>
    </li>
  )
}

export default function MyPrismReadingSection() {
  const profile = useMyFullPrism()
  const data = profile.data ?? null

  // `hasData: false` and a null body are the same ordinary state: no
  // assessment on file. A CONFLICTED profile is NOT that, and must not fall
  // into this branch — it has a body and something to say.
  const isEmpty = !profile.isError && (data === null || (!data.hasData && !data.isConflicted))

  const missing = data?.missing ?? []

  return (
    <SelfSection
      id="my-prism"
      title="My PRISM reading"
      icon={Brain}
      lead="Every PRISM scale on file for you — not the eight behaviours, the full rubric."
      isLoading={profile.isLoading}
      isError={profile.isError}
      errorMessage={
        profile.isError
          ? apiErrorMessage(profile.error, "Please try again in a moment.")
          : undefined
      }
      onRetry={() => void profile.refetch()}
      isEmpty={isEmpty}
      emptyHeadline="No PRISM assessment on file for you yet."
      emptyBody="Completing a PRISM assessment fills this in — you can request one from your PRISM page, or your coach or practitioner can send you one. Nothing here is estimated in the meantime."
    >
      {data?.isConflicted ? (
        /* The refusal branch. Nothing below it renders: no scales, no colours,
           no coverage line. */
        <div role="alert" className="space-y-1 rounded-md border border-destructive/40 p-4">
          <p className="text-sm font-medium text-destructive">
            We can&apos;t show your reading.
          </p>
          <p className="text-sm text-muted-foreground">
            {data.conflictMessage ||
              "Two assessment records under your account disagree with each other, so neither can be shown as yours. Ask your practitioner to check which report belongs to you — we will not guess by picking the newest."}
          </p>
        </div>
      ) : (
        data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{data.coverage} scales on file</Badge>
              {data.fromLegacyRows && <Badge variant="outline">From an older record</Badge>}
            </div>
            {/* Said plainly rather than implied: a partial profile is normal,
                and the person is entitled to know which parts are absent
                instead of reading a chart that looks complete. */}
            {missing.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Not measured for you: {missing.slice(0, MISSING_SHOWN).join(", ")}
                {missing.length > MISSING_SHOWN
                  ? ` and ${missing.length - MISSING_SHOWN} more`
                  : ""}
                . A scale that was not measured is left out here — it is not shown as a zero.
              </p>
            )}
            {data.colours && Object.keys(data.colours).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your quadrant means
                </p>
                <ul className="mt-1">
                  {Object.entries(data.colours).map(([name, value]) => (
                    <li
                      key={name}
                      className="flex items-baseline justify-between gap-3 py-1 text-sm"
                    >
                      <span>{name}</span>
                      <span className="tabular-nums text-muted-foreground">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {groupScales(data.scales ?? []).map(([group, scales]) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {scales.map((scale) => (
                    <ScaleRow key={scale.key} scale={scale} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}
    </SelfSection>
  )
}
