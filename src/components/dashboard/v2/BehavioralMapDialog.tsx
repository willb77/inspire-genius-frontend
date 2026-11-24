/**
 * "Behavioral map" pill + popup for HomeV2's My Workspace — shows the user's
 * OWN PRISM behavioral map as the productionised radial wheel
 * (`PrismRadialMap`, via the shared `PrismSelfMapContent`) plus the numeric
 * scores. Rendered next to the PRISM CSV filename.
 */
import { useTranslation } from "react-i18next"
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
import { withPrism } from "@/lib/withPrism"

/**
 * Uncontrolled by default (its own "Behavioral Scores" pill). Pass `open` +
 * `onOpenChange` to drive it from elsewhere, and `hideTrigger` when the host
 * supplies the opening control itself (Home's "View Scores").
 */
export function BehavioralMapDialog({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
} = {}) {
  const { t } = useTranslation("shellUi")
  const [innerOpen, setInnerOpen] = useState(false)
  const controlled = controlledOpen !== undefined
  const open = controlled ? controlledOpen : innerOpen
  const setOpen = (next: boolean): void => {
    if (!controlled) setInnerOpen(next)
    onOpenChange?.(next)
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="homev2-behavioral-scores"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ig-accent-hover/40 bg-ig-accent-hover/10 px-3 py-1 text-[12px] font-medium text-ig-accent transition-colors hover:bg-ig-accent-hover/20"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("behavioralMap.scoresPill", { defaultValue: "Behavioral Scores" })}
        </button>
      )}

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("behavioralMap.title", { defaultValue: "Your behavioral map" })}</DialogTitle>
            <DialogDescription>
              {withPrism(t("behavioralMap.description", { defaultValue: "Your PRISM 8-dimension profile and scores." }))}
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
