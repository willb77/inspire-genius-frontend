/**
 * PrismBadge (G9 Agent C) — small "PRISM ready" chip for the Meridian
 * chat header.
 *
 * - Hidden until the G9 P2 ingest pipeline has produced a CSV
 *   (`useLatestPrismStatus().hasReadyPrism === true`).
 * - On click, opens a tooltip with the CSV filename + last completion
 *   date. Tooltip is keyboard-accessible (focus + hover via Radix).
 *
 * Pure UI — server state comes from `useLatestPrismStatus()` which wraps
 * the existing `useMyPrismRequests()` hook (no extra network call).
 */
import { useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLatestPrismStatus } from '@/hooks/prism/usePrismRequest'

function formatCompletionDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString()
}

export default function PrismBadge() {
  const { hasReadyPrism, completed_at } = useLatestPrismStatus()

  const completionDate = useMemo(
    () => formatCompletionDate(completed_at),
    [completed_at],
  )

  if (!hasReadyPrism) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-testid="prism-ready-badge"
            aria-label="PRISM ready — click for details"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
          >
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>PRISM ready</span>
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {/* The completion date used to be nested inside a filename branch
              fed by `csv_s3_key` — an internal S3 object key that
              GET /v1/prism/requests/me does not return, so the date never
              rendered. The filename was a machine artifact
              ("PRISM,W,B,2026-06-15.csv") of no use to a user, and exposing
              the key would have leaked bucket layout and the user id to the
              browser. The date is what people actually want, and it is
              already in the payload. */}
          <div>
            <div className="font-medium">PRISM result available</div>
            {completionDate && (
              <div className="text-muted-foreground">
                Completed: {completionDate}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
