/**
 * Bio Capture — the Chronicle agent's life-narrative contract.
 *
 * Chronicle interviews a member across six life modules and distils each
 * exchange into structured "episodes". This surface reads that narrative and
 * offers a memoir export.
 *
 * Two things worth knowing before editing these types:
 *
 * 1. **These routes live on the Agent Engine, under `/v1/agents/bio/*`.** They
 *    go through `getApi()` / `agentApi`, not the monolith `api` — `/v1/agents/*`
 *    is the only prefix API Gateway forwards to the Agent Engine. A bare
 *    `/v1/bio/...` would fall through to the monolith catch-all and 404 in the
 *    browser while passing every test.
 * 2. **The response is NOT wrapped in the `ok()` envelope.** The narrative dict
 *    is the body — do not add a `.data.data` unwrap.
 *
 * The GET never 404s: an unknown member returns an empty narrative
 * (`bioStarted: false`), so the UI renders an empty state rather than an error.
 * The memoir POST, by contrast, MAY 404 in environments where the backend has
 * not been promoted yet — callers must fall back to a client-side memoir
 * assembled from the narrative JSON.
 */

/** The six life modules, in the fixed order the backend interviews them. */
export const BIO_MODULE_TYPES = [
  "life_story",
  "career_story",
  "background",
  "culture",
  "major_life_events",
  "major_life_shapers",
] as const

export type BioModuleType = (typeof BIO_MODULE_TYPES)[number]

/** Human-readable label for each module, used for headings and memoir sections. */
export const BIO_MODULE_LABELS: Record<string, string> = {
  life_story: "Life Story",
  career_story: "Career Story",
  background: "Background",
  culture: "Culture",
  major_life_events: "Major Life Events",
  major_life_shapers: "Major Life Shapers",
}

/**
 * One life module's progress.
 *
 * `moduleType` is typed as `string` (not `BioModuleType`) deliberately: the
 * backend owns the vocabulary, and a module type we don't recognise should
 * render with a fallback label rather than crash a narrowed union. Extra fields
 * beyond those listed are permitted — the index signature keeps them.
 */
export interface BioModule {
  moduleType: string
  status: string
  distilledLine: string
  startedAt: string | null
  completedAt: string | null
  [extra: string]: unknown
}

/** A single distilled memory within a module. */
export interface BioEpisode {
  episodeId: string
  moduleType: string
  title: string
  facts: string
  feelingThen: string
  feelingNow: string
  impactSelf: string
  impactOthers: string
  meaning: string
  charge: number
  openThread: boolean
  prismTags: string[] | null
  quotes: string[] | null
  ageAt: number | null
  era: string
  [extra: string]: unknown
}

/** Coverage of one narrative dimension within a module. */
export interface BioCoverage {
  moduleType: string
  dimension: string
  state: string
  [extra: string]: unknown
}

/** The whole life narrative for a member, returned by `GET /v1/agents/bio/{id}`. */
export interface MemberNarrative {
  memberId: string
  modules: BioModule[]
  episodes: BioEpisode[]
  coverage: BioCoverage[]
  bioStarted: boolean
  nextSuggestedModule: string | null
}

/** Memoir rendering style. `prose` reads as narrative; `structured` keeps headings. */
export type MemoirStyle = "prose" | "structured"

/** Request body for `POST /v1/agents/bio/{id}/memoir`. */
export interface MemoirRequest {
  style?: MemoirStyle
  moduleTypes?: string[]
}

/** Response from `POST /v1/agents/bio/{id}/memoir`. */
export interface MemoirResponse {
  memberId: string
  title: string
  markdown: string
  moduleCount: number
  episodeCount: number
  style: MemoirStyle
  generated: boolean
}

/**
 * One structured memory extracted from a single chat turn by the capture
 * endpoint. Distinct from `BioEpisode` (the persisted, fully-distilled record):
 * this is the lighter, turn-scoped reflection shown back to the member
 * immediately, so `people`/`places`/`era`/`feeling`/`meaning` are all optional.
 */
export interface EpisodeCapture {
  title: string
  facts: string
  people?: string[]
  places?: string[]
  era?: string
  feeling?: string
  meaning?: string
}

/** Request body for `POST /v1/agents/bio/{id}/capture`. */
export interface CaptureRequest {
  message: string
  /** Optional nudge toward a specific module; the backend may ignore it. */
  moduleHint?: string | null
}

/**
 * Response from `POST /v1/agents/bio/{id}/capture`.
 *
 * The endpoint extracts + persists what the member said this turn and reflects
 * it back structured. It never 500s: `captured: false` with an empty `episodes`
 * array means nothing was extractable this turn — the UI shows no capture card.
 * `suggestedFollowups` are content-specific probes derived from what was said,
 * which the panel uses in place of any generic prompt set.
 */
export interface CaptureResponse {
  memberId: string
  moduleType: string
  episodes: EpisodeCapture[]
  whatStandsOut: string
  suggestedFollowups: string[]
  captured: boolean
}

/**
 * A saved Chronicle interview session — the *conversation*, separate from the
 * distilled narrative. Backed by `/v1/agents/bio/{id}/sessions`.
 *
 * `BioSessionSummary` is the light list-row (no transcript); `BioSessionDetail`
 * adds the ordered turns so a session can be resumed. These endpoints MAY 404 in
 * environments where the session backend has not been promoted yet — callers
 * degrade to a local-only "unsaved" experience rather than erroring.
 */
export interface BioSessionTurn {
  role: "user" | "assistant"
  content: string
}

export interface BioSessionSummary {
  sessionId: string
  title: string
  turnCount: number
  summary: string
  createdAt: string | null
  updatedAt: string | null
}

export interface BioSessionDetail extends BioSessionSummary {
  transcript: BioSessionTurn[]
}

/** Request body for `POST /v1/agents/bio/{id}/sessions` (create or upsert). */
export interface SaveBioSessionRequest {
  /** Omit to create a new session; include to update an existing one. */
  sessionId?: string | null
  title?: string | null
  transcript?: BioSessionTurn[]
  summary?: string | null
}
