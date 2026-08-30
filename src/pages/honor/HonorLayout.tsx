import { VerticalShell } from "@/verticals/core"
import HonorShell from "./HonorShell"

/**
 * Entitlement gate + shell for the Honor Foundation Coach Workbench.
 *
 * Core's `VerticalShell` handles the entitlement gate (unentitled → `/home`) and
 * the role plumbing; the optional `shell` prop (Vertical Core #205) swaps the
 * shared `AppShell` for Honor's own navy/orange `HonorShell`. HonorShell renders
 * its own `<Outlet/>`, so it drops in as-is. Behaviour is identical to the prior
 * `RequireVertical` + `HonorShell` composition — this is just the tidy end state
 * now that Core's theme contract accepts a custom shell.
 */
export default function HonorLayout() {
  return <VerticalShell vertical="honor" shell={<HonorShell />} />
}
