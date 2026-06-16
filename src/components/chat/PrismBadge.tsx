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

function csvFilename(key: string | null): string | null {
  if (!key) return null
  const tail = key.split('/').pop()
  return tail && tail.length > 0 ? tail : null
}

function formatCompletionDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString()
}

export default function PrismBadge() {
  const { hasReadyPrism, csv_s3_key, completed_at } = useLatestPrismStatus()

  const filename = useMemo(() => csvFilename(csv_s3_key), [csv_s3_key])
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
          {filename ? (
            <div>
              <div className="font-medium">{filename}</div>
              {completionDate && (
                <div className="text-muted-foreground">
                  Completed: {completionDate}
                </div>
              )}
            </div>
          ) : (
            <div>PRISM result available</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
