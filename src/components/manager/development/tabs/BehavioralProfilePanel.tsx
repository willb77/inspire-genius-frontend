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
}

export function BehavioralProfilePanel({ profile, onInvite }: BehavioralProfilePanelProps) {
  const sk = useDevSkin()
  const { prism, clifton, disc, reconciliation, coverage } = profile

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
