import type {
  QuestTypeId,
  PRISMReportData,
  PRISMReportEIData,
  PRISMQuadrant,
  PRISMBehaviourDimension,
} from './api-types'

/** Assessment lifecycle status (IG-managed) */
export const ASSESSMENT_STATUS = {
  INITIATED: 'initiated',
  QUESTIONNAIRE_SENT: 'sent',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  UNLOCKED: 'unlocked',
  REPORT_READY: 'report_ready',
  INGESTED: 'ingested',
  ERROR: 'error',
} as const

export type AssessmentStatus =
  (typeof ASSESSMENT_STATUS)[keyof typeof ASSESSMENT_STATUS]

/** IG Assessment tracking record */
export type PrismAssessment = {
  id: string
  userId: string
  externalIdent: string
  parentExternalIdent: string
  questionnaireType: QuestTypeId
  questionnaireTypeName: string
  status: AssessmentStatus
  questionnaireUrl: string | null
  reportUrl: string | null
  s3ReportKey: string | null
  s3DataKey: string | null

  // Elapsed time tracking
  initiatedAt: string | null
  questionnaireSentAt: string | null
  questionnaireStartedAt: string | null
  questionnaireCompletedAt: string | null
  unlockedAt: string | null
  reportFetchedAt: string | null
  ingestedAt: string | null

  createdAt: string
  updatedAt: string
}

/** Initiate assessment request (sent to IG backend) */
export type InitiateAssessmentRequest = {
  userId: string
  forename: string
  surname: string
  email: string
  gender: boolean
  organisation: string
  reference?: string
  questionnaireTypeId: QuestTypeId
  languageId?: number
  isGift?: boolean
}

/** Initiate assessment response (from IG backend) */
export type InitiateAssessmentResponse = {
  assessmentId: string
  questionnaireUrl: string
  externalIdent: string
  status: AssessmentStatus
}

/** Assessment status response */
export type AssessmentStatusResponse = {
  assessmentId: string
  status: AssessmentStatus
  questionnaireUrl: string | null
  reportUrl: string | null
  isCompleted: boolean
  isPaidFor: boolean
  completedAt: string | null
  elapsedMinutes: number | null
}

/** Full report response (from IG backend, after S3 retrieval) */
export type PrismReportResponse = {
  assessmentId: string
  userId: string
  status: AssessmentStatus
  reportPdfUrl: string | null
  reportData: PRISMReportData | null
  reportEIData: PRISMReportEIData | null
  quadrants: PRISMQuadrant[] | null
  behaviours: PRISMBehaviourDimension[] | null
  mapImageUrl: string | null
  fetchedAt: string
}

/** Unlock (payment) request */
export type UnlockAssessmentRequest = {
  assessmentId: string
  transactionMethod: string
  orderReference: string
}

/** Upgrade request */
export type UpgradeAssessmentRequest = {
  assessmentId: string
  targetTypeId: QuestTypeId
}

/** Notification payload for stakeholder alerts */
export type PrismNotification = {
  type:
    | 'assessment_initiated'
    | 'questionnaire_completed'
    | 'report_ready'
    | 'report_ingested'
  assessmentId: string
  userId: string
  userName: string
  recipients: {
    role: string
    userId: string
    notificationMethod: 'in-app' | 'email' | 'both'
  }[]
  message: string
  timestamp: string
}
