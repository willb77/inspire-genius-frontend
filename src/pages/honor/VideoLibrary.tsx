import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Film, ChevronDown, PlayCircle, X } from "lucide-react"
import { HONOR_VIDEOS, type HonorVideo } from "./_videos"

/**
 * Videos — a dropdown of the available movies. Selecting one opens a pop-up
 * modal that plays it. Dependency-free (portal + overlay) to match the Honor
 * surface's hand-rolled styling. The catalog lives in {@link HONOR_VIDEOS}.
 */
export default function VideoLibrary({ videos = HONOR_VIDEOS }: { videos?: HonorVideo[] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<HonorVideo | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener("mousedown", onDown)
    return () => window.removeEventListener("mousedown", onDown)
  }, [menuOpen])

  function pick(v: HonorVideo) {
    setActive(v)
    setMenuOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#dfe4ec] bg-white px-4 py-2.5 text-sm font-medium text-[#1B2A4A] transition-colors hover:border-[#E8792B] hover:text-[#c9631a]"
      >
        <Film className="h-4 w-4" />
        Choose a video
        <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-[22rem] max-w-[90vw] overflow-auto rounded-xl border border-[#e6e9ef] bg-white p-1.5 shadow-xl"
        >
          {videos.map((v) => (
            <li key={v.id} role="option" aria-selected={active?.id === v.id}>
              <button
                type="button"
                onClick={() => pick(v)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#f7f9fc]"
              >
                <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E8792B]" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#18202f]">{v.title}</span>
                  <span className="block text-xs text-[#9299a6]">{v.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <VideoPlayerModal video={active} onClose={() => setActive(null)} />
    </div>
  )
}

/** Pop-up player for a single selected video. */
function VideoPlayerModal({ video, onClose }: { video: HonorVideo | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [video, onClose])

  if (!video) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-[#18202f]">{video.title}</h2>
            <p className="mt-0.5 text-xs text-[#5b6678]">{video.blurb}</p>
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
        <div className="bg-black">
          <video
            key={video.id}
            className="aspect-video w-full"
            src={video.url}
            controls
            autoPlay
            preload="metadata"
            playsInline
          >
            <track kind="captions" />
            Your browser does not support the video tag.{" "}
            <a className="underline" href={video.url}>
              Download the video
            </a>
            .
          </video>
        </div>
      </div>
    </div>,
    document.body,
  )
}
