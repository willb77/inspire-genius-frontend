import { useQuery } from "@tanstack/react-query"
import { getPrismPdfReplaceEnabled } from "@/services/switches/prismPdfReplace.service"

/**
 * PRISM-RR: `true` only when the server says `prism_pdf_replace` is on for the
 * caller. Fails closed — loading, an error (a 404 from an engine without the
 * route) and "off" all read as `false`, so Replace report keeps today's
 * CSV-required behaviour until the switch row exists.
 */
export function usePrismPdfReplaceEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "prism-pdf-replace"],
    queryFn: getPrismPdfReplaceEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
