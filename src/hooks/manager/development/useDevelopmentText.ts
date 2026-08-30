import { useCallback, useMemo } from "react"
import { useFrontendText } from "@/hooks/useFrontendText"
import { DEV_TEXT } from "@/constants/development"

/**
 * Resolve Development Studio copy. Overlays any server-provided `dev.*` keys
 * from `useFrontendText` on top of the local `DEV_TEXT` defaults, so strings
 * can be centrally managed / localized without a code change.
 *
 * Returns a `t(key, fallback?)` function. Unknown keys fall back to the
 * provided fallback, then the raw key.
 */
export function useDevelopmentText() {
  const { data } = useFrontendText()

  const overrides = useMemo(() => {
    const items = data?.data?.items
    const map: Record<string, string> = {}
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item?.key) map[item.key] = item.value
      }
    } else if (items && typeof items === "object") {
      for (const [k, v] of Object.entries(items)) {
        if (typeof v === "string") map[k] = v
      }
    }
    return map
  }, [data])

  const t = useCallback(
    (key: string, fallback?: string): string =>
      overrides[key] ?? DEV_TEXT[key] ?? fallback ?? key,
    [overrides],
  )

  return { t }
}
