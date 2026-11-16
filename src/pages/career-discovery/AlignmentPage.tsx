import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { discoveryErrorMessage, useDiscoveryAlignment } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

const verdicts = (t: TFunction): Record<string, string> => ({
  supported: t("alignVerdictSupported", "Suits your wiring"),
  mixed: t("alignVerdictMixed", "Mixed"),
  "at-tension": t("alignVerdictAtTension", "At tension with your wiring"),
  unmapped: t("alignVerdictUnmapped", "Not matched to a career area"),
  unscored: t("alignVerdictUnscored", "Needs PRISM"),
})

export default function AlignmentPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const { journey } = useDiscoveryContext()
  const { stored, job, start, running } = useDiscoveryAlignment(journey.mayProceed)
  if (stored.isLoading) return <DiscoveryLoading label={t("alignLoading", "Loading goals vs wiring")} />
  if (stored.isError) return <DiscoveryError message={discoveryErrorMessage(stored.error)} />
  const result = stored.data?.result ?? null
  const failed = job.data?.status === "error" || stored.data?.job?.status === "error"
  return (
    <div className="space-y-6">
      <StageHeader
        title={t("alignTitle", "Goals vs wiring")}
        lead={t("alignLead", "Each of your goals read against how you're wired.")}
      />
      {start.isError ? <DiscoveryError message={discoveryErrorMessage(start.error)} /> : null}
      {job.isError ? <DiscoveryError message={discoveryErrorMessage(job.error)} /> : null}
      {failed && !running ? <DiscoveryError message={t("alignFailed", "The last check didn't finish. Run it again.")} /> : null}
      {running ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("alignWorking", "Working it out — this takes a little while.")}
        </p>
      ) : (
        <Button onClick={() => start.mutate()} disabled={start.isPending}>
          {result ? t("alignCheckAgain", "Check again") : t("alignCheckGoals", "Check my goals")}
        </Button>
      )}
      {result ? (
        result.goalsPending ? (
          <NoticeCard title={t("alignNoGoalsTitle", "No goals to check yet")}>
            <p>{result.note ?? t("alignNoGoalsBody", "Set a goal in Goals Studio first.")}</p>
          </NoticeCard>
        ) : (
          <div className="space-y-3">
            {(result.goals ?? []).map((g) => (
              <Card key={g.goalId ?? g.title}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-muted-foreground">{verdicts(t)[g.verdict] ?? g.verdict}</p>
                  {g.statement ? <p>{g.statement}</p> : null}
                </CardContent>
              </Card>
            ))}
            {result.note ? <p className="text-xs text-muted-foreground">{result.note}</p> : null}
          </div>
        )
      ) : null}
    </div>
  )
}
