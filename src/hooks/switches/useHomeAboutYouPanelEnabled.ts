import { useQuery } from "@tanstack/react-query"
import { getHomeAboutYouPanelEnabled } from "@/services/switches/homeAboutYouPanel.service"

/**
 * HOME-1: `true` only when the server says `home_about_you_panel` is on.
 * Fails closed. Loading, an error (a 404 from an engine without the route
 * included) and "off" all read as `false`, so Home renders exactly as before
 * until the switch row exists.
 */
export function useHomeAboutYouPanelEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "home-about-you-panel"],
    queryFn: getHomeAboutYouPanelEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
