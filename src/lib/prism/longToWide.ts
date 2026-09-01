import {
  PRISM_WIDE_DIM_ROW,
  PRISM_WIDE_GROUP_ROW,
  PRISM_WIDE_SCORE_ROWS,
  type PrismScoreType,
} from "@/lib/prism/wideTemplate"

/**
 * Long-format PRISM export -> the standard wide 97-column report layout.
 *
 * The long form is not always complete. Real exports frequently carry all three
 * score types for Behavior Preferences and only `Underlying` for the other ~78
 * scales. For some groups (Work Aptitudes, Core Traits, Mental Toughness,
 * Emotional Intelligence, Big Five) a single value genuinely IS the answer and
 * the vendor repeats it across all three rows. For others - notably the 26
 * Career Development Analysis columns - the three values really do differ, and
 * repeating one would invent two measurements out of one.
 *
 * We cannot tell those cases apart from the file alone, so we do the only
 * honest thing: fill the gap, and COUNT it. `copiedFromUnderlying` is surfaced
 * in the UI. A converted file that silently looked complete would be worse than
 * one that says how much of it is a repeat.
 */

const CATEGORY_TO_GROUP: Record<string, string> = {
  BehaviorPreferences: "Behavior Preferences",
  WorkAptitudes: "Work Aptitudes",
  CoreTraits: "Core Traits",
  MentalToughness: "Mental Toughness",
  EmotionalIntelligence: "Emotional Intelligence",
  WorkPreferenceProfile: "Work Preference Profile",
  CDA: "PRISM Career Development Analysis",
  BigFive: "The Big Five report",
}

/** Work Preference Profile columns are headed with prose, not names. */
const WPP_PREFIX_TO_DIM: ReadonlyArray<readonly [string, string]> = [
  ["being cautious, but not fearful", "Caution"],
  ["a tendency to be calm, stable and unflustered", "Composure"],
  ["comfortable working independently to achieve", "Drive"],
  ["being able to concentrate for long periods", "Concentration"],
  ["building group consensus", "Consensus Building"],
  ["creating imaginative and innovative concepts", "Imagination"],
  ["likely to be able to adapt to a range", "Adaptability"],
  ["being cheerful, talkative and outgoing", "Sociability"],
  ["taking and implementing tough, unpopular", "Assertiveness"],
  ["a tendency to be sympathetic", "Cooperation"],
  ["a tendency to be independent, forthright", "Toughness"],
  ["likely to have a high level of motivation", "Motivation"],
  ["likely to be effective in persuading", "Persuasion"],
]

/** The template writes "SD"; long exports write "SD Score". */
const DIM_ALIASES: Record<string, string> = { sd: "sd score" }

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase()
const key = (s: string) => DIM_ALIASES[norm(s)] ?? norm(s)
const groupKey = (g: string) => norm(g)

export class PrismCsvError extends Error {}

export type ConversionReport = {
  candidate: string
  rows: string[][]
  filledFromLongForm: number
  copiedFromUnderlying: number
  emptyCells: number
  missingColumns: string[]
  /** Groups where at least one cell was a repeat, worst first. */
  repeatedGroups: { group: string; cells: number }[]
}

function splitCsv(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const src = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = "" }
    else if (c !== "\r") cell += c
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row) }
  return out
}

function resolveDim(group: string, header: string): string {
  if (groupKey(group) === "work preference profile") {
    const h = norm(header)
    const hit = WPP_PREFIX_TO_DIM.find(([p]) => h.startsWith(p))
    return hit ? key(hit[1]) : key(header)
  }
  return key(header)
}

export function convertLongToWide(text: string, candidateOverride?: string): ConversionReport {
  const rows = splitCsv(text)
  const headerAt = rows.findIndex(
    (r) => norm(r[0] ?? "") === "category" && norm(r[1] ?? "") === "dimension",
  )
  if (headerAt < 0) {
    throw new PrismCsvError(
      "This does not look like a long-format PRISM export - no 'category,dimension' header row was found.",
    )
  }

  let candidate = candidateOverride?.trim() ?? ""
  if (!candidate) {
    const person = rows.slice(0, headerAt).find((r) => norm(r[0] ?? "") === "person")
    candidate = person?.[1]?.trim() ?? ""
  }
  if (!candidate) throw new PrismCsvError("No candidate name - the export has no 'Person' line.")

  const scores = new Map<string, Map<string, string>>()
  for (const r of rows.slice(headerAt + 1)) {
    if (r.length < 4 || !r[0]?.trim()) continue
    const group = CATEGORY_TO_GROUP[r[0].trim()]
    if (!group) continue // Quadrant rows are derived, not columns
    const k = groupKey(group) + " " + key(r[1] ?? "")
    if (!scores.has(k)) scores.set(k, new Map())
    scores.get(k)!.set(r[2].trim(), r[3].trim().replace(/%$/, ""))
  }
  if (scores.size === 0) throw new PrismCsvError("The export has a header row but no score rows.")

  const colGroup: string[] = []
  let cur = ""
  for (const cell of PRISM_WIDE_GROUP_ROW) {
    if (cell.trim()) cur = cell.trim()
    colGroup.push(cur)
  }

  const data: Record<PrismScoreType, string[]> = {
    Underlying: new Array(PRISM_WIDE_DIM_ROW.length).fill(""),
    Adapted: new Array(PRISM_WIDE_DIM_ROW.length).fill(""),
    Consistent: new Array(PRISM_WIDE_DIM_ROW.length).fill(""),
  }
  for (const st of PRISM_WIDE_SCORE_ROWS) data[st][0] = st

  let filled = 0
  let copied = 0
  const missing: string[] = []
  const repeats = new Map<string, number>()

  PRISM_WIDE_DIM_ROW.forEach((header, i) => {
    if (i === 0 || !header.trim()) return
    const group = colGroup[i]
    const byType = scores.get(groupKey(group) + " " + resolveDim(group, header))
    if (!byType) { missing.push(group + " / " + header.trim().slice(0, 40)); return }
    const under = byType.get("Underlying")
    for (const st of PRISM_WIDE_SCORE_ROWS) {
      const direct = byType.get(st)
      if (direct !== undefined && direct !== "") { data[st][i] = direct; filled++ }
      else if (under !== undefined && under !== "") {
        data[st][i] = under
        copied++
        repeats.set(group, (repeats.get(group) ?? 0) + 1)
      }
    }
  })

  const emptyCells = PRISM_WIDE_SCORE_ROWS.reduce(
    (n, st) =>
      n + data[st].filter((v, i) => i > 0 && PRISM_WIDE_DIM_ROW[i].trim() !== "" && v === "").length,
    0,
  )

  return {
    candidate,
    rows: [
      [...PRISM_WIDE_GROUP_ROW],
      [candidate, ...PRISM_WIDE_DIM_ROW.slice(1)],
      ...PRISM_WIDE_SCORE_ROWS.map((st) => data[st]),
    ],
    filledFromLongForm: filled,
    copiedFromUnderlying: copied,
    emptyCells,
    missingColumns: missing,
    repeatedGroups: [...repeats.entries()]
      .map(([group, cells]) => ({ group, cells }))
      .sort((a, b) => b.cells - a.cells),
  }
}

/** Quote only what needs it, and use CRLF - the report layout's own convention. */
export function toCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => (/[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c)).join(","))
    .join("\r\n")
}
