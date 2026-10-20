import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { discoveryErrorMessage, useDiscoveryPays } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, PayRange, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

export default function PaysPage() {
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryPays(journey.mayProceed)
  if (isLoading) return <DiscoveryLoading label="Loading pay ranges" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  return (
    <div className="space-y-6">
      <StageHeader
        title="What it pays"
        lead={data.ranked ? "Pay for your top career areas." : "Pay across every career area — add your PRISM to rank them for you."}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.areas.map((a) => (
          <Card key={a.family}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{a.family}</CardTitle>
            </CardHeader>
            <CardContent>
              <PayRange range={a.range} />
            </CardContent>
          </Card>
        ))}
      </div>
      {data.note ? <p className="max-w-3xl text-xs text-muted-foreground">{data.note}</p> : null}
    </div>
  )
}
