/**
 * The data contract the shared PRISM studio panels are given.
 *
 * These panels started life bound to the Character Lab's own React Query hooks,
 * which call the super-admin `/v1/agents/character-lab` endpoints. A second
 * caller — the manager-facing Team Development Studio, which reads a REAL
 * direct report — cannot be allowed anywhere near those endpoints.
 *
 * The dependency is inverted rather than parameterised. `useCharacterLab` is
 * deliberately NOT given an argument that selects a backend: that would leave a
 * manager surface one argument away from the admin endpoints, and a default
 * argument would make "forgot to pass it" mean "talked to super-admin". Instead
 * each panel here is a pure function of the props below, and the CALLER — the
 * Character Lab page, or the Team Development Studio — supplies both the data
 * and the words. Neither panel imports a hook, a service, or an axios instance,
 * so there is no endpoint it can reach on its own.
 *
 * The port shapes are stated in terms of what the UI does ("compare these ids,
 * section N"), not in terms of either backend's request body. Character Lab
 * compares by saved-profile id; Team Studio compares by sending whole subjects.
 * Each adapter does its own translation, and the panel never learns which.
 */
import type { ReactNode } from "react"
import type {
  AskResult,
  ComparisonPart,
  ImportResult,
  ProfilePatch,
  ProfileSummary,
  SavedScenario,
  ScenarioPart,
  StarterQuestions,
} from "@/types/character-lab"

/**
 * One async action plus whether one is in flight.
 *
 * The reduced shape of a React Query mutation — `mutateAsync` and `isPending`
 * — with the request body already built by the adapter. Panels get positional
 * arguments they can reason about, not a backend's payload shape.
 */
export type StudioAction<A extends unknown[], R> = {
  run: (...args: A) => Promise<R>
  pending: boolean
}

/**
 * The list a cast is chosen from.
 *
 * `subjects === undefined` with `error` set is a LOAD FAILURE and must not
 * render as an empty list — see ProfileLibrary, which distinguishes the two.
 */
export type SubjectListPort = {
  subjects: ProfileSummary[] | undefined
  isLoading: boolean
  error?: unknown
}

// ─── Compare ────────────────────────────────────────────────────────────

export type ComparePort = {
  cast: SubjectListPort
  /** One section of the comparison. Part 0 reports how many parts there are. */
  compare: StudioAction<[ids: string[], part: number], ComparisonPart>
  questions: StudioAction<[ids: string[]], StarterQuestions>
  ask: StudioAction<[ids: string[], question: string], AskResult>
}

/**
 * The wording that differs between fictional characters and real people.
 *
 * There is no default. A panel that said "characters" about a named direct
 * report would be a defect no type could catch, so every caller states its own
 * nouns explicitly.
 */
export type CompareCopy = {
  /** Stands in for the names before anything is picked, e.g. "the cast". */
  groupNoun: string
  castTitle: string
  /** Shown by the picker when there is nothing to choose. */
  castEmpty: ReactNode
  errorNeedTwo: string
  errorNeedOne: string
  errorNeedOneToAsk: string
  compareLabel: string
  comparingLabel: string
  compareFailed: string
  questionsFailed: string
  askFailed: string
  startersBlurb: string
  askPlaceholder: string
  askBlurb: string
  /** Meta row label on an export, e.g. "Characters" / "People". */
  metaLabel: string
  comparisonSubtitle: string
  answerSubtitle: string
}

// ─── Scenario ───────────────────────────────────────────────────────────

/** Keeping and re-opening runs. Absent when the caller has no scenario store. */
export type ScenarioStorePort = {
  scenarios: SavedScenario[] | undefined
  isLoading: boolean
  save: StudioAction<
    [
      body: {
        profile_ids: string[]
        title: string
        situation: string
        character_names: string[]
        result: { individual?: Record<string, string>; collaborative?: string }
      },
    ],
    unknown
  >
  remove: StudioAction<[id: string], unknown>
}

export type ScenarioPort = {
  cast: SubjectListPort
  /** One focus per call — a subject id, or COLLABORATIVE. */
  run: StudioAction<[ids: string[], situation: string, focus: string], ScenarioPart>
  /**
   * Optional on purpose. Team Studio has no scenario store, and a "Keep this
   * run" button that quietly does nothing is worse than no button.
   */
  store?: ScenarioStorePort
}

export type ScenarioCopy = {
  castTitle: string
  castEmpty: ReactNode
  castBlurb: string
  errorNeedOne: string
  errorNeedSituation: string
  saveFailed: string
  presets: string[]
  subtitle: string
  metaLabel: string
  savedBlurb: string
}

// ─── Library ────────────────────────────────────────────────────────────

export type LibraryPort = {
  list: SubjectListPort
  patch: StudioAction<[id: string, patch: ProfilePatch], unknown>
  remove: StudioAction<[id: string], unknown>
}

export type LibraryCopy = {
  /** Rendered when the list loaded and is genuinely empty. */
  empty: ReactNode
  /** Rendered when the list FAILED to load — a different claim entirely. */
  loadError: ReactNode
  editTitle: string
  editDescription: string
  notesLabel: string
  notesPlaceholder: string
  errorNoName: string
  saveFailed: string
  deleteDescription: string
}

// ─── Import ─────────────────────────────────────────────────────────────

export type ImportPort = {
  importCsv: StudioAction<[body: { content: string; filename?: string }], ImportResult>
}

export type ImportCopy = {
  blurb: ReactNode
  /** Toast wording for a fully successful batch. */
  imported: (count: number) => string
}
