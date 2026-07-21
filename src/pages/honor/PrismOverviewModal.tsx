import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X, PlayCircle } from "lucide-react"

/**
 * PRISM Overview — a lightweight modal that will host short explainer videos
 * ("What is PRISM?", reading the three maps, etc.). Video sources are added later;
 * for now each slot shows a placeholder. Kept dependency-free (portal + overlay) to
 * match the Honor surface's hand-rolled styling.
 */

type PrismVideo = { id: string; title: string; blurb: string; src?: string }

/** Placeholder line-up. Wire `src` (mp4 / HLS / embed URL) when the videos are ready. */
const PRISM_OVERVIEW_VIDEOS: PrismVideo[] = [
  { id: "what-is-prism", title: "What is PRISM?", blurb: "A 2-minute primer on PRISM Brain Mapping and what the report tells you." },
  { id: "three-maps", title: "Reading the three maps", blurb: "Underlying, Adaptive and Consistent — what each map means and when to use it." },
  { id: "behaviour-prefs", title: "Behaviour preferences", blurb: "The eight core behaviours and the colour energies behind them." },
  { id: "coach-with-prism", title: "Coaching with PRISM", blurb: "How to walk a Fellow through their profile in a session." },
]

export default function PrismOverviewModal({
  open,
  onClose,
  videos = PRISM_OVERVIEW_VIDEOS,
}: {
  open: boolean
  onClose: () => void
  videos?: PrismVideo[]
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PRISM Overview"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#18202f]">PRISM Overview</h2>
            <p className="mt-0.5 text-sm text-[#5b6678]">
              Short explainers on how to read a PRISM report. More coming soon.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5b6678] hover:bg-[#f1f3f7] hover:text-[#18202f]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-xl border border-[#e6e9ef]">
              <div className="relative aspect-video bg-[#0f172a]">
                {v.src ? (
                  <video className="h-full w-full" src={v.src} controls preload="metadata" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/70">
                    <PlayCircle className="h-9 w-9" />
                    <span className="text-xs">Video coming soon</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-[#18202f]">{v.title}</p>
                <p className="mt-0.5 text-xs text-[#5b6678]">{v.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
