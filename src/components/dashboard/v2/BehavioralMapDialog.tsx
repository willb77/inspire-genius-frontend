/**
 * "View behavioral map" link + popup for HomeV2's My Workspace — shows the
 * user's OWN PRISM behavioral map (the same radar the manager sees on a member
 * card) plus the numeric scores. Rendered next to the PRISM CSV filename.
 */
import { useState } from "react"
import { Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PrismBehavioralMap } from "@/components/prism/PrismBehavioralMap"
import { useMyPrism } from "@/hooks/prism/useMyPrism"

export function BehavioralMapDialog() {
  const [open, setOpen] = useState(false)
  // Only fetch once the popup is opened.
  const { data, isLoading, isError } = useMyPrism(open)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E8932B]/40 bg-[#E8932B]/10 px-2 py-0.5 text-[11px] font-medium text-[#C9711A] transition-colors hover:bg-[#E8932B]/20"
      >
        <Sparkles className="size-3" aria-hidden="true" />
        Behavioral map
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your behavioral map</DialogTitle>
            <DialogDescription>
              Your PRISM 8-dimension profile and scores.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading your behavioral map…
            </p>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Couldn't load your behavioral map. Please try again.
            </p>
          ) : data?.hasData ? (
            <PrismBehavioralMap prism={data.dimensions} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No PRISM assessment found yet. Complete a PRISM assessment to see
              your behavioral map here.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BehavioralMapDialog
