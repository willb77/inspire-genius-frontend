/**
 * AudioControls — transport bar for the Meridian voice player.
 *
 * Rewind 10s · Play/Pause · Stop (cancel) · Forward 10s, with a progress bar.
 * Driven by the useMeridianVoice return shape.
 */
import { Rewind, FastForward, Play, Pause, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export type AudioControlsProps = {
  loading: boolean
  ready: boolean
  playing: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onStop: () => void
  onSeek: (delta: number) => void
  className?: string
}

export default function AudioControls(p: AudioControlsProps) {
  if (!p.ready && !p.loading) return null
  const pct = p.duration > 0 ? Math.min(100, (p.currentTime / p.duration) * 100) : 0
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 ${p.className ?? ""}`}>
      {p.loading ? (
        <span className="flex items-center text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing audio…</span>
      ) : (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Rewind 10s" onClick={() => p.onSeek(-10)}>
            <Rewind className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title={p.playing ? "Pause" : "Play"} onClick={p.onPlayPause}>
            {p.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Stop" onClick={p.onStop}>
            <Square className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Forward 10s" onClick={() => p.onSeek(10)}>
            <FastForward className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-16 text-right text-[11px] tabular-nums text-slate-500">
            {fmt(p.currentTime)} / {fmt(p.duration)}
          </span>
        </>
      )}
    </div>
  )
}
