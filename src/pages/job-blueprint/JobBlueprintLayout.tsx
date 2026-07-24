import { VerticalShell } from "@/verticals/core"

/**
 * Entitlement gate + shell for the Job DNA vertical.
 *
 * The gate, the AppShell wrapping and the role plumbing live in Core's
 * `VerticalShell` — Job DNA declares which vertical it is and nothing more.
 * Unentitled users are redirected to `/home`.
 */
export default function JobBlueprintLayout() {
  return <VerticalShell vertical="job-blueprint" />
}
