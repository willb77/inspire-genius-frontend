import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { discoveryErrorMessage, useDiscoveryGoals } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

/** My goals — set in Goals Studio, read back here. Discovery keeps no copy of them. */
export default function GoalsPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryGoals(journey.mayProceed)
  if (isLoading) return <DiscoveryLoading label={t("goalsLoading", "Loading your goals")} />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  return (
    <div className="space-y-6">
      <StageHeader
        title={t("goalsTitle", "My goals")}
        lead={t("goalsLead", "What you want. You set and change goals in Goals Studio.")}
      />
      {data.count === 0 ? (
        <NoticeCard title={t("goalsEmptyTitle", "No goals yet")}>
          <p>{t("goalsEmptyBody", "Set a goal or two in Goals Studio, then come back here.")}</p>
        </NoticeCard>
      ) : (
        <ul className="space-y-2">
          {data.titles.map((title) => (
            <li key={title}>
              <Card>
                <CardContent className="p-4 text-sm">{title}</CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Button asChild>
        <Link to={ROUTES.MY_GOALS.BASE}>{t("goalsOpenStudio", "Open Goals Studio")}</Link>
      </Button>
    </div>
  )
}
