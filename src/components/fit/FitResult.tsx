import type { ReactNode } from "react"
import { AlertTriangle, Info, MessagesSquare, Sprout, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FitDetail } from "@/types/job-fit"
import { formatGap, type Tone } from "./fit"
import { DS_TONE_TEXT } from "./palette"
import {
  FitCard,
  FitMethodologyNote,
  FitPill,
  FitSectionTitle,
  FitStat,
  PartialProfileNote,
} from "./primitives"
import { FitScoreHeadline } from "./FitScoreHeadline"

/**
 * The three closeness tiles — total variation, growth areas, priority focus —
 * shown on a role's breakdown (`subject="role"`) and on Fit a JD
 * (`subject="target"`). One component, so the wording is changed once
 * (FIT-5b, decision 3) rather than on each page.
 */
export function FitStatTiles({
  data,
  subject,
  className,
}: {
  data: FitDetail
  subject: "role" | "target"
  className?: string
}) {
  return (
    <div className={cn(className, "grid grid-cols-1 gap-4 sm:grid-cols-3")}>
      <FitStat
        icon={Target}
        label="Overall closeness"
        value={data.totalVariation}
        hint={subject === "role" ? "Lower means closer to this role's benchmark" : "Lower means closer to this target"}
      />
      <FitStat
        icon={Sprout}
        label="Growth areas"
        value={data.coachingGaps.length}
        hint={
          subject === "role"
            ? "Dimensions to develop toward the benchmark"
            : "Dimensions to develop toward the target"
        }
        tone="amber"
      />
      <FitStat
        icon={AlertTriangle}
        label="Priority focus"
        value={data.criticalGaps.length}
        hint="Larger gaps worth prioritizing"
        tone={data.criticalGaps.length > 0 ? "red" : "green"}
      />
    </div>
  )
}

/**
 * One role's scored result, as each surface lays it out:
 * - `target` — Fit a JD: headline card, the three tiles, the breakdown,
 *   the methodology note. Gaps first (the breakdown slot).
 * - `recorded` — a reopened report: "Your fit as recorded", then the breakdown.
 * - `ds` — Direction Setting: headline card, then strengths FIRST (someone
 *   using it is often between jobs; what they already match is what they
 *   should say out loud), then the gaps, over-use, the gated and methodology
 *   notes. Neutral palette.
 *
 * `breakdown` is the Career Fit breakdown (radar, per-dimension, growth
 * focus, over-use, self-advocacy last), passed in by the page.
 */
export type FitResultProps =
  | { variant: "target"; data: FitDetail; breakdown: ReactNode }
  | { variant: "recorded"; data: FitDetail; breakdown: ReactNode }
  | { variant: "ds"; data: FitDetail }

export function FitResult(props: FitResultProps) {
  const { data } = props
  switch (props.variant) {
    case "target":
      // The same headline the role detail page leads with, then the shared
      // breakdown. No narrative cards — those need a published role id.
      return (
        <div className="space-y-6">
          <FitCard>
            <FitSectionTitle>Your fit against this target</FitSectionTitle>
            <FitScoreHeadline source={data} variant="summary" />
            {/* BP-F5: a partial-profile score says what it rests on. */}
            <PartialProfileNote coverage={data} />
            {/* No fit tier or pre-cap tier here (4.1, option D) — score only. */}
            {data.gated && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
                <FitPill tone="amber">Decision support only</FitPill>
              </div>
            )}
          </FitCard>

          <FitStatTiles data={data} subject="target" />

          <div>{props.breakdown}</div>

          <FitMethodologyNote note={data.methodologyNote} />
        </div>
      )
    case "recorded":
      // FIT-1: the read the snapshot was served under (closeness or gap).
      return (
        <>
          <FitCard className="mb-6">
            <FitSectionTitle>Your fit as recorded</FitSectionTitle>
            <FitScoreHeadline source={data} variant="recorded" />
          </FitCard>
          {props.breakdown}
        </>
      )
    case "ds":
      // FIT-1: the detail is fetched under the list's method, so read it the
      // same way the row does — closeness under the closeness read.
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-baseline gap-x-4 gap-y-2 p-5">
              <FitScoreHeadline source={data} variant="ds" title={data.roleTitle} />
            </CardContent>
          </Card>

          {/* Strengths first — see the note on SelfAdvocacyCard. */}
          <SelfAdvocacyCard lines={data.interviewSelfAdvocacy} />

          <GapList
            title="Worth putting first"
            hint="The furthest from what this role leans on. Closing one of these moves your fit more than anything else you could do."
            gaps={data.criticalGaps}
            tone="red"
          />

          <GapList
            title="Worth building over time"
            hint="Smaller distances. Steady practice closes these — no leap required."
            gaps={data.coachingGaps}
            tone="amber"
          />

          <OverdoneCard flags={data.overdoneFlags} />

          {data.gated && (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Matching for this role is still in limited release, so treat this read as
              a first draft rather than a settled answer.
            </p>
          )}

          <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            {data.methodologyNote ||
              "This compares your profile with a role's published benchmark to help you aim your effort. It is not a hiring decision, and no one else sees it."}
          </p>
        </div>
      )
  }
}

/**
 * The self-advocacy card — the quiet star of Direction Setting's breakdown.
 *
 * These are the dimensions where the person already meets or beats the role's
 * benchmark, written as things to say. Deliberately the first and largest card
 * in the breakdown: a gap list is useful, but it is not what someone job-hunting
 * needs to read first.
 */
function SelfAdvocacyCard({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-primary" aria-hidden />
          What to say out loud about this one
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          These are the places you already match or beat what the role asks for.
          They&apos;re yours to claim — worth having ready before an interview.
        </p>
        <ul className="space-y-2.5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span className="text-sm leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** A gap group: the priority ones first, then the steadier ones. */
function GapList({
  title,
  hint,
  gaps,
  tone,
}: {
  title: string
  hint: string
  gaps: { dimensionName: string; gap: number }[]
  tone: Tone
}) {
  if (gaps.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {tone === "red" ? (
            <AlertTriangle className={cn("h-4 w-4", DS_TONE_TEXT[tone])} aria-hidden />
          ) : (
            <Sprout className={cn("h-4 w-4", DS_TONE_TEXT[tone])} aria-hidden />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
        <ul className="space-y-2">
          {gaps.map((g) => (
            <li
              key={g.dimensionName}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm"
            >
              <span>{g.dimensionName}</span>
              <span className={cn("font-medium", DS_TONE_TEXT[tone])}>{formatGap(g.gap)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/**
 * Over-expressed strengths.
 *
 * Framed as information, never as a fault: these are things the person is good
 * at, turned up higher than this particular role tends to need — usually the way
 * someone behaves under pressure. Knowing it is useful. Being told off for it is
 * not, so the copy says so explicitly.
 */
function OverdoneCard({ flags }: { flags: { dimensionName: string; candidateScore: number }[] }) {
  if (flags.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
          Strengths you turn up high
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          These are strengths, not faults. You express them more strongly than this
          role typically calls for — which often shows up under pressure. Nothing
          here needs fixing; it&apos;s just useful to know which dial you reach for
          first.
        </p>
        <div className="flex flex-wrap gap-2">
          {flags.map((f) => (
            <span
              key={f.dimensionName}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {f.dimensionName} · {f.candidateScore}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
