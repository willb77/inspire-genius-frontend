/** TDS U12 (CSA #2210): the two rules the client PRISM import applies before any upload. */
import type { ClientPrism } from "@/types/practitioner/coachClient"

/**
 * Whether the import is offered. Only where the coach backend answered for this
 * client (`null` = not deployed here) and the client has linked an account: an
 * unlinked client has no profile to add to, and the PRISM panel already says so.
 */
export function prismImportOffered(prism: ClientPrism | null | undefined): boolean {
  return !!prism && prism.state !== "not_linked"
}

/** The server refuses anything but CSV; refuse it here first, before an upload. */
export function isCsvFile(file: File): boolean {
  return /\.csv$/i.test(file.name)
}
