/**
 * "Session recap" — the summary + overview shown inside the interview tile when
 * a Bio Capture interview is stopped or completed.
 *
 * It reflects the whole session back at a glance: a one-line summary, the
 * headline numbers (turns, chapters touched, memories captured), the "what
 * stands out" threads Chronicle surfaced, and the titles of what was captured.
 * Built entirely from what the panel already holds — no extra round-trip — so it
 * renders instantly the moment the member ends the interview.
 */
import { BookOpenCheck, Layers, MessageSquare, Sparkles } from "lucide-react"
import { moduleLabel } from "@/lib/bio/clientMemoir"

export type SessionRecap = {
  summary: string
  turnCount: number
  modulesTouched: string[]
  capturedTitles: string[]
  standouts: string[]
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export function SessionRecapCard({ recap }: { recap: SessionRecap }) {
  const { summary, turnCount, modulesTouched, capturedTitles, standouts } = recap

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-primary">Session recap</span>
      </div>

      {summary && (
        <p className="mb-3 text-xs text-muted-foreground">{summary}</p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Stat
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          value={turnCount}
          label={turnCount === 1 ? "exchange" : "exchanges"}
        />
        <Stat
          icon={<Layers className="h-3.5 w-3.5" />}
          value={modulesTouched.length}
          label={modulesTouched.length === 1 ? "chapter" : "chapters"}
        />
        <Stat
          icon={<Sparkles className="h-3.5 w-3.5" />}
          value={capturedTitles.length}
          label={capturedTitles.length === 1 ? "memory" : "memories"}
        />
      </div>

      {modulesTouched.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            Chapters visited
          </div>
          <div className="flex flex-wrap gap-1.5">
            {modulesTouched.map((m) => (
              <span
                key={m}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {moduleLabel(m)}
              </span>
            ))}
          </div>
        </div>
      )}

      {capturedTitles.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            Captured this session
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
            {capturedTitles.map((t, i) => (
              <li key={`${t}-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {standouts.length > 0 && (
        <div className="border-t border-primary/10 pt-2">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            What stands out
          </div>
          <ul className="space-y-1 text-[11px] italic text-muted-foreground">
            {standouts.map((s, i) => (
              <li key={`${s}-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {capturedTitles.length === 0 && standouts.length === 0 && (
        <p className="text-xs italic text-muted-foreground">
          Nothing was captured this time — pick a chapter and keep going whenever
          you&apos;re ready.
        </p>
      )}
    </div>
  )
}

export default SessionRecapCard
