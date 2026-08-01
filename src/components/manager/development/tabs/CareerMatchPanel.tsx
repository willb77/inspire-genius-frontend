/**
 * Career & Job Matches tab — internal/external toggle, ranked matches with
 * fit score, classification, short rationale, and (external) O*NET code,
 * required education, and automation-risk hints. Actions drive Gap Analysis.
 * Carries the human-decision disclaimer.
 */
import { useState } from "react"
import { Bot, ExternalLink, GraduationCap, Info, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DEVELOPMENT_INPUT_DISCLAIMER, FIT_CLASSIFICATION_LABEL } from "@/constants/development"
import type { CareerMatch, FitClassification } from "@/types/development"
import { useDevSkin } from "../skin"

const CLASS_STYLE: Record<FitClassification, string> = {
  strong_fit: "border-emerald-200 text-emerald-700",
  potential_fit: "border-amber-200 text-amber-700",
  misalignment: "border-red-200 text-red-700",
}

export type CareerMatchPanelProps = {
  internal: CareerMatch[]
  external: CareerMatch[]
  loading?: boolean
  /** Set a match as the Gap Analysis target (drives that tab). */
  onSetTarget?: (match: CareerMatch) => void
  /** Jump to the Gap Analysis tab focused on this role. */
  onViewGaps?: (match: CareerMatch) => void
}

export function CareerMatchPanel({
  internal,
  external,
  loading,
  onSetTarget,
  onViewGaps,
}: CareerMatchPanelProps) {
  const sk = useDevSkin()
  const [kind, setKind] = useState<"internal" | "external">("internal")
  const matches = kind === "internal" ? internal : external
  const sorted = [...matches].sort((a, b) => b.fitScore - a.fitScore)

  return (
    <div className="space-y-4">
      <div className={cn("inline-flex rounded-lg border p-0.5", sk.border200)} role="tablist" aria-label="Match kind">
        {(["internal", "external"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              kind === k ? cn(sk.accentBg, "text-white") : cn("hover:text-slate-900", sk.text600),
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <p className={cn("flex items-start gap-1.5 rounded-md p-2.5 text-[11px]", sk.bgMuted50, sk.text500)}>
        <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sk.text400)} aria-hidden="true" />
        <span>{DEVELOPMENT_INPUT_DISCLAIMER}</span>
      </p>

      {loading ? (
        <div className={cn("py-10 text-center text-sm", sk.text400)}>Loading matches…</div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
            No {kind} matches yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sorted.map((m, i) => (
            <Card key={m.matchId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">
                    <span className={cn("mr-1.5", sk.text400)}>#{i + 1}</span>
                    {m.title}
                  </CardTitle>
                  <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", sk.text700)}>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    {Math.round(m.fitScore)}%
                  </span>
                </div>
                <Badge variant="outline" className={cn("w-fit", CLASS_STYLE[m.classification])}>
                  {FIT_CLASSIFICATION_LABEL[m.classification]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={cn("text-xs", sk.text600)}>{m.rationale}</p>
                {m.kind === "external" ? (
                  <div className={cn("flex flex-wrap gap-2 text-[11px]", sk.text500)}>
                    {m.onetCode ? (
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", sk.bgMuted100)}>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        O*NET {m.onetCode}
                      </span>
                    ) : null}
                    {m.requiredEducation ? (
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", sk.bgMuted100)}>
                        <GraduationCap className="h-3 w-3" aria-hidden="true" />
                        {m.requiredEducation}
                      </span>
                    ) : null}
                    {m.automationRiskHint ? (
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", sk.bgMuted100)}>
                        <Bot className="h-3 w-3" aria-hidden="true" />
                        {m.automationRiskHint}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {onSetTarget ? (
                    <Button size="sm" variant="outline" onClick={() => onSetTarget(m)}>
                      Set as target
                    </Button>
                  ) : null}
                  {onViewGaps ? (
                    <Button size="sm" variant="ghost" onClick={() => onViewGaps(m)}>
                      View gaps to this role
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
