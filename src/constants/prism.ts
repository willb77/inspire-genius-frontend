import { QUEST_TYPE, type QuestTypeId } from '@/types/prism/api-types'
import {
  ASSESSMENT_STATUS,
  type AssessmentStatus,
} from '@/types/prism/assessment-types'

export { QUEST_TYPE, ASSESSMENT_STATUS }

/** Human-readable questionnaire type names */
export const QUEST_TYPE_NAMES: Record<QuestTypeId, string> = {
  [QUEST_TYPE.PROFESSIONAL]: 'Professional',
  [QUEST_TYPE.PERSONAL]: 'Personal',
  [QUEST_TYPE.FOUNDATION]: 'Foundation',
  [QUEST_TYPE.SELECT_ONLINE]: 'Select Online',
  [QUEST_TYPE.CAREER_MATCH]: 'Career Match',
  [QUEST_TYPE.CAREER_EXPLORER]: 'Career Explorer',
}

/** PRISM 4D quadrant colours and labels */
export const QUADRANT_CONFIG = {
  1: { label: 'Green', color: '#38A169', bgClass: 'bg-green-500' },
  2: { label: 'Blue', color: '#3182CE', bgClass: 'bg-blue-500' },
  3: { label: 'Red', color: '#E53E3E', bgClass: 'bg-red-500' },
  4: { label: 'Gold', color: '#ECC94B', bgClass: 'bg-yellow-500' },
} as const

/**
 * PRISM 8D behaviour labels and colours, keyed by PRISM's own BehaviourID.
 *
 * Each behaviour is tinted with ITS OWN quadrant's colour, per the licensed
 * PRISM manual:
 *   Green = Innovating + Initiating      Blue = Supporting + Co-Ordinating
 *   Red   = Focusing   + Delivering      Gold = Finishing  + Evaluating
 *
 * Until 2026-08-01 six of the eight carried the wrong quadrant's colour
 * (Supporting/Coordinating were red, Focusing/Delivering gold, Finishing/
 * Evaluating blue), matching a rotation that also existed server-side and
 * produced visibly wrong Blue/Gold/Red scores. `quadrant` indexes
 * QUADRANT_CONFIG and exists so the pairing is explicit and testable rather
 * than implied by a hex value.
 */
export const BEHAVIOUR_CONFIG = {
  1: { label: 'Innovating', quadrant: 1, color: '#38A169' },
  2: { label: 'Initiating', quadrant: 1, color: '#2F855A' },
  3: { label: 'Supporting', quadrant: 2, color: '#3182CE' },
  4: { label: 'Coordinating', quadrant: 2, color: '#2B6CB0' },
  5: { label: 'Focusing', quadrant: 3, color: '#E53E3E' },
  6: { label: 'Delivering', quadrant: 3, color: '#C53030' },
  7: { label: 'Finishing', quadrant: 4, color: '#ECC94B' },
  8: { label: 'Evaluating', quadrant: 4, color: '#D69E2E' },
} as const

/** Status badge config for UI display */
export const STATUS_CONFIG: Record<
  AssessmentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  initiated: { label: 'Initiated', variant: 'outline' },
  sent: { label: 'Sent', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'secondary' },
  unlocked: { label: 'Unlocked', variant: 'default' },
  report_ready: { label: 'Report Ready', variant: 'default' },
  ingested: { label: 'Active', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
}

/** Polling interval for status checks (ms) */
export const PRISM_POLL_INTERVAL = 30_000

/** Roles that receive notifications for assessment events */
export const NOTIFICATION_RECIPIENTS_BY_EVENT = {
  assessment_initiated: ['practitioner', 'manager'],
  questionnaire_completed: ['user', 'practitioner'],
  report_ready: ['user', 'practitioner', 'manager', 'company-admin'],
  report_ingested: [
    'user',
    'practitioner',
    'manager',
    'company-admin',
    'distributor',
    'super-admin',
  ],
} as const

/** Work Environment score thresholds */
export const WORK_ENV_THRESHOLDS = {
  ENHANCED: 65,
  NEUTRAL_LOW: 35,
  INHIBITED: 35,
} as const

/** Language options for questionnaire */
export const PRISM_LANGUAGES = [
  { id: 1, label: 'English' },
  { id: 2, label: 'Arabic' },
  { id: 3, label: 'Bengali' },
  { id: 4, label: 'Spanish (South American)' },
  { id: 5, label: 'Gujarati' },
  { id: 6, label: 'Marathi' },
  { id: 7, label: 'Russian' },
  { id: 8, label: 'Chinese (Traditional)' },
  { id: 9, label: 'Hindi' },
  { id: 10, label: 'Greek' },
  { id: 11, label: 'Slovenian' },
  { id: 12, label: 'Chinese (Simplified)' },
  { id: 13, label: 'German' },
  { id: 15, label: 'Burmese' },
  { id: 16, label: 'Polish' },
  { id: 17, label: 'Turkish' },
  { id: 18, label: 'Romanian' },
  { id: 19, label: 'Farsi' },
  { id: 20, label: 'Korean' },
  { id: 21, label: 'Swedish' },
] as const

/** Questionnaire type options for forms */
export const QUEST_TYPE_OPTIONS = [
  { id: QUEST_TYPE.FOUNDATION, label: 'Foundation', tier: 'Entry' },
  { id: QUEST_TYPE.PERSONAL, label: 'Personal', tier: 'Mid' },
  { id: QUEST_TYPE.PROFESSIONAL, label: 'Professional', tier: 'Full' },
  { id: QUEST_TYPE.CAREER_EXPLORER, label: 'Career Explorer', tier: 'Special' },
  { id: QUEST_TYPE.CAREER_MATCH, label: 'Career Match', tier: 'Special' },
] as const
