import { Navigate } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { isProfileMerged } from "@/lib/career-discovery/profileSection"
import { useDiscoveryContext } from "./discoveryContext"
import { WhoSection } from "./profile/WhoSection"

/**
 * Who I am. JF-11: when the server shows it inside the one profile section
 * (`job_fit_v2` applies), an old /who link lands on that section instead;
 * otherwise this is today's page, unchanged.
 */
export default function WhoPage() {
  const { journey } = useDiscoveryContext()
  if (isProfileMerged(journey.stages)) {
    return <Navigate to={ROUTES.CAREER_DISCOVERY.ABOUT} replace />
  }
  return <WhoSection />
}
