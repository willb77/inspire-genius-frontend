import { isProfileMerged } from "@/lib/career-discovery/profileSection"
import { useDiscoveryJourney } from "./useCareerDiscovery"

/**
 * JF-11: whether the server shows About me + Who I am as one profile section
 * for this person. Reads the Discovery journey ONLY from the query cache
 * (`enabled: false`) — the Discovery shell's own query fills it — so a menu can
 * ask without making a request, and anywhere outside Discovery it is `false`.
 */
export function useProfileMerged(): boolean {
  const { data } = useDiscoveryJourney(false)
  return isProfileMerged(data?.stages)
}
