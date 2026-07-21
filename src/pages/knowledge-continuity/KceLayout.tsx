import { VerticalShell } from "@/verticals/core"

/**
 * Entitlement gate + shell for the Knowledge Continuity vertical.
 *
 * The gate, the AppShell wrapping, and the role plumbing live in Core's
 * `VerticalShell` — Knowledge Continuity declares which vertical it is and
 * nothing more. Unentitled users are redirected to `/home`.
 */
export default function KceLayout() {
  return <VerticalShell vertical="knowledge-continuity" />
}
