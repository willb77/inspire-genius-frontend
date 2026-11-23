import { useQuery } from "@tanstack/react-query"
import { getHomeAboutYouPanelEnabled } from "@/services/switches/homeAboutYouPanel.service"

export type HomeAboutYouPanelStatus = "loading" | "on" | "off"

/**
 * HOME-1: the `home_about_you_panel` switch with its settled/unsettled state
 * kept apart. Home needs the difference: while the panel is on, the controls it
 * replaces stay hidden, but while the answer is still in flight (or the switch
 * is off) they must not flash in and out or vanish with no replacement.
 */
export function useHomeAboutYouPanelStatus(): HomeAboutYouPanelStatus {
  const q = useQuery({
    queryKey: ["switches", "home-about-you-panel"],
    queryFn: getHomeAboutYouPanelEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  if (q.isLoading) return "loading"
  return q.data === true ? "on" : "off"
}

/**
 * HOME-1: `true` only when the server says `home_about_you_panel` is on.
 * Fails closed. Loading, an error (a 404 from an engine without the route
 * included) and "off" all read as `false`, so Home renders exactly as before
 * until the switch row exists.
 */
export function useHomeAboutYouPanelEnabled(): boolean {
  return useHomeAboutYouPanelStatus() === "on"
}
