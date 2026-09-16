/**
 * Behavioral Profile tab — PRISM radar (with a11y text table), CliftonStrengths,
 * DISC, and Aura's cross-framework reconciliation.
 *
 * PRISM is the source of truth; Clifton & DISC are interpretive overlays.
 * Missing frameworks render as "Invite to add" cards and lower the displayed
 * confidence. No client-side re-scoring — all numbers come from the dossier.
 */
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { BEHAVIOUR_CONFIG, QUADRANT_CONFIG } from "@/constants/prism"
import {
  CLIFTON_DOMAIN_CONFIG,
  CONFIDENCE_BADGE_VARIANT,
  CONFIDENCE_LABEL,
  DISC_LEGEND,
} from "@/constants/development"
import type {
  BehavioralProfile,
  CliftonTheme,
  PrismQuadrantId,
} from "@/types/development"
import { useDevSkin } from "../skin"

type CliftonDomain = CliftonTheme["domain"]

const CLIFTON_DOMAINS: CliftonDomain[] = [
  "executing",
  "influencing",
  "relationship_building",
  "strategic_thinking",
]

function quadrantColor(q: PrismQuadrantId): string {
  return QUADRANT_CONFIG[q].color
}

function InviteToAddCard({ framework, onInvite }: { framework: string; onInvite?: () => void }) {
  const sk = useDevSkin()
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-start gap-2 p-4">
        <div className={cn("text-sm font-medium", sk.text700)}>Invite to add {framework}</div>
        <p className={cn("text-xs", sk.text500)}>
          Not yet assessed. This overlay is missing, which lowers reconciliation confidence.
        </p>
        {onInvite ? (
          <Button size="sm" variant="outline" onClick={onInvite}>
            Send invite
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export type BehavioralProfilePanelProps = {
  profile: BehavioralProfile
  onInvite?: (framework: "prism" | "clifton" | "disc") => void
  /** TDS-1b: the member holds a PRISM but has not shared it with this caller. */
  notShared?: boolean
  /** TDS-1b: no IG account, so nobody can answer a request. */
  noAccount?: boolean
  /** Ask the member for the `prism` category. Asking grants nothing. */
  onRequestAccess?: () => void
  requestPending?: boolean
  requestSent?: boolean
  memberName?: string
}

export function BehavioralProfilePanel({
  profile, onInvite, notShared, noAccount, onRequestAccess, requestPending, requestSent, memberName,
}: BehavioralProfilePanelProps) {
  const sk = useDevSkin()
  const { prism, clifton, disc, reconciliation, coverage } = profile
  const who = memberName?.trim() || "This member"

  // TDS-1b. FIRST, before every other branch — and that order is the whole
  // point. The redaction empties `prism` while PRESERVING `coverage.prism`,
  // so without this the next branch down renders "Invite to complete PRISM"
  // at a member who completed it years ago and simply did not share it. That
  // sentence is both false and unfixable by its own call to action.
  if (notShared) {
    // `coverage.prism` survives the redaction ON PURPOSE — see
    // service.redact_prism_not_shared, which says so outright: whether a PRISM
    // EXISTS is not the secret. Read it here, or this state asserts a profile
    // that may not exist, telling a manager their report is withholding
    // something they never had and offering an ask nobody can satisfy.
    // Shipped without this check earlier today; with zero live `prism` grants
    // every member lands here, so every member without a PRISM got the claim.
    const onFile = coverage.prism
    return (
      <div className="space-y-6" data-testid="prism-state-not-shared">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className={cn("h-5 w-5", sk.text400)} aria-hidden="true" />
            <div className={cn("text-sm font-semibold", sk.text900)}>
              {onFile ? "Not shared with you" : "Nothing on file yet"}
            </div>
            <p className={cn("max-w-md text-sm", sk.text600)}>
              {onFile ? (
                <>
                  {who} has a PRISM profile on file but has not shared it with you. Nobody sees a
                  behavioural profile by rank — they choose, person by person, from their own
                  workspace. You can ask; asking grants nothing.
                </>
              ) : (
                <>
                  {who} has no PRISM profile on file, so there is nothing to share yet. Nobody
                  sees a behavioural profile by rank; this stays empty until they complete PRISM
                  and choose to share it.
                </>
              )}
            </p>
            {!onFile ? (
              // No profile means no ask: a request to share something that
              // does not exist cannot be granted, and would read to the member
              // as their manager asking for a thing they never made.
              <p className={cn("text-sm", sk.text500)} data-testid="prism-state-none-on-file">
                There is nothing to ask for yet.
              </p>
            ) : noAccount ? (
              // Measured 2026-09-14: all seven Studio-added rows on staging-b
              // carry synthetic member_ids matching no account, and
              // consent/people.py finds a roster manager by `member_id =
              // :caller` — a synthetic id never equals a real sub. Offering
              // the ask here would report "Asked. They decide" for a request
              // no human can ever see.
              <p className={cn("text-sm", sk.text500)} data-testid="prism-state-no-account">
                {who} has no Inspires Genius account, so there is nobody to ask. A profile is
                shared by the person it describes.
              </p>
            ) : requestSent ? (
              <p className={cn("text-sm", sk.text500)} data-testid="prism-request-sent">
                Asked. {who} decides, and declining carries no consequence for them.
              </p>
            ) : onRequestAccess ? (
              <Button variant="outline" onClick={onRequestAccess} disabled={requestPending}>
                {requestPending ? "Asking…" : "Ask to see this profile"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  const radarData = prism.map((d) => ({
    dimension: d.label || BEHAVIOUR_CONFIG[d.id]?.label || `Dim ${d.id}`,
    score: d.score,
    quadrant: d.quadrant,
  }))

  return (
    <div className="space-y-6">
      {/* PRISM radar + text table */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("text-base", sk.heading)}>PRISM behavioral map</CardTitle>
        </CardHeader>
        <CardContent>
          {coverage.prism && prism.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 w-full" data-testid="prism-radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Radar
                      name="PRISM"
                      dataKey="score"
                      stroke={sk.brandHex}
                      fill={sk.brandHex}
                      fillOpacity={0.25}
                      dot={(props: { cx?: number; cy?: number; payload?: { quadrant?: PrismQuadrantId } }) => {
                        const q = props.payload?.quadrant ?? 1
                        return (
                          <circle
                            key={`${props.cx}-${props.cy}`}
                            cx={props.cx}
                            cy={props.cy}
                            r={3.5}
                            fill={quadrantColor(q as PrismQuadrantId)}
                            stroke="#fff"
                            strokeWidth={1}
                          />
                        )
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Text-equivalent table for accessibility */}
              <Table>
                <caption className="sr-only">
                  PRISM 8-dimension scores (text equivalent of the radar chart).
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dimension</TableHead>
                    <TableHead>Quadrant</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prism.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.label || BEHAVIOUR_CONFIG[d.id]?.label}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: quadrantColor(d.quadrant) }}
                            aria-hidden="true"
                          />
                          {QUADRANT_CONFIG[d.quadrant].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <InviteToAddCard framework="PRISM" onInvite={onInvite ? () => onInvite("prism") : undefined} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CliftonStrengths */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("text-base", sk.heading)}>CliftonStrengths</CardTitle>
          </CardHeader>
          <CardContent>
            {coverage.clifton && clifton && clifton.length > 0 ? (
              <div className="space-y-4">
                {CLIFTON_DOMAINS.map((domain) => {
                  const themes = clifton
                    .filter((c) => c.domain === domain)
                    .sort((a, b) => a.rank - b.rank)
                  if (themes.length === 0) return null
                  const cfg = CLIFTON_DOMAIN_CONFIG[domain]
                  return (
                    <div key={domain}>
                      <div className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold", sk.text600)}>
                        {cfg.label}
                        <span className={sk.text400}>→</span>
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${quadrantColor(cfg.prismQuadrant)}1a`,
                            color: quadrantColor(cfg.prismQuadrant),
                          }}
                        >
                          {QUADRANT_CONFIG[cfg.prismQuadrant].label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {themes.map((th) => (
                          <Badge key={th.name} variant="secondary" className="gap-1">
                            <span className={cn("tabular-nums", sk.text400)}>{th.rank}</span>
                            {th.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <InviteToAddCard framework="CliftonStrengths" onInvite={onInvite ? () => onInvite("clifton") : undefined} />
            )}
          </CardContent>
        </Card>

        {/* DISC */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("text-base", sk.heading)}>DISC</CardTitle>
          </CardHeader>
          <CardContent>
            {coverage.disc && disc ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={cn("rounded px-2 py-1", sk.bgMuted100)}>
                    Primary: <strong>{disc.primaryStyle}</strong>
                  </span>
                  {disc.adaptedStyle ? (
                    <span className={cn("rounded px-2 py-1", sk.bgMuted100)}>
                      Adapted: <strong>{disc.adaptedStyle}</strong>
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {(["d", "i", "s", "c"] as const).map((k) => {
                    const legend = DISC_LEGEND[k]
                    const value = disc[k]
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className={cn("w-24 shrink-0 text-xs", sk.text600)}>{legend.label}</span>
                        <div className={cn("h-2 flex-1 overflow-hidden rounded", sk.bgMuted100)}>
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${Math.max(0, Math.min(100, value))}%`,
                              backgroundColor: quadrantColor(legend.prismQuadrant),
                            }}
                          />
                        </div>
                        <span className={cn("w-8 text-right text-xs tabular-nums", sk.text600)}>{value}</span>
                      </div>
                    )
                  })}
                </div>
                <p className={cn("text-[11px]", sk.text400)}>
                  Legend: D→Red · I→Green · S→Green · C→Blue (PRISM quadrant mapping)
                </p>
              </div>
            ) : (
              <InviteToAddCard framework="DISC" onInvite={onInvite ? () => onInvite("disc") : undefined} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className={cn("text-base", sk.heading)}>Aura reconciliation</CardTitle>
          <Badge variant={CONFIDENCE_BADGE_VARIANT[reconciliation.confidence]}>
            {CONFIDENCE_LABEL[reconciliation.confidence]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={cn("text-sm font-medium", sk.text800)}>{reconciliation.headline}</p>
          <p className={cn("text-sm", sk.text600)}>{reconciliation.throughLine}</p>

          {reconciliation.discrepancies.length > 0 ? (
            <div>
              <div className={cn("mb-1 text-xs font-semibold", sk.text500)}>Discrepancies</div>
              <ul className={cn("list-inside list-disc space-y-1 text-sm", sk.text600)}>
                {reconciliation.discrepancies.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {reconciliation.actionableInsights && reconciliation.actionableInsights.length > 0 ? (
            <div className={cn("rounded-lg p-3", sk.bgMuted50)}>
              <div className={cn("mb-1 text-xs font-semibold", sk.text500)}>How to work with this person</div>
              <ul className={cn("space-y-1 text-sm", sk.text700)}>
                {reconciliation.actionableInsights.map((ins, i) => (
                  <li key={i}>• {ins}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {(!coverage.clifton || !coverage.disc) && (
            <p className="text-[11px] italic text-amber-600">
              Reconciliation is at reduced resolution — one or more overlays are missing, so
              confidence is lowered accordingly.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
