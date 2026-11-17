import { useEffect, useState } from "react"

/** Tailwind's `sm` breakpoint: below it the "Details" view opens as a bottom sheet. */
const QUERY = "(max-width: 639px)"

/** True below 640px. No `matchMedia` (an old browser, a bare test) reads as "not small". */
export function useBelowSm(): boolean {
  const [below, setBelow] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(QUERY).matches : false,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(QUERY)
    const onChange = () => setBelow(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return below
}
