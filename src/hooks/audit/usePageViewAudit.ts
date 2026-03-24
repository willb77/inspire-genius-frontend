import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { logAuditEvent } from "@/services/audit/audit.service"

/**
 * Logs a page_view audit event whenever the route pathname changes.
 * Call this once in a layout component (e.g. SuperAdminLayout, UserLayout)
 * to automatically track all page views within that layout.
 */
export function usePageViewAudit(actor: string = "user") {
  const { pathname } = useLocation()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (pathname !== prev.current) {
      prev.current = pathname
      logAuditEvent({
        action: "page_view",
        actor_email: actor,
        target_type: "page",
        extra_data: { path: pathname },
      })
    }
  }, [pathname, actor])
}
