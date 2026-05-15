// ── PRISM API Types (PUK Service Library v2.5) ──

/** Standard PRISM response envelope */
export type PRISMResponseEnvelope = {
  ResponseMessage: string
  ActionURL1: string
  ActionURL2: string
  ActionURL3: string
  ActionURL4: string
  IsAuthorised: boolean
  ResponseStatus: number // 0=Not processed, 1=Error, 2=Success
  QuestStatus: number // 1=Not exist, 2=Exists, 3=Completed, 4=Accepted, 5=Deleted, 6=Already paid
  QuestStatusDesc: string
}

/** Questionnaire status codes */
export const QUEST_STATUS = {
  NOT_EXIST: 1,
  EXISTS: 2,
  COMPLETED: 3,
  ACCEPTED: 4,
  DELETED: 5,
  ALREADY_PAID: 6,
} as const

/** Questionnaire type IDs */
export const QUEST_TYPE = {
  PROFESSIONAL: 1,
  FOUNDATION: 4,
  SELECT_ONLINE: 19,
  PERSONAL: 21,
  CAREER_MATCH: 29,
  CAREER_EXPLORER: 42,
} as const

export type QuestTypeId = (typeof QUEST_TYPE)[keyof typeof QUEST_TYPE]

/** Report tier hierarchy for upgrades: Foundation → Personal → Professional */
export const REPORT_TIERS: QuestTypeId[] = [4, 21, 1]

/** PRISM 4D Quadrant */
export type PRISMQuadrant = {
  QuadID: 1 | 2 | 3 | 4 // 1=Green, 2=Blue, 3=Red, 4=Gold
  Name: string
  Value: number
}

/** PRISM 8D Behaviour Dimension */
export type PRISMBehaviourDimension = {
  BehaviourID: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  Name: string
  Value: number
}

/** Work Aptitude item */
export type WorkAptitude = {
  apt_id: number
  apt_title: string
  apt_desc: string
  apt_desc_short: string
  score: number
  occupation_score: number
}

/** Work Activity Preference */
export type WorkActivityPreference = {
  group_id: number
  group_name: string
  item_name: string
  description_high: string
  description_low: string
  score: number
}

/** Big Five personality item */
export type BigFiveItem = {
  item_id: number
  item_title: string
  item_score: number
}

/** Emotional Intelligence item */
export type EQItem = {
  item_id: number
  item_title: string
  item_score: number
}

/** Mental Toughness item */
export type MentalToughnessItem = {
  item_id: number
  item_title: string
  item_desc: string
  item_score: number
}

/** Career Development item */
export type CareerDevelopmentItem = {
  group_id: number
  item_title: string
  score_desc_high: string
  score_desc_low: string
  item_score: number
}

/** Full PRISM Report Data (from FetchReportData) */
export type PRISMReportData = {
  dtBehData: Record<string, string>
  dtKeyData1: string[]
  dtKeyData2: string[]
  dtTopBehData: Record<string, string>
  dtWAData: WorkAptitude[]
  dtWAPData: WorkActivityPreference[]
  dtWEData: Record<string, string>
  fourDText: string
  kwdsleast: string[]
  kwdsMost: string[]
  workAptitudeText: string
  workEnvironmentText: string
}

/** Extended Report Data (from FetchReportEIData) */
export type PRISMReportEIData = {
  BigFiveItems: BigFiveItem[]
  CDAItems: CareerDevelopmentItem[]
  EQItems: EQItem[]
  MTItems: MentalToughnessItem[]
}

/** Candidate history item (from FetchCandidateHistory) */
export type PRISMHistoryItem = {
  EntityType: string
  ExternalIdent: string
  CandidateName: string
  DateSent: string
  DateCompleted: string
  IsCompleted: boolean
  IsPaidFor: boolean
  SubActionURL1: string
  SubActionURL2: string
}
