/**
 * "Captured to your profile" — the structured reflection shown inline in the
 * Chronicle transcript after a member's turn.
 *
 * Its whole job is to reflect back what the person just said, structured: the
 * module the turn landed in, each episode's title + facts (with people / places
 * / era when the extractor found them), and a single "what stands out" line.
 * This is what makes the surface feel like it's listening instead of running a
 * generic script.
 *
 * Render contract: the caller only mounts this for a `captured: true` turn with
 * at least one episode. As a defensive guard it still returns `null` when there
 * is nothing to show, so an empty capture can never render an empty card.
 */
import { Sparkles, MapPin, Users, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { moduleLabel } from "@/lib/bio/clientMemoir"
import type { CaptureResponse } from "@/types/bio"

export type CapturedTurnCardProps = {
  capture: CaptureResponse
  className?: string
}

export function CapturedTurnCard({ capture, className }: CapturedTurnCardProps) {
  const { moduleType, episodes, whatStandsOut } = capture

  // Defensive: never render an empty card. The caller already gates on
  // `captured`, but a captured turn with no episodes and no takeaway has
  // nothing to reflect back.
  if (episodes.length === 0 && !whatStandsOut) return null

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/[0.04] p-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-primary">
          Captured to your profile
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {moduleLabel(moduleType)}
        </Badge>
      </div>

      {episodes.length > 0 && (
        <ul className="space-y-2">
          {episodes.map((ep, i) => (
            <li key={`${ep.title}-${i}`} className="space-y-1">
              <div className="text-xs font-medium text-foreground">
                {ep.title}
              </div>
              {ep.facts && (
                <p className="text-xs text-muted-foreground">{ep.facts}</p>
              )}
              {(ep.people?.length ||
                ep.places?.length ||
                ep.era) && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ep.people?.length ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {ep.people.join(", ")}
                    </span>
                  ) : null}
                  {ep.places?.length ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {ep.places.join(", ")}
                    </span>
                  ) : null}
                  {ep.era ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {ep.era}
                    </span>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {whatStandsOut && (
        <p className="mt-2 border-t border-primary/10 pt-2 text-[11px] italic text-muted-foreground">
          {whatStandsOut}
        </p>
      )}
    </div>
  )
}

export default CapturedTurnCard
