/**
 * The Self-Portrait's shared sections.
 *
 * Two pages render this data — Lumen's `/vertical/lumen/self-portrait` and the
 * Direction-Setting Establish stage — and until now each carried its own copy
 * of every constant and every block of JSX. The copies had already drifted in
 * ways nobody decided: different source-row copy, different card headers,
 * different empty-state wording.
 *
 * ## Why every page-specific thing arrives as a prop or a slot
 *
 * The two pages genuinely differ, and those differences are deliberate: the
 * journey stage speaks plain language ("How you tend to show up") where Lumen
 * speaks instrument language ("PRISM"), and only the journey stage has anywhere
 * to navigate to. Flattening those would be a regression dressed as a cleanup.
 *
 * **Nothing here may import `react-router-dom`.** `SelfPortrait.test.tsx`
 * renders the Lumen page with no router in the tree, so a `Link` reaching one
 * of these components throws `useHref() may be used only in the context of a
 * <Router>` and takes all eight of its tests with it. Navigation is passed in
 * as a `ReactNode` slot by the page that has a router.
 */
import type { ReactNode } from "react"
import { AlertTriangle, Check, Handshake, Minus, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  DIMENSION_GROUPS,
  QUADRANT_CLASS,
  QUADRANT_ROWS,
  SOURCE_ROWS,
  type PortraitSourceRow,
} from "@/constants/lumen/portrait"
import type {
  CorroboratingInstrument,
  PortraitEvidenceItem,
  PortraitSources,
  PrismAnchor,
} from "@/types/lumen"

