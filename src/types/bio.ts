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
