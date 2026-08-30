/**
 * "Behavioral map" pill + popup for HomeV2's My Workspace — shows the user's
 * OWN PRISM behavioral map as the productionised radial wheel
 * (`PrismRadialMap`, via the shared `PrismSelfMapContent`) plus the numeric
 * scores. Rendered next to the PRISM CSV filename.
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
import { PrismSelfMapContent } from "@/components/prism/PrismSelfMapContent"

export function BehavioralMapDialog() {
  const [open, setOpen] = useState(false)

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
          {/* Mount (and fetch) only while open — keeps the query out of the
              closed tile's render, which has no QueryClientProvider in tests. */}
          {open ? <PrismSelfMapContent /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BehavioralMapDialog
