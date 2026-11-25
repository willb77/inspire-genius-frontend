import { useCallback, useMemo } from "react"
import { useFrontendText } from "@/hooks/useFrontendText"
import {
  DEV_TEXT,
  DEV_TEXT_BY_AUDIENCE,
  DEV_TEXT_PRACTITIONER,
  type DevAudience,
} from "@/constants/development"

/**
 * Resolve Development Studio copy. Overlays any server-provided `dev.*` keys
 * from `useFrontendText` on top of the local `DEV_TEXT` defaults, so strings
 * can be centrally managed / localized without a code change.
 *
 * Returns a `t(key, fallback?)` function. Unknown keys fall back to the
 * provided fallback, then the raw key.
 *
 * U9 — `audience` picks the text table. `"manager"` (the default, and what
 * every caller passed before U9 by passing nothing) resolves exactly as it
 * always has: server override, then `DEV_TEXT`, then the fallback, then the key.
 *
 * `"practitioner"` reads the practitioner table. One difference in how a server
 * override applies: for a key whose practitioner wording differs from the
 * manager's (the keys in `DEV_TEXT_PRACTITIONER`), a server `dev.*` override
 * is NOT applied. That override has one value for every audience and was
 * written against the manager's wording, so applying it would put "team" and
 * "member" back in front of a practitioner. Every other key takes the override
 * as before.
 */
export function useDevelopmentText(audience: DevAudience = "manager") {
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
    (key: string, fallback?: string): string => {
      if (audience === "practitioner") {
        const own = DEV_TEXT_PRACTITIONER[key]
        if (own !== undefined) return own
        return overrides[key] ?? DEV_TEXT_BY_AUDIENCE.practitioner[key] ?? fallback ?? key
      }
      return overrides[key] ?? DEV_TEXT[key] ?? fallback ?? key
    },
    [overrides, audience],
  )

  return { t }
}
