import { useQuery } from "@tanstack/react-query"
import { getResumeWriterTailoredEnabled } from "@/services/switches/resumeWriterTailored.service"

/**
 * RW2: `true` only when the server says `resume_writer_tailored` is on. Fails
 * closed — loading, an error (a 404 from an engine without the route) and "off"
 * all read as `false`, so Career Fit's "Write résumé" behaves exactly as today
 * until the switch row exists.
 */
export function useResumeWriterTailoredEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "resume-writer-tailored"],
    queryFn: getResumeWriterTailoredEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
