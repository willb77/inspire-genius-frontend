import { useCallback, useEffect, useRef, useState } from "react"

/**
 * A user-draggable height for a panel, persisted across sessions.
 *
 * Returns `null` until the user first drags — the panel keeps its natural
 * (e.g. `flex-1`) height until then, and only becomes a fixed pixel height once
 * the person has expressed a preference. The chosen height survives reloads via
 * `localStorage`.
 *
 * Usage: spread `handleProps` onto a thin drag strip at the bottom edge of the
 * panel, apply `height` to the panel's style when non-null, and let
 * `onDoubleClick={reset}` restore the automatic size.
 *
 *   const { height, handleProps, reset } = useResizableHeight("meridian-conv")
 *   <Card style={height != null ? { height } : undefined} className={cn(height == null && "flex-1")}>
 *     …
 *     <div {...handleProps} onDoubleClick={reset} />
 *   </Card>
 */
export type UseResizableHeightOptions = {
  /** Smallest height the panel may be dragged to (px). */
  min?: number
  /** Largest height the panel may be dragged to (px). */
  max?: number
}

export type ResizableHandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void
  role: "separator"
  "aria-orientation": "horizontal"
  tabIndex: 0
}

export function useResizableHeight(
  storageKey: string,
  { min = 240, max = 1400 }: UseResizableHeightOptions = {},
) {
  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  )

  const [height, setHeight] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  })

  // Persist whenever a real height is set. Removing the key on reset keeps a
  // stale value from resurrecting the fixed height on the next mount.
  useEffect(() => {
    try {
      if (height == null) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, String(Math.round(height)))
    } catch {
      /* private mode / disabled storage — resize still works for the session */
    }
  }, [height, storageKey])

  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Anchor from the current rendered height of the panel this handle sits in,
      // so the first drag continues smoothly from the auto (flex) size.
      const panel = e.currentTarget.parentElement
      const startH =
        height ?? panel?.getBoundingClientRect().height ?? min
      dragRef.current = { startY: e.clientY, startH }
      e.currentTarget.setPointerCapture?.(e.pointerId)
      e.preventDefault()
    },
    [height, min],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current
      if (!d) return
      setHeight(clamp(d.startH + (e.clientY - d.startY)))
    },
    [clamp],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* pointer already released */
    }
  }, [])

  const reset = useCallback(() => setHeight(null), [])

  const handleProps: ResizableHandleProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    role: "separator",
    "aria-orientation": "horizontal",
    tabIndex: 0,
  }

  return { height, setHeight, reset, handleProps }
}

export default useResizableHeight
