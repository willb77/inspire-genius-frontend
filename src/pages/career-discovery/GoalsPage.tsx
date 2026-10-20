import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { discoveryErrorMessage, useDiscoveryGoals } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

/** My goals — set in Goals Studio, read back here. Discovery keeps no copy of them. */
export default function GoalsPage() {
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryGoals(journey.mayProceed)
  if (isLoading) return <DiscoveryLoading label="Loading your goals" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  return (
    <div className="space-y-6">
      <StageHeader title="My goals" lead="What you want. You set and change goals in Goals Studio." />
      {data.count === 0 ? (
        <NoticeCard title="No goals yet">
          <p>Set a goal or two in Goals Studio, then come back here.</p>
        </NoticeCard>
      ) : (
        <ul className="space-y-2">
          {data.titles.map((t) => (
            <li key={t}>
              <Card>
                <CardContent className="p-4 text-sm">{t}</CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Button asChild>
        <Link to={ROUTES.MY_GOALS.BASE}>Open Goals Studio</Link>
      </Button>
    </div>
  )
}
