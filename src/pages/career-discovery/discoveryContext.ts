import { useOutletContext } from "react-router-dom"
import type { DiscoveryJourney } from "@/types/career-discovery"

/** What the Discovery shell hands every stage page once its gates have passed. */
export type DiscoveryContext = { journey: DiscoveryJourney }

export function useDiscoveryContext(): DiscoveryContext {
  return useOutletContext<DiscoveryContext>()
}
