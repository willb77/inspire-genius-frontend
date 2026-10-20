import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { discoveryErrorMessage, useDiscoveryAlignment } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

const VERDICTS: Record<string, string> = {
  supported: "Suits your wiring",
  mixed: "Mixed",
  "at-tension": "At tension with your wiring",
  unmapped: "Not matched to a career area",
  unscored: "Needs PRISM",
}

export default function AlignmentPage() {
  const { journey } = useDiscoveryContext()
  const { stored, job, start, running } = useDiscoveryAlignment(journey.mayProceed)
  if (stored.isLoading) return <DiscoveryLoading label="Loading goals vs wiring" />
  if (stored.isError) return <DiscoveryError message={discoveryErrorMessage(stored.error)} />
  const result = stored.data?.result ?? null
  const failed = job.data?.status === "error" || stored.data?.job?.status === "error"
  return (
    <div className="space-y-6">
      <StageHeader title="Goals vs wiring" lead="Each of your goals read against how you're wired." />
      {start.isError ? <DiscoveryError message={discoveryErrorMessage(start.error)} /> : null}
      {job.isError ? <DiscoveryError message={discoveryErrorMessage(job.error)} /> : null}
      {failed && !running ? <DiscoveryError message="The last check didn't finish. Run it again." /> : null}
      {running ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Working it out — this takes a little while.
        </p>
      ) : (
        <Button onClick={() => start.mutate()} disabled={start.isPending}>
          {result ? "Check again" : "Check my goals"}
        </Button>
      )}
      {result ? (
        result.goalsPending ? (
          <NoticeCard title="No goals to check yet">
            <p>{result.note ?? "Set a goal in Goals Studio first."}</p>
          </NoticeCard>
        ) : (
          <div className="space-y-3">
            {(result.goals ?? []).map((g) => (
              <Card key={g.goalId ?? g.title}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-muted-foreground">{VERDICTS[g.verdict] ?? g.verdict}</p>
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
