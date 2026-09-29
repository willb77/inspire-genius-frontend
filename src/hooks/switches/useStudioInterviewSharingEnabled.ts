import { useQuery } from "@tanstack/react-query"
import { getStudioInterviewSharingEnabled } from "@/services/switches/studioInterviewSharing.service"

/** `true` only when the server says interview sharing is on. Loading, an
 * error and "off" all read as `false`, so the picker stays hidden. */
export function useStudioInterviewSharingEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "studio-interview-sharing"],
    queryFn: getStudioInterviewSharingEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