export function PortraitSkeleton({ testId = "portrait-loading" }: { testId?: string }) {
  return (
    <div className="space-y-4" data-testid={testId}>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

/**
 * What the portrait is built from, present and absent alike.
 *
 * Rendered even when every source is missing — that state is precisely the one
 * where a user needs to be told why the page looks thin.
 */
export function PortraitSourceCoverage({
  sources,
  coverage,
  title = "What this is built from",
  showCount = false,
  footer,
  rows = SOURCE_ROWS,
}: {
  sources: PortraitSources
  coverage?: string
  title?: ReactNode
  /** The journey stage's "N of M sources on file" readout. Lumen never had it. */
  showCount?: boolean
  /** Navigation slot — the page owns the router, this component must not. */
  footer?: ReactNode
  rows?: PortraitSourceRow[]
}) {
  const present = rows.filter((row) => sources[row.key]).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCount && (
          <p className="text-sm text-muted-foreground">
            {present} of {rows.length} sources on file. Everything below is read
            from those — where a source is missing, the read is thinner rather
            than wrong.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(({ key, label, buys }) => {
            const has = sources[key]
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-sm",
                  has ? "border-emerald-200 bg-emerald-50/50" : "border-dashed"
                )}
              >
                {has ? (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-label="on file"
                  />
                ) : (
                  <Minus
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-label="not on file"
                  />
                )}
                <span>
                  <span className="block font-medium">{label}</span>
                  {!has && (
                    <span className="block text-xs text-muted-foreground">{buys}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        {coverage && <p className="text-sm text-muted-foreground">{coverage}</p>}
        {present < rows.length && footer}
      </CardContent>
    </Card>
  )
}

/** Shown in place of the PRISM card when there is no PRISM on file. */
export function PortraitNoPrism({
  title,
  headline,
  children,
}: {
  title: string
  headline?: string
  /** Navigation slot. */
  children?: ReactNode
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {headline && <p>{headline}</p>}
        <p>
          PRISM is the anchor the other sources get read against. Without it this
          reads what you&apos;ve told us, but can&apos;t yet corroborate it.
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

export function PortraitQuadrants({
  prism,
  title,
}: {
  prism: PrismAnchor
  title: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          <Badge className={QUADRANT_CLASS[prism.dominant_quadrant]}>
            {prism.dominant_quadrant} leads
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {QUADRANT_ROWS.map(({ key, label }) => {
          const value = prism.quadrants[key]
          if (value === undefined) return null
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="text-muted-foreground">{Math.round(value)}</span>
              </div>
              <Progress value={value} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

/**
 * The eight dimensions the four quadrant scores are averaged from.
 *
 * Deliberately styled apart from the quadrant card: those use shadcn
 * `<Progress>` at full height, these use shorter tinted bars in the
 * `PrismBehaviourChart` idiom, each carrying its own quadrant's colour. The
 * repo already treats bar height as the quadrant/dimension distinction
 * (`PrismQuadrantChart` h-3 vs `PrismBehaviourChart` h-2.5), so this follows an
 * existing convention rather than inventing one.
 *
 * Introversion/Extroversion render as a spectrum, not a bar. A bar asserts that
 * higher is more, and for energy direction there is no "more" — a `<Progress>`
 * here would be a claim the instrument does not make.
 */
export function PortraitDimensions({
  prism,
  title = "The eight behavioural dimensions",
}: {
  prism: PrismAnchor
  title?: ReactNode
}) {
  const dimensions = prism.dimensions ?? {}
  const orientation = prism.orientation ?? {}
  const hasDimensions = Object.keys(dimensions).length > 0
  const extroversion = orientation.extroversion
  const introversion = orientation.introversion
  const hasOrientation = extroversion !== undefined || introversion !== undefined

  if (!hasDimensions && !hasOrientation) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasDimensions && (
          <>
            <p className="text-sm text-muted-foreground">
              Each quadrant above is the average of the two dimensions below it.
              A Green of 68 built from Innovating 90 and Initiating 46 is a very
              different read from one built from 67 and 69.
              {prism.score_type
                ? ` These are your ${prism.score_type} scores.`
                : " The score variant wasn't recorded for these."}
            </p>
            <div className="space-y-4">
              {DIMENSION_GROUPS.map((group) => {
                const rows = group.dimensions.filter(
                  (d) => dimensions[d.key] !== undefined
                )
                if (rows.length === 0) return null
                return (
                  <div key={group.quadrant} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={QUADRANT_CLASS[group.quadrant]}>
                        {group.quadrant}
                      </Badge>
                    </div>
                    {rows.map(({ key, label, color }) => {
                      const value = dimensions[key] as number
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">
                              {Math.round(value)}
                            </span>
                          </div>
                          <div
                            className="h-2.5 w-full rounded-full bg-muted"
                            role="presentation"
                          >
                            <div
                              className="h-2.5 rounded-full transition-all"
                              style={{
                                width: `${Math.max(0, Math.min(100, value))}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {hasOrientation && (
          <>
            {hasDimensions && <Separator />}
            <div className="space-y-2">
              <p className="text-sm font-medium">Energy direction</p>
              <p className="text-xs text-muted-foreground">
                Measured alongside the eight, but part of no quadrant — and
                neither end is better than the other.
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Introverted
                  {introversion !== undefined && ` ${Math.round(introversion)}`}
                </span>
                <span>
                  Extroverted
                  {extroversion !== undefined && ` ${Math.round(extroversion)}`}
                </span>
              </div>
              {extroversion !== undefined && (
                <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-slate-300 to-slate-500">
                  <div
                    className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-foreground"
                    style={{
                      left: `${Math.max(0, Math.min(100, extroversion))}%`,
                    }}
                    aria-hidden
                  />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * What the résumé and bio contribute.
 *
 * Kept visually distinct from the instruments — no confidence figures, no
 * quadrant badges, no bars. Those belong to things that measure. This section
 * reports what someone wrote about themselves, and the caveat is rendered with
 * it rather than tucked away, because the whole risk here is that a reader
 * takes a description for a measurement.
 */
export function PortraitEvidence({
  evidence,
  note,
  title = "What your own words add",
}: {
  evidence: PortraitEvidenceItem[]
  note?: string | null
  title?: ReactNode
}) {
  if (!evidence || evidence.length === 0) return null

  const bySource: { source: "resume" | "bio"; label: string }[] = [
    { source: "resume", label: "From your résumé" },
    { source: "bio", label: "From your bio" },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {bySource.map(({ source, label }) => {
          const items = evidence.filter((e) => e.source === source)
          if (items.length === 0) return null
          return (
            <div key={source} className="space-y-1">
              <p className="text-sm font-medium">{label}</p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li
                    key={`${item.source}-${item.kind}-${item.label}`}
                    className="text-sm text-muted-foreground"
                  >
                    {item.detail}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function PortraitCorroborating({
  instruments,
  title,
}: {
  instruments: CorroboratingInstrument[]
  title: ReactNode
}) {
  if (instruments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {instruments.map((instrument) => (
          <div
            key={instrument.framework}
            className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{instrument.framework}</span>
              <Badge className={QUADRANT_CLASS[instrument.maps_to]}>
                {instrument.maps_to}
              </Badge>
              <Badge variant="outline">
                {instrument.agrees_with_prism ? "agrees" : "differs"}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              confidence {instrument.confidence.toFixed(2)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function PortraitAgreementGrid({
  convergences,
  tensions,
  convergenceTitle,
  convergenceEmpty,
  tensionTitle = "Where they pull apart",
  tensionPreamble,
}: {
  convergences: string[]
  tensions: string[]
  convergenceTitle: ReactNode
  convergenceEmpty: ReactNode
  tensionTitle?: ReactNode
  tensionPreamble?: ReactNode
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Handshake className="h-5 w-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{convergenceTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {convergences.length === 0 ? (
            <p>{convergenceEmpty}</p>
          ) : (
            convergences.map((line) => <p key={line}>{line}</p>)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{tensionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {tensions.length === 0 ? (
            <p>No tensions surfaced. Your instruments tell a consistent story.</p>
          ) : (
            <>
              {tensionPreamble}
              {tensions.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function PortraitAnchorNote() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      PRISM is the anchor — where another instrument disagrees, PRISM leads and the
      difference is shown rather than resolved away.
    </p>
  )
}
