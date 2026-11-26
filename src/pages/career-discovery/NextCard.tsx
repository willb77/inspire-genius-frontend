import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DiscoveryJourney } from "@/types/career-discovery"
import { nextStageOf } from "@/lib/career-discovery/nextStage"
import { STAGE_ROUTES } from "./stageRoutes"

/**
 * "Next: {stage}" — the server's next action as a card with one link.
 *
 * Extracted from JourneyPage unchanged (same keys, classes and element tree), so
 * the journey page renders the same DOM. Phase C-a also renders it from
 * DiscoveryShell above the other pages when `careers_jobs_flow` is on.
 * CSA: docs/analysis/2026-11-25-careers-jobs-c-a-next-card-build-csa.md (monorepo).
 */
export function NextCard({ journey }: { journey: DiscoveryJourney }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const next = nextStageOf(journey)
  if (!next) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("journeyNext", { defaultValue: "Next: {{name}}", name: next.name })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{next.question}</p>
        <Button asChild size="sm">
          <Link to={STAGE_ROUTES[next.id]}>{t("journeyGoTo", { defaultValue: "Go to {{name}}", name: next.name })}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
