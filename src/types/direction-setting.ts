/**
 * Direction Setting — domain types.
 *
 * Mirrors `services/agent-engine/app/tools/direction_setting/stages.py` and the
 * journey serialiser in `journey.py`. The stage list is **served**, not
 * hardcoded here, so a stage added or reworded on the backend changes the
 * product without a coordinated frontend release — these types describe the
 * shape, not the content.
 */

/** How far a single stage has got. */
export type StageState = "not_started" | "in_progress" | "complete" | "skipped"

/** The journey as a whole. */
export type JourneyStatus = "not_started" | "in_progress" | "complete"

/**
 * One stage definition as the backend serves it.
 *
 * `needs` names what the stage cannot run without. The journey never blocks on
 * it — every stage is enterable — but the surface uses it to say *why* a stage
 * will be thin, which is the difference between an empty page and an explained
 * one.
 */
export type JourneyStage = {
  id: string
  name: string
  question: string
  outcome: string
  needs: string[]
  /**
   * The subset of `needs` no completed stage has produced yet.
   *
   * `needs` is the stage's standing requirement list and never changes;
   * `unmetNeeds` is what is missing *right now*. Rendering `needs` was why a
   * stage kept saying "thin without your PRISM results" to someone whose PRISM
   * had been on file for weeks.
   *
   * Optional on the type because an older backend does not send it — the
   * surface falls back rather than rendering `undefined`.
   */
  unmetNeeds?: string[]
  /** `unmetNeeds` is empty. Presentation only — every stage stays enterable. */
  reachable?: boolean
  /**
   * Nothing downstream depends on this stage.
   *
   * Optional stages are real work worth doing; they are just not allowed to sit
   * in front of the funnel as "your next step". The server decides this — see
   * `stages.py` — and `nextAction` already accounts for it.
   */
  optional?: boolean
  state: StageState
}

/**
 * The single next thing to put in front of the user.
 *
 * `id` is `null` — and only null — when every stage is done. `Omit` rather than
 * a plain intersection: `JourneyStage & { id: string | null }` collapses `id`
 * back to `string`, which makes the finished-journey case the backend actually
 * sends impossible to express.
 */
export type NextAction = Omit<JourneyStage, "id"> & { id: string | null }

