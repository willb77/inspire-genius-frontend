/**
 * Idle session timeout — signs the user out after a period of no activity.
 *
 * Three things make this harder than a `setTimeout(logout, ONE_HOUR)`, and
 * all three are load-bearing:
 *
 * 1. **Timers do not run while the machine sleeps.** A laptop closed for
 *    three hours fires a pending `setTimeout` late (or, across a suspend,
 *    effectively not at all on some platforms). So the source of truth is a
 *    stored *timestamp* and we poll to compare against it; the deadline is
 *    evaluated from wall-clock, never accumulated from ticks.
 *
 * 2. **Tabs share one session.** Activity in tab B must keep tab A alive,
 *    or a user reading in one tab is logged out by an idle one. The
 *    last-activity stamp therefore lives in `localStorage`, which is shared
 *    across same-origin tabs, rather than in component state.
 *
 * 3. **`mousemove` fires hundreds of times a second.** Writing the stamp on
 *    every event would be a storage write per frame, so writes are throttled
 *    to at most one per THROTTLE_MS. The cost of that throttle is bounded
 *    and known: the effective timeout is ONE_HOUR + at most THROTTLE_MS.
 *
 * The warning is not decoration — a session that vanishes mid-sentence loses
 * whatever the user was typing, so they get a grace window in which any
 * activity cancels the logout.
 */
import { useEffect, useRef } from "react"
import { toast } from "sonner"

/** Inactivity allowed before sign-out. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

/** How long before sign-out the user is warned. */
export const IDLE_WARNING_MS = 5 * 60 * 1000 // 5 minutes

/** How often the deadline is evaluated. */
export const IDLE_POLL_MS = 15 * 1000

/** Minimum gap between localStorage writes when the user is active. */
const THROTTLE_MS = 10 * 1000

/** Shared across tabs — same-origin localStorage is the cross-tab channel. */
export const IDLE_STORAGE_KEY = "ig_last_activity_at"

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "focus",
] as const

function readLastActivity(): number {
  try {
    const raw = localStorage.getItem(IDLE_STORAGE_KEY)
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN
    return Number.isFinite(n) ? n : Date.now()
  } catch {
    // Storage blocked (private mode / embedded webview). Falling back to
    // "now" means we never spuriously sign someone out; the feature simply
    // degrades to inactive rather than becoming a logout loop.
    return Date.now()
  }
}

function writeLastActivity(at: number): void {
  try {
    localStorage.setItem(IDLE_STORAGE_KEY, String(at))
  } catch {
    /* storage blocked — see readLastActivity */
  }
}

export function markActivityNow(): void {
  writeLastActivity(Date.now())
}

export function clearIdleTracking(): void {
  try {
    localStorage.removeItem(IDLE_STORAGE_KEY)
  } catch {
    /* storage blocked */
  }
}

/**
 * @param enabled  only track while there is a session to end
 * @param onTimeout called once when the idle deadline passes
 */
export function useIdleTimeout(
  enabled: boolean,
  onTimeout: () => void,
): void {
  // Held in a ref so re-renders don't re-subscribe the listeners, and so the
  // poll always calls the current callback without listing it as a dep.
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const lastWriteRef = useRef(0)
  const warnedRef = useRef(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    // Starting the clock at mount means a fresh login always gets a full
    // window, and a reload never inherits a stale deadline from before.
    markActivityNow()
    lastWriteRef.current = Date.now()
    warnedRef.current = false
    firedRef.current = false

    const onActivity = () => {
      const now = Date.now()
      if (now - lastWriteRef.current < THROTTLE_MS) return
      lastWriteRef.current = now
      writeLastActivity(now)
      // Any activity inside the grace window rescinds the warning.
      if (warnedRef.current) {
        warnedRef.current = false
        toast.dismiss("idle-warning")
      }
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    )

    const tick = () => {
      if (firedRef.current) return
      const idleFor = Date.now() - readLastActivity()

      if (idleFor >= IDLE_TIMEOUT_MS) {
        firedRef.current = true
        toast.dismiss("idle-warning")
        clearIdleTracking()
        onTimeoutRef.current()
        return
      }

      if (idleFor >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS && !warnedRef.current) {
        warnedRef.current = true
        const minutes = Math.max(
          1,
          Math.round((IDLE_TIMEOUT_MS - idleFor) / 60000),
        )
        toast.warning(
          `You will be signed out in about ${minutes} minute${minutes === 1 ? "" : "s"} due to inactivity.`,
          { id: "idle-warning", duration: IDLE_WARNING_MS },
        )
      }
    }

    const interval = window.setInterval(tick, IDLE_POLL_MS)

    // Returning to a backgrounded tab is the moment a slept-through deadline
    // becomes visible, so evaluate immediately rather than waiting a poll.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity),
      )
      toast.dismiss("idle-warning")
    }
  }, [enabled])
}
