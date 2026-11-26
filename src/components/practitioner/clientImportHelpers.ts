/**
 * TDS A4: what the practitioner's import dialog says when the server refuses.
 *
 * The server's own `detail` is shown word for word when it sends one. That is
 * how "This client has not linked an InspiresGenius account yet" (409) and
 * "Not authorized for this client" (403) reach the practitioner, rather than
 * a generic failure that could be mistaken for a bad file.
 */
import type { ClientImportFramework } from "@/types/practitioner/coachClient"

export const CLIENT_IMPORT_FRAMEWORKS: ReadonlyArray<{ key: ClientImportFramework; label: string }> = [
  { key: "DISC", label: "DISC" },
  { key: "CLIFTON", label: "CliftonStrengths" },
]

/** What the server's parsers read: a CSV for either, or a report document. */
export const CLIENT_IMPORT_ACCEPT = ".csv,.pdf,.xlsx,.xls,.docx"

export type ImportFailKind = "detail" | "forbidden" | "notLinked" | "tooLarge" | "generic"

type ErrorShape = { response?: { status?: number; data?: { detail?: unknown } } }

/** The kind of failure, and the server's detail when it sent a string. */
export function importFailure(err: unknown): { kind: ImportFailKind; detail?: string } {
  const res = (err as ErrorShape | null)?.response
  const detail = res?.data?.detail
  if (typeof detail === "string" && detail.trim()) return { kind: "detail", detail }
  if (res?.status === 409) return { kind: "notLinked" }
  if (res?.status === 403) return { kind: "forbidden" }
  if (res?.status === 413) return { kind: "tooLarge" }
  return { kind: "generic" }
}
