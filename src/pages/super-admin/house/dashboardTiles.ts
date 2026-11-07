/** What a tile shows when there is no real figure. Never a made-up number. */
export const NO_VALUE = "—"

export type TileState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "value"; value: string; note?: string }
  | { kind: "unavailable"; note: string }

type Query = { isLoading: boolean; isError: boolean }

/** Turn a query plus its (possibly missing) figure into a tile state. */
export function tileState(q: Query, value: string | null, note?: string): TileState {
  if (q.isLoading) return { kind: "loading" }
  if (q.isError) return { kind: "error" }
  if (value == null) return { kind: "unavailable", note: "Not available yet." }
  return { kind: "value", value, note }
}
