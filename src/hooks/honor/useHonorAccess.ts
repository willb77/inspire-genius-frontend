import { useSyncExternalStore } from "react"
import type { VerticalAccess } from "@/hooks/grant/useVerticalAccess"
import { useEnabledVerticals } from "@/hooks/grant/useEnabledVerticals"
import {
  getHonorPreviewOverride,
  subscribeHonorPreview,
} from "./honorPreviewStore"

/** The entitlement identifier that unlocks the Honor Foundation vertical. */
export const HONOR_VERTICAL = "honor-foundation"

/**
 * Entitlement gate for the Honor Foundation Coach Workbench.
 *
 * Reuses the shared server entitlement read (`GET /v1/agents/me/verticals`, via
 * {@link useEnabledVerticals}) — the same list that gates GRANT — and layers the
 * Honor-specific preview override (`honor_dev_access`) on top. Absent an
 * override, access follows the real entitlement: the vertical shows only for
 * users whose enabled_verticals include "honor-foundation".
 *
 * Kept as a thin Honor-specific wrapper (rather than calling the grant
 * `useVerticalAccess`) so the Honor preview key is independent of GRANT's.
 */
export function useHonorAccess(): VerticalAccess {
  const { data, isLoading } = useEnabledVerticals()
  const enabledVerticals = data ?? []
  const override = useSyncExternalStore(
    subscribeHonorPreview,
    getHonorPreviewOverride,
    () => null
  )

  if (override === "true") {
    return { hasAccess: true, isLoading: false, enabledVerticals }
  }
  if (override === "false") {
    return { hasAccess: false, isLoading: false, enabledVerticals }
  }
  return {
    hasAccess: enabledVerticals.includes(HONOR_VERTICAL),
    isLoading,
    enabledVerticals,
  }
}
