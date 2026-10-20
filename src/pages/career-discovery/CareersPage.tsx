import { Card, CardContent } from "@/components/ui/card"
import { discoveryErrorMessage, useDiscoveryCareers } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

export default function CareersPage() {
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryCareers(journey.mayProceed)
  if (isLoading) return <DiscoveryLoading label="Ranking career areas" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  return (
    <div className="space-y-6">
      <StageHeader
        title="Career areas"
        lead="Kinds of work ranked against how you're wired. Closer is a better natural fit — not the only thing you can do."
      />
      {data.families.length === 0 ? (
        <NoticeCard title="Nothing to rank yet">
          <p>{data.note ?? "Add your PRISM and your career areas will appear here."}</p>
        </NoticeCard>
      ) : (
        <ol className="space-y-3">
          {data.families.map((f, i) => (
            <li key={f.family}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                  <span className="font-medium">
                    {i + 1}. {f.family}
                  </span>
                  <span className="text-muted-foreground">{Math.round(f.affinity)}% natural fit</span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
      {data.families.length > 0 && data.note ? (
        <p className="max-w-3xl text-xs text-muted-foreground">{data.note}</p>
      ) : null}
    </div>
  )
}
