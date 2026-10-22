/**
 * Decision path — `/v1/blueprint/decision-path/*` (blueprint-service).
 *
 * The system checks a candidate's intake answers against the organisation's own
 * written minimum standard (rules as data) and RECOMMENDS a route; a named
 * decision-maker records the final route and the reason. The strengths (fit)
 * profile is shown for information and is never an input to the route.
 */

export type DecisionRuleKind =
  | "degree"
  | "licensure_path"
  | "background_check_status"
  | "attested_requirement"

export type DecisionOnFail = "refer" | "hold" | "none"
export type FinalRoute = "apprentice" | "residency" | "refer"
export type RecommendedRoute = FinalRoute | "hold"

export interface DecisionRule {
  id: string
  kind: DecisionRuleKind
  label: string
  operator: string
  expected: string | string[] | boolean | null
  onFail: DecisionOnFail
  sourceRef: string
}

export interface DecisionRouteEntry {
  when: string[]
  route: "residency" | "apprentice"
}

export interface DecisionPathStatus {
  enabled: boolean
  engineVersion: string
  staff: boolean
  superAdmin: boolean
  ruleKinds: DecisionRuleKind[]
  degreeLevels: string[]
  backgroundStatuses: string[]
  onFail: DecisionOnFail[]
  finalRoutes: FinalRoute[]
  minReason: number
  minOverrideReason: number
  advisoryNote: string
  backgroundCheckNote: string
}

export interface DecisionRuleSet {
  id: string
  name: string
  version: number
  status: "draft" | "active" | "retired"
  rules: DecisionRule[]
  routePolicy: DecisionRouteEntry[]
  decisionMakers: { sub: string; name: string }[]
  contentSha256: string
  engineVersion: string
  createdBy: string
  createdAt: string | null
  activatedBy: string | null
  activatedAt: string | null
  integrity: { state: "intact" | "redacted" | "mismatch"; note: string | null }
}

export interface DecisionRuleSetBody {
  name?: string
  rules: DecisionRule[]
  routePolicy: DecisionRouteEntry[]
  decisionMakerEmails: string[]
}

export type DecisionAnswers = Record<string, string | boolean>

export interface DecisionCaseBody {
  blueprintId: string
  ruleSetId: string
  candidateName: string
  candidateEmail?: string
  answers: DecisionAnswers
  attest: boolean
}

export interface DecisionCaseListItem {
  id: string
  candidateName: string | null
  status: "open" | "decided" | "withdrawn"
  blueprintId: string
  blueprintVersion: number
  openedAt: string | null
  recommendedRoute: RecommendedRoute | null
  finalRoute: FinalRoute | null
}

export interface DecisionRuleResult {
  ruleId: string
  kind: DecisionRuleKind
  label: string
  operator: string
  expected: string | string[] | boolean
  observed: string | boolean | null
  outcome: "pass" | "fail" | "missing"
  passed: boolean
  onFail: DecisionOnFail
  sourceRef: string
}

export interface DecisionFitSnapshot {
  available: boolean
  reason?: string
  tier?: string | null
  fitScore?: number
  coverage?: string
  usedForRoute: boolean
  label?: string
  blueprintVersion?: number
}

export interface DecisionValidationSnapshot {
  blueprintId: string
  blueprintVersion: number
  state: string
  validatedEventId: string | null
  method: string | null
  validatedOn: string | null
  statement: string | null
}

export interface DecisionEvent {
  id: string
  kind:
    | "intake"
    | "qualification_check"
    | "recommendation"
    | "go_forward"
    | "decision"
    | "amendment"
    | "withdrawn"
    | "exported"
  at: string | null
  actor: string
  ruleSetId: string | null
  ruleSetVersion: number | null
  ruleSetSha256: string | null
  engineVersion: string | null
  inputs: { answers?: DecisionAnswers; attested?: boolean; update?: boolean } | null
  result: {
    metMinimum?: boolean
    rules?: DecisionRuleResult[]
    route?: RecommendedRoute
    reasons?: string[]
    confirmed?: boolean
    changedFrom?: string | null
    flags?: string[]
    call?: string
  } | null
  recommendedRoute: RecommendedRoute | null
  finalRoute: FinalRoute | null
  reason: string | null
  fitSnapshot: DecisionFitSnapshot | null
  validationSnapshot: DecisionValidationSnapshot | null
  replay?: { replayable: boolean; matches: boolean; note: string | null; ruleSetHashMatches: boolean }
}

export interface DecisionSummary {
  metMinimum?: boolean | null
  recommendedRoute: RecommendedRoute | null
  recommendationReasons: string[]
  recommendedAt: string | null
  fitSnapshot: DecisionFitSnapshot | null
  validationSnapshot?: DecisionValidationSnapshot | null
  finalRoute: FinalRoute | null
  decidedBy?: string | null
  decidedAt?: string | null
  decisionReason?: string | null
  confirmed?: boolean | null
  changedFrom?: string | null
  flags?: string[]
}

export interface DecisionCaseView {
  id: string
  status: "open" | "decided" | "withdrawn"
  access: "record" | "summary"
  role: { blueprintId: string; roleTitle: string | null; version: number }
  openedAt: string | null
  advisoryNote: string
  candidateName?: string | null
  summary: DecisionSummary
  // the full record only
  candidate?: { name: string | null; email: string | null; accountLinked: boolean }
  openedBy?: string
  ruleSet?: DecisionRuleSet
  events?: DecisionEvent[]
  limits?: string[]
}

export interface DecisionBody {
  finalRoute: FinalRoute
  reason: string
}