export type Journey = {
  userId: string
  /** Furthest stage reached — not the current one. */
  stage: number
  status: JourneyStatus
  stageStatus: Record<string, StageState>
  stages: JourneyStage[]
  nextAction: NextAction
  artefactKeys: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type AdvanceInput = {
  stageId: string
  state?: StageState
  artefact?: Record<string, unknown>
}

/**
 * The file formats the journey report can be rendered as. The backend is
 * deliberately loose — an unrecognised string degrades to docx rather than
 * 422ing a download — but the surface only offers the ones worth offering.
 */
export type ReportFormat = "docx" | "pdf" | "md" | "html"

/**
 * A rendered journey report.
 *
 * `stagesComplete` / `stagesTotal` are echoed by the backend so the surface can
 * say how much of the document is real *before* the click. A journey report is
 * built to be downloaded half-finished, and the completion count is the honest
 * headline for that.
 */
export type JourneyReport = {
  downloadUrl: string
  filename: string | null
  format: string
  contentType: string | null
  expiresIn: number | null
  stagesComplete: number | null
  stagesTotal: number | null
}

/** Stage 3 — one role family ranked against the user's PRISM. */
export type RoleFamilyAffinity = {
  family: string
  /** 0–100, weight-normalised mean. */
  affinity: number
  pivotDifficulty: string
  distance: number
  dimensionsConsidered: number
}

export type CareerSkillLadder = {
  family: string
  steps: string[]
}

export type CareerAreas = {
  families: RoleFamilyAffinity[]
  topFamilies?: string[]
  skillLadders?: CareerSkillLadder[]
  dimensionsEvaluated?: number
  /**
   * Present when the result is empty for an explainable reason — most often no
   * PRISM on file yet. Render it instead of an error: a new user reaching
   * Stage 3 before Stage 1 is the normal case.
   */
  note?: string
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 6 — Align.
 *
 * Mirrors `app/tools/direction_setting/alignment.py` (`build_alignment`) and
 * `app/tools/direction_setting/direction_jobs.py` (`to_dict`).
 *
 * The stage sits on the **async job** path: it hydrates a behavioural profile,
 * reads the shared Summit goal store and scores every goal against nine role
 * families, which comfortably exceeds API Gateway's 30-second hard cap. So the
 * contract is accept-then-poll, not request-response.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The five verdicts.
 *
 * Four are Honor's. `unscored` is this stage's, and it is load-bearing: with no
 * PRISM on file the scorer imputes every missing dimension to neutral, which
 * lands every goal near 50 and therefore on "mixed". A person with no
 * assessment would read a screenful of measured-looking middling verdicts about
 * goals nothing was ever measured against. `unscored` says the true thing —
 * **never render it as a low score.**
 */
export type AlignmentVerdict =
  | "supported"
  | "mixed"
  | "at-tension"
  | "unmapped"
  | "unscored"

/** queued → running → complete | error. Nothing writes past the last two. */
export type AlignmentJobStatus = "queued" | "running" | "complete" | "error"

/**
 * One dimension driving a goal's verdict, carrying **both** numbers.
 *
 * "You are low on Investigative & Analytical" is an opinion; "you 34, this kind
 * of work usually asks 90" is a fact the person can check against their own
 * PRISM report. Never print one number without the other.
 *
 * `yourScore` is `null` — not 50 — when the dimension was imputed. A neutral
 * placeholder printed as a score is a fabricated measurement.
 */
export type AlignmentDimension = {
  dimension: string
  category?: string | null
  categoryLabel?: string | null
  dimensionId?: string | null
  yourScore: number | null
  roleNeeds: number
  closeness?: number
  imputed?: boolean
}

/** The dimensions holding a goal up, and the ones pulling against it. */
export type AlignmentDrivers = {
  supporting?: AlignmentDimension[]
  opposing?: AlignmentDimension[]
}

/** One stated goal, scored (or honestly not) against the role families. */
export type AlignmentGoal = {
  goalId?: string | null
  title: string
  category?: string | null
  horizon?: string | null
  status?: string | null
  /** Archetype key, or null when the mapper declined to place the goal. */
  area?: string | null
  /** The role family in the same words Stage 3's `/careers` uses. */
  family?: string | null
  /** 0–100, or null for `unmapped` / `unscored`. */
  score: number | null
  verdict: AlignmentVerdict
  /** True exactly when `verdict === "at-tension"`. */
  conflict: boolean
  drivers?: AlignmentDrivers
  /** The finding in one plain sentence — a fixed backend template, not a model call. */
  statement: string
}

/**
 * A goal the mapper could not place against any role family.
 *
 * The mapper is deliberately conservative (whole-word match only), so this list
 * is expected to be non-empty for real users. **Show it.** A goal quietly
 * vanishing from a person's own alignment report is a worse failure than an
 * honest "we couldn't place this one".
 */
export type AlignmentUnmappedGoal = {
  goalId?: string | null
  title: string
  statement: string
}

export type AlignmentSummary = {
  total: number
  supported?: number
  mixed?: number
  atTension?: number
  unmapped?: number
  unscored?: number
}

/** How much evidence backed the evaluation, and what was missing. */
export type AlignmentConfidence = {
  score?: number
  band?: string
  behavioralBasis?: boolean
  present?: string[]
  missing?: string[]
  note?: string
}

/** The stage-6 report itself — what a completed job returns. */
export type AlignmentResultPayload = {
  userId?: string
  goals: AlignmentGoal[]
  /** The at-tension goals again, surfaced so the finding needs no filtering to notice. */
  conflicts: AlignmentGoal[]
  unmapped: AlignmentUnmappedGoal[]
  careerFitRanked?: { area: string; family: string; score: number }[]
  summary: AlignmentSummary
  scored?: boolean
  /** True when there is no behavioural assessment to score against. */
  prismNeeded?: boolean
  /** True when no goals are on file yet. Not an error — the normal early state. */
  goalsPending?: boolean
  dimensionsRead?: string[]
  dimensionsImputed?: string[]
  confidence?: AlignmentConfidence
  /** The one line explaining what this report is and what it is not. */
  note?: string
}

/** `GET /alignment/jobs/{jobId}`. */
export type AlignmentJob = {
  jobId: string
  kind: string
  status: AlignmentJobStatus
  result?: AlignmentResultPayload | null
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** `POST /alignment/jobs` — 202, before any work has happened. */
export type AlignmentJobStarted = {
  jobId: string
  kind: string
  status: AlignmentJobStatus
}

/**
 * `GET /alignment` — the cheap read.
 *
 * The stored artefact plus the latest job's status, minus its result (the
 * artefact already carries it). Lets the surface tell "never run" from "running
 * right now" from "failed" in one call, and lets a returning user reattach to a
 * job in flight instead of paying for a second compute.
 */
export type AlignmentStored = {
  result: AlignmentResultPayload | null
  job: Omit<AlignmentJob, "result"> | null
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 4 — the market.
 *
 * Mirrors `app/market/models.py` (`WageRange`, `Outlook`, `Occupation`,
 * `OccupationMarket`) and the `/market/salaries` route.
 *
 * Two properties of that module survive into these types because they are the
 * product, not an implementation detail:
 *
 * 1. **A wage is a range with a source and a vintage.** `MarketWageRange` has
 *    no optional field. A point estimate is not expressible, on either side of
 *    the wire — `WageRange.__post_init__` refuses to build one, and
 *    `SalaryRangeCard` refuses to render one.
 * 2. **Absence is `null`, never a stand-in figure.** There is no fallback row
 *    and no "typical" default. An occupation we hold no wage series for comes
 *    back with `salary: null` and a sentence; the retired GRANT `_FALLBACK`
 *    that invented $38,000 for anything unknown is exactly what these nulls
 *    exist to prevent. **Never render a null as `$0`.**
 * ──────────────────────────────────────────────────────────────────────────── */

/** Entry / median / experienced annual wage, with provenance. All required. */
export type MarketWageRange = {
  low: number
  median: number
  high: number
  /** Who published it, named plainly enough to be checked. */
  source: string
  /** `YYYY-MM`, or `mixed: …` when a family roll-up spans vintages. */
  asOf: string
}

/**
 * Projected employment change.
 *
 * `growthPct` is **signed**. Some occupations are shrinking; a projection that
 * can only be positive is a brochure. Render the minus sign.
 */
export type MarketOutlook = {
  growthPct: number
  horizonYears: number
  source: string
  /** The projection window, e.g. `2023-2033` — not a month. */
  asOf: string
}

/** A canonical occupation: SOC-style code, title, and where both came from. */
export type MarketOccupationRef = {
  code: string
  title: string
  source: string
  asOf: string
}

/** One occupation with the gaps left as gaps — either side may be `null`. */
export type MarketOccupation = MarketOccupationRef & {
  salary: MarketWageRange | null
  outlook: MarketOutlook | null
}

/**
 * One career area, priced.
 *
 * `range` is the roll-up across the area's occupations, or `null` when nothing
 * in it has a wage series. `note` carries the backend's own sentence for that
 * absence — said explicitly rather than left to the surface to infer, because
 * "we have no wage data for this area" and "this area pays nothing" are one
 * careless render apart.
 *
 * `affinity` and `pivotDifficulty` are `null` for a caller with no PRISM: the
 * route then prices all nine areas unranked rather than showing nothing.
 */
export type MarketArea = {
  family: string
  affinity: number | null
  pivotDifficulty: string | null
  range: MarketWageRange | null
  occupations: MarketOccupation[]
  note: string | null
}

/** `GET /market/salaries`. */
export type MarketSalaries = {
  areas: MarketArea[]
  /** False when there was no PRISM to rank with — all nine areas, unordered. */
  ranked: boolean
  /** The configured provider, e.g. `static-reference`. */
  provider: string
  /** The provider's vintage. Render it; it is not decoration. */
  asOf: string
  note: string
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stages 9 and 10 — plan and ROI.
 *
 * Mirrors `app/tools/direction_setting/plan.py` and `roi.py`. Both stages sit
 * on the same accept-then-poll path as stage 6, for the same reason: they make
 * an unbounded specialist call, and API Gateway's 30-second cap does not
 * forgive one.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Every Direction Setting job uses the same lifecycle. */
export type DirectionJobStatus = AlignmentJobStatus

/**
 * How much work an item is — including when that is genuinely not knowable.
 *
 * `hours` is populated **only** from a stated figure; nothing derives one,
 * because a derived hour count is indistinguishable on screen from a measured
 * one. `known: false` with `basis: "unknown"` is the ordinary case and must
 * render as "we don't know how long this takes" — never as a zero, never as a
 * quietly-omitted line.
 *
 * `horizon` is a different kind of claim: when to look at this again, not how
 * long it takes.
 */
export type PlanEffort = {
  hours: number | null
  horizon: string | null
  known: boolean
  basis: string
  statement: string
}

/** What a purchasable item costs. `known: false` means unknown, not free. */
export type PlanCost = {
  amount: number | null
  currency: string | null
  known: boolean
  basis: string
  statement: string
}

/**
 * One step in the plan.
 *
 * **`cost` is optional at the type level because the wire omits the key
 * entirely on behavioural items** — not `cost: null`, which a consumer can
 * happily sum as zero. `source` is `"skill"` exactly when a cost may exist,
 * and `costable` says the same thing in a boolean. Never show a cost
 * affordance on an item without the key, and never sum a missing cost as zero.
 */
export type PlanItem = {
  itemId: string
  gapId: string
  competency: string
  title: string
  provider: string | null
  /** `"behavioral"` — something you become — or `"skill"`: something you buy. */
  source: string
  costable: boolean
  /** `"critical"` or `"coaching"`. Critical gaps are what move the fit band. */
  severity: string
  /** Server-assigned position. The sequence is already in this order. */
  rank: number
  origin: string
  goalId: string | null
  category: string | null
  currentScore: number | null
  targetScore: number | null
  magnitude: number | null
  direction: string | null
  format: string
  effort: PlanEffort
  why: string
  status: string
  /** `"derived"` or `"specialist"` — who worded the title. */
  phrasing: string
  /** Present on skill items only. Absent — not null — on behavioural ones. */
  cost?: PlanCost
}

export type PlanCounts = {
  total: number
  behavioural: number
  skill: number
  critical: number
  coaching: number
}

/** What the plan can and cannot say about total time. */
export type PlanEffortSummary = {
  /** `null`, never `0`, when nothing stated a duration. */
  statedHours: number | null
  itemsWithStatedEffort: number
  itemsWithUnknownEffort: number
  complete: boolean
  statement: string
}

/** What the plan can and cannot say about total money. */
export type PlanCostSummary = {
  /** `null` when nothing is priced, or when priced items disagree on currency. */
  knownTotal: number | null
  currency: string | null
  costableItems: number
  itemsWithKnownCost: number
  itemsWithUnknownCost: number
  itemsNotCostable: number
  complete: boolean
  statement: string
}

/** Over-expressions. Reported, never sequenced — there is nothing to close. */
export type PlanOverdone = {
  dimension: string | null
  category: string | null
  candidateScore: number | null
}

export type PlanTargetRole = {
  title: string | null
  blueprintId: string | null
}

/** The stage-9 artefact — what a completed plan job returns. */
export type PlanResultPayload = {
  targetRole: PlanTargetRole | null
  /** True when nothing has been picked to aim at. Normal, not an error. */
  targetRolePending: boolean
  /** True when nothing is in the way. Also a real result, not an empty page. */
  gapsPending: boolean
  /** **Already ordered**: critical gaps first, then coaching. Do not re-sort. */
  sequence: PlanItem[]
  counts: PlanCounts
  effort: PlanEffortSummary
  cost: PlanCostSummary
  advisories: { overdone: PlanOverdone[] }
  /** Inputs the plan refused — e.g. a price attached to a behavioural gap. */
  refusals: string[]
  learningFormat: string
  dominantQuadrant: string | null
  /** Why the order is the order. Worth printing next to the list. */
  sequenceBasis: string
  note: string
}

/** One derived ROI figure, stated at each of the three wage points. */
export type RoiBand = {
  /** `null` at a wage point means *never reaches payback at that wage*. */
  atEntryWage: number | null
  atMedianWage: number | null
  atExperiencedWage: number | null
  /** Extremes of what resolved. **Not** a confidence interval. */
  low: number | null
  high: number | null
  unit: string
  basis: string
  known: boolean
  /** Which of `entry` / `median` / `experienced` came back `null`. */
  unreachableAt: string[]
  note: string
}

/**
 * The arithmetic, when it could be done.
 *
 * There is deliberately no scalar `payback` or `expected` — every figure is a
 * `RoiBand` across three wage points. A surface that wants one number has to
 * name the wage point and thereby state its assumption.
 */
export type RoiComputed = {
  currency: string
  horizonYears: number
  upliftPerYear: RoiBand
  paybackYears: RoiBand
  netOverHorizon: RoiBand
  unreachableAt: string[]
  statement?: string
  /** Echoed inside the block so numbers cannot be rendered without the band. */
  confidenceBand?: string
  confidenceScore?: number
}

/** What the person earns now — stated, or an explicit refusal to guess. */
export type RoiIncome = {
  amount: number | null
  currency: string | null
  /** `"stated"` or `"unknown"`. A stated **zero** computes; an absent one does not. */
  basis: string
  statedZero: boolean
  statement: string
}

/**
 * The cost side. `basis` is the fact everything branches on:
 * `none` (no plan) · `not-purchasable` (nothing on it can be bought — *not*
 * free) · `unpriced` (unknown, not zero) · `partial` (a floor) · `stated`.
 */
export type RoiCostSide = {
  total: number | null
  currency: string | null
  costableItems: number
  itemsWithKnownCost: number
  itemsWithUnknownCost: number
  complete: boolean
  basis: string
  statement: string
}

/** The time side. Stated as time and **never converted into money**. */
export type RoiEffortSide = {
  statedHours: number | null
  itemsWithStatedEffort: number
  itemsWithUnknownEffort: number
  complete: boolean
  convertedToMoney: boolean
  statement: string
}

/** One row of the confidence ledger, with the penalty it cost. */
export type RoiConfidenceInput = {
  key: string
  basis: string
  penalty: number
  statement: string
  source?: string
  asOf?: string
}

/**
 * How much the figures can be leaned on, and exactly why not more.
 *
 * A first-class output, not a footnote. `degradedBy` names which input is the
 * weak one, which is the difference between "low confidence" and "low
 * confidence *because nobody has priced two of your three courses*". No ROI
 * computed from the curated static table can reach the `high` band — that is
 * by construction, and `ceiling` says so.
 */
export type RoiConfidence = {
  score: number
  /** `high` · `moderate` · `low` · … — the backend owns the vocabulary. */
  band: string
  inputs: RoiConfidenceInput[]
  degradedBy: { key: string; penalty: number; statement: string }[]
  ceiling: string
  statement: string
}

/** A nearer target, taken from stage 3's ranking of *this person*. */
export type RoiAlternative = {
  family: string
  affinity: number | null
  pivotDifficulty: string | null
  range: MarketWageRange | null
  why: string
}

/** One reason the target may be the wrong one. `decisive` ones stand alone. */
export type RoiGround = {
  code: string
  decisive: boolean
  signal: Record<string, unknown>
  statement: string
}

/**
 * The misalignment read.
 *
 * Same shape whether or not it recommends anything, so a surface never has to
 * branch on presence. When it does recommend, it names alternatives with
 * reasons — and the copy around it must never read as "you can't do this".
 * The reader may be out of work and frightened.
 */
export type RoiRecommendation = {
  recommendDifferentTarget: boolean
  tier: string | null
  criticalGaps: number
  grounds: RoiGround[]
  decisiveGrounds: string[]
  cautions: string[]
  alternatives: RoiAlternative[]
  statement: string
}

/**
 * The stable refusal codes.
 *
 * Kebab-case and matched by the backend's own constants. Typed as a union for
 * the copy lookup, but `RoiResultPayload.missing` stays `string[]`: a code this
 * frontend has never heard of must still render, via `missingStatements`.
 */
export type RoiMissingCode =
  | "target-role"
  | "target-occupation"
  | "target-salary"
  | "current-income"
  | "plan"
  | "purchasable-path"
  | "plan-cost"
  | "comparable-currency"
  | "item-prices"

/**
 * The stage-10 artefact.
 *
 * **Refusal is the ordinary path.** `roi: null` with a populated `missing` is a
 * successful compute that declined to invent an input, not a failure — and a
 * payload with numbers *and* a non-empty `missing` is a floor, not an answer.
 * `RoiSummary` refuses on either.
 */
export type RoiResultPayload = {
  targetRole: PlanTargetRole | null
  targetRolePending: boolean
  occupation: MarketOccupationRef | null
  salary: MarketWageRange | null
  outlook: MarketOutlook | null
  currentIncome: RoiIncome
  cost: RoiCostSide
  effort: RoiEffortSide
  /** `null` whenever anything blocking could not be established. */
  roi: RoiComputed | null
  /** Stable kebab-case codes. Empty only when every input is real. */
  missing: string[]
  /** One prose sentence per code, in the same order. */
  missingStatements: string[]
  computable: boolean
  confidence: RoiConfidence
  recommendation: RoiRecommendation
  narration: string | null
  /** Stage 9's refusals, carried forward rather than restated. */
  refusals: string[]
  note: string
}

/** `GET /plan/jobs/{jobId}`. */
export type PlanJob = {
  jobId: string
  kind: string
  status: DirectionJobStatus
  result?: PlanResultPayload | null
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** `GET /roi/jobs/{jobId}`. */
export type RoiJob = {
  jobId: string
  kind: string
  status: DirectionJobStatus
  result?: RoiResultPayload | null
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** `POST /plan/jobs` and `POST /roi/jobs` — 202, before any work has happened. */
export type DirectionJobStarted = {
  jobId: string
  kind: string
  status: DirectionJobStatus
}

/** `GET /plan` — the stage-9 artefact plus the latest job's status. */
export type PlanStored = {
  result: PlanResultPayload | null
  job: Omit<PlanJob, "result"> | null
}

/** `GET /roi` — the stage-10 artefact plus the latest job's status. */
export type RoiStored = {
  result: RoiResultPayload | null
  job: Omit<RoiJob, "result"> | null
}

/** Body for `POST /plan/jobs`. Both fields optional — stages 7/8 supply them. */
export type PlanStartInput = {
  targetRole?: string | { title?: string; blueprintId?: string } | null
  /** The user's half of the gap taxonomy: certifications, courses, portfolio. */
  skillGaps?: Record<string, unknown>[]
}

/**
 * Body for `POST /roi/jobs`.
 *
 * `currentIncome` has no fallback anywhere. Omitting it is a refusal; sending
 * `0` is a *statement* that there is no income right now, which computes.
 */
export type RoiStartInput = {
  currentIncome?: number | null
  currency?: string | null
  targetRole?: string | { title?: string; blueprintId?: string } | null
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 12 — rehearse. The optional one.
 *
 * Mirrors `app/tools/direction_setting/rehearsal.py`. Two shapes of this stage
 * differ from every other one here, and both are load-bearing:
 *
 * 1. **Answering is synchronous.** The feedback is deterministic and arrives in
 *    the POST response, so there is no job to wait on for the thing the person
 *    came for. The only job is Nova re-saying that feedback more warmly, and if
 *    it never lands nothing is missing — see `RehearsalNarrationJob`.
 * 2. **Nothing in here is a measurement.** There is no score field, no grade, no
 *    band and no pass/fail, because the backend composes none. A surface that
 *    derives one from `RehearsalAnswerSignals` has rebuilt the evaluation tool
 *    this stage exists not to be. A question counter is fine; a quality number
 *    is not.
 * ──────────────────────────────────────────────────────────────────────────── */

/** not_started → in_progress → complete. There is no "failed" and no "abandoned". */
export type RehearsalStatus = "not_started" | "in_progress" | "complete"

/**
 * Where a question came from. `focus` and `counter-productive` carry a `note`
 * explaining why it is being asked — the counter-productive note in particular
 * is what stops the question reading as an accusation, so it must be rendered.
 */
export type RehearsalQuestionSource =
  | "warmup"
  | "focus"
  | "counter-productive"

export type RehearsalQuestion = {
  index: number
  prompt: string
  source: RehearsalQuestionSource | string
  /** The PRISM dimension behind a focus question, when there is one. */
  dimension?: string | null
  /** The framing note. Present on `focus` and `counter-productive`. */
  note?: string | null
}

/**
 * What is deterministically true about one answer: four booleans and a word
 * count. **Not a score, and not to be rendered as one.** It is on the wire so
 * the feedback can be regenerated, not so a surface can total it up.
 */
export type RehearsalAnswerSignals = {
  words: number
  empty: boolean
  brief: boolean
  long: boolean
  hasSituation: boolean
  hasOutcome: boolean
  hasFirstPerson: boolean
}

/**
 * Feedback on one answer. One thing to say differently, one thing they already
 * have — and no rating of any kind.
 *
 * `youAlreadyHave` is one of the person's **own** self-advocacy lines, generated
 * upstream to never name a PRISM dimension or quote a score. Render it verbatim:
 * reformatting it, truncating it, or labelling it as a strength turns the one
 * plain-language sentence in this stage back into a rubric.
 *
 * `phrasing` says which wording arrived. `derived` is the deterministic text
 * that shipped with the answer; `specialist` means Nova's warmer rewrite landed
 * and replaced `statement`. Both are complete — the second is not "better data".
 */
export type RehearsalFeedback = {
  questionIndex: number
  noticed: string
  tryThis: string
  youAlreadyHave: string | null
  statement: string
  phrasing: "derived" | "specialist" | string
  branch?: string
  signals?: RehearsalAnswerSignals
  /** The one line saying this is practice, not assessment. */
  note?: string
  /** Why a model rewrite was thrown away, when one was. */
  refusals?: string[]
}

/** One question, the answer given to it, and the feedback on that answer. */
export type RehearsalTurn = {
  index: number
  question: RehearsalQuestion
  answer: string
  feedback: RehearsalFeedback
  answeredAt?: string | null
}

/**
 * A rehearsal session.
 *
 * `questions` are frozen at start, so a surface must not refetch or rebuild them
 * mid-session. `currentQuestion` is the server's own cursor — render that rather
 * than indexing `questions` locally.
 *
 * `sharedWithCoach` is false unless the owner turned it on, and `retentionDays`
 * is the rolling window from the last write. Both are user-facing promises, not
 * metadata.
 */
export type RehearsalSession = {
  rehearsalId: string
  status: RehearsalStatus
  questionIndex: number
  questionCount: number
  answered: number
  currentQuestion: RehearsalQuestion | null
  questions: RehearsalQuestion[]
  turns: RehearsalTurn[]
  roleTitle: string | null
  selfAdvocacy: string[]
  sharedWithCoach: boolean
  expiresAt: string | null
  retentionDays: number
  createdAt?: string | null
  updatedAt?: string | null
  note: string
}

/**
 * What stage 12 keeps in the journey — deliberately **not** the transcript.
 *
 * No answer text and no feedback text: the words stay in the session, which
 * expires and which the person can delete. `rehearsalId` is null once they have
 * deleted the session it pointed at.
 */
export type RehearsalArtefact = {
  rehearsalId: string | null
  roleTitle?: string | null
  questionCount: number
  answeredCount: number
  areasPractised: string[]
  completedAt?: string | null
  transcriptKept: boolean
  note: string
}

/**
 * `POST /rehearsal/sessions` — start, or resume an unfinished one.
 *
 * `canRehearse: false` with a populated `note` is a **200 and not an error**:
 * it is what somebody who reached stage 12 before stage 11 gets, and the note
 * names the missing interview guide. Reaching the stages out of order is not a
 * mistake, and this stage is optional either way.
 */
export type RehearsalStart = {
  canRehearse: boolean
  resumed: boolean
  session: RehearsalSession | null
  note: string | null
}

/** `GET /rehearsal` — the current session plus what stage 12 kept. */
export type RehearsalStored = {
  session: RehearsalSession | null
  result: RehearsalArtefact | null
}

/**
 * `POST /rehearsal/sessions/{id}/answers`.
 *
 * The feedback is in `turn.feedback`, right here, complete. `narrationJobId`
 * names the optional rewrite; ignoring it entirely loses nothing.
 */
export type RehearsalAnswerResult = {
  turn: RehearsalTurn
  session: RehearsalSession
  narrationJobId: string
}

/**
 * The narration job's result. `applied: false` is a **success**: the rehearsal
 * or the turn was deleted before the rewrite landed, which is the delete button
 * working exactly as intended.
 */
export type RehearsalNarrationResult = {
  applied: boolean
  reason?: string
  turnIndex?: number
  feedback?: RehearsalFeedback
}

/** `GET /rehearsal/jobs/{jobId}` — the optional rewrite, and only ever that. */
export type RehearsalNarrationJob = {
  jobId: string
  kind: string
  status: DirectionJobStatus
  result?: RehearsalNarrationResult | null
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** `DELETE /rehearsal/sessions/{id}` — the row is gone, not flagged. */
export type RehearsalDeleted = {
  deleted: boolean
  rehearsalId: string
}
