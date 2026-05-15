# PRISM Integration Plugin — Implementation Prompt

> **Goal:** Build a standalone, testable PRISM integration module that plugs into the Inspire Genius frontend. It covers the full lifecycle: requesting a PRISM questionnaire, tracking completion, unlocking reports, persisting to S3, ingesting data, and notifying stakeholders.

---

## 1. PRISM API Reference (PUK Service Library v2.5)

### Environments

| Env | Base URL |
|-----|----------|
| Staging | `https://staging.prismbrainmapping.com/service_library/v2/api.svc` |
| Production | `https://api.prismbrainmapping.com/service_library/v2/api.svc` |

All calls: **POST** with JSON body. No OAuth — auth is via `SiteID` (GUID) in every request body.

### Common Response Envelope

Every PRISM response includes:

```typescript
type PRISMBaseResponse = {
  ResponseMessage: string
  ActionURL1: string
  ActionURL2: string
  ActionURL3: string
  ActionURL4: string
  IsAuthorised: boolean
  ResponseStatus: number   // 0=Not processed, 1=Error, 2=Success
  QuestStatus: number       // 1=Not exist, 2=Exists, 3=Completed, 4=Accepted, 5=Deleted, 6=Already paid
  QuestStatusDesc: string
}
```

### Key Endpoints

#### CreateCandidate — `POST .../api.svc/CreateCandidate`
Creates a candidate + questionnaire on PRISM. Returns `ActionURL1` with the questionnaire link.

**Request:**
```json
{
  "SiteID": "GUID",
  "ClientID": "string",
  "ExternalIdent": "unique-candidate-id-in-IG",
  "ParentExternalIdent": "org-or-company-id-in-IG",
  "Forename": "string",
  "Surname": "string",
  "Organisation": "string",
  "Reference": "internal-reference",
  "Email": "user@example.com",
  "Gender": true,
  "LangID": 1,
  "QTypeID": 1,
  "CreateUser": true,
  "IsGift": false,
  "AccID": 0
}
```
**Response wrapper:** `CreateCandidateResult` containing standard envelope + `ActionURL1` (questionnaire URL).

- `CreateUser` only needs `true` on first call; subsequent calls link via `ExternalIdent`.
- `IsGift = true` auto-marks as paid (skips `UnlockReport`).

#### UnlockReport — `POST .../api.svc/UnlockReport`
Marks questionnaire as paid. Returns `ActionURL1` with the report URL.

**Request:**
```json
{
  "SiteID": "GUID",
  "ClientID": "string",
  "ExternalIdent": "candidate-id",
  "EntityTypeID": 1,
  "TransactionMethod": "IG-Platform",
  "OrderReference": "order-ref-123"
}
```
**Response wrapper:** `UnlockReportResult` containing standard envelope.

#### FetchCandidateHistory — `POST .../api.svc/FetchCandidateHistory`
Poll for questionnaire status (since PRISM has **no webhooks**).

**Request:** `{ SiteID, ClientID, ExternalIdent }`
**Response:** `FetchCandidateHistoryResult` with `HistoryList[]`:
```typescript
type HistoryItem = {
  EntityType: string
  ExternalIdent: string
  CandidateName: string
  DateSent: string
  DateCompleted: string
  IsCompleted: boolean
  IsPaidFor: boolean
  SubActionURL1: string  // PDF report URL (if completed+paid), pay URL (if completed+unpaid), continue URL (if incomplete)
  SubActionURL2: string  // Auto-sign-in URL
}
```

#### FetchReportData — `POST .../api.svc/FetchReportData`
Full structured report data for ingestion.

**Request:** `{ SiteID, ClientID, ExternalIdent, EntityTypeID, ONetCode? }`
**Response:** `FetchReportDataResult` with `ReportData`:
```typescript
type PRISMReportData = {
  dtBehData: Record<string, string>      // Behaviour scores → "Title | Description"
  dtKeyData1: string[]                    // Positive keywords
  dtKeyData2: string[]                    // Enhancement keywords
  dtTopBehData: Record<string, string>    // Top 3 behaviours
  dtWAData: WorkAptitude[]               // Work Aptitude scores
  dtWAPData: WorkActivityPreference[]    // Work Activity Preferences
  dtWEData: Record<string, string>       // Work Environment items
  fourDText: string                       // 4D analysis narrative
  kwdsleast: string[]                     // LEAST-like keywords
  kwdsMost: string[]                      // MOST-like keywords
  workAptitudeText: string
  workEnvironmentText: string
}
```

#### FetchReportEIData — `POST .../api.svc/FetchReportEIData`
Extended data: Big 5, Career Development, Emotional Intelligence, Mental Toughness.

**Request:** `{ SiteID, ClientID, ExternalIdent, EntityTypeID }`
**Response:** `FetchReportEIDataResult` with:
```typescript
type PRISMEIData = {
  BigFiveItems: { item_id: number; item_title: string; item_score: number }[]
  CDAItems: { group_id: number; item_title: string; score_desc_high: string; score_desc_low: string; item_score: number }[]
  EQItems: { item_id: number; item_title: string; item_score: number }[]
  MTItems: { item_id: number; item_title: string; item_desc: string; item_score: number }[]
}
```

#### Fetch4DRawOutput — `POST .../api.svc/Fetch4DRawOutput`
Raw 4-colour dimension scores.

**Request:** `{ SiteID, ClientID, ExternalIdent, EntityTypeID }`
**Response:** `Output4D[]` — `{ QuadID: 1=Green|2=Blue|3=Red|4=Gold, Name, Value }`

#### FetchFullMap / FetchBasicMap — `POST .../api.svc/FetchFullMap`
PRISM wheel image with 4D or 8D data.

**Request:** `{ SiteID, ClientID, ExternalIdent, EntityTypeID, ShowUnderlying, ShowAdapted, ShowConsistent, ShowBenchmarkOnly, ONetCode, UserRandomCode, Dimensions (4|8), LanguageID }`
**Response:** `{ CandName, MapFileName, Output4D[], Output8D[] }`

8D Behaviours: 1=Innovating, 2=Initiating, 3=Supporting, 4=Coordinating, 5=Focusing, 6=Delivering, 7=Finishing, 8=Evaluating

#### CheckEntityExists — `POST .../api.svc/CheckEntityExists`
Check if a PRISM entity exists for a candidate.

**Request:** `{ SiteID, ClientID, ExternalIdent, ChildIdentifier, EntityTypeID, DetailOne?, DetailTwo?, RetURL? }`
**Response:** `{ ObjectExists: boolean, ActionURL1 }`

#### UpgradeReport — `POST .../api.svc/UpgradeReport`
Upgrade questionnaire to higher tier (Foundation→Personal→Professional).

**Request:** `{ SiteID, ClientID, ExternalIdent, EntityTypeID, UpgradeEntityTypeID }`

### Questionnaire Type IDs (EntityTypeID / QTypeID)

| ID | Type | Tier |
|----|------|------|
| 4 | Foundation | Entry |
| 21 | Personal | Mid |
| 1 | Professional | Full |
| 19 | Select-Online | Special |
| 29 | Career Match | Special |
| 42 | Career Explorer | Special |

### Language IDs
| ID | Language |
|----|----------|
| 1 | English |
| 4 | Spanish (South American) |
| 13 | German |
| (see full list in API doc) |

### Important Notes
- **No webhooks/callbacks exist** — PRISM is purely request/response. Must poll `FetchCandidateHistory` or `CheckEntityExists` for completion.
- Despite what was discussed about adding a callback, the API v2.5 spec does **not** include one. The IG backend must implement a **polling service** (cron or queue) that checks `FetchCandidateHistory` periodically until `IsCompleted = true`.
- Work Environment scoring: ≥65 = Enhanced, 35–64 = Neutral, <35 = Inhibited

---

## 2. IG Backend API Endpoints (to be built on IG backend)

These are the IG backend endpoints the frontend will call. The IG backend proxies to PRISM and manages persistence:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/prism/initiate` | Create candidate + questionnaire on PRISM, start tracking |
| POST | `/v1/prism/submit` | Record questionnaire submission (called by callback/redirect) |
| GET | `/v1/prism/status/{assessmentId}` | Poll current status of an assessment |
| GET | `/v1/prism/report/{assessmentId}` | Fetch completed report (PDF URL + structured data) |
| POST | `/v1/prism/upgrade/{assessmentId}` | Upgrade report tier |
| GET | `/v1/prism/history/{userId}` | Get all PRISM assessments for a user |
| POST | `/v1/prism/unlock/{assessmentId}` | Trigger payment unlock |

### S3 Storage Structure
```
s3://ig-prism-reports/
  └── {userId}/
      └── {assessmentId}/
          ├── report.pdf
          ├── report-data.json      (FetchReportData structured output)
          ├── report-ei-data.json   (FetchReportEIData output)
          ├── map-full.png          (FetchFullMap output)
          ├── raw-4d.json           (Fetch4DRawOutput)
          └── metadata.json         (tracking timestamps, status)
```

---

## 3. What to Build (Frontend Plugin)

### 3A. File Structure

Create all files under a `prism` feature domain, following existing patterns:

```
src/
├── types/prism/
│   ├── api-types.ts          # PRISM API request/response types
│   ├── assessment-types.ts   # Assessment tracking, status, report types
│   └── index.ts              # Re-exports
├── services/prism/
│   ├── prism.service.ts      # All IG backend API calls for PRISM
│   └── index.ts
├── hooks/prism/
│   ├── usePrismInitiate.ts       # Mutation: initiate assessment
│   ├── usePrismStatus.ts         # Query: poll assessment status (with refetchInterval)
│   ├── usePrismReport.ts         # Query: fetch completed report
│   ├── usePrismHistory.ts        # Query: user's assessment history
│   ├── usePrismUnlock.ts         # Mutation: unlock/pay for report
│   ├── usePrismUpgrade.ts        # Mutation: upgrade report tier
│   └── index.ts
├── components/prism/
│   ├── PrismAssessmentCard.tsx       # Card showing assessment status + actions
│   ├── PrismInitiateForm.tsx         # Form to request new assessment
│   ├── PrismReportViewer.tsx         # Display structured report data
│   ├── PrismStatusBadge.tsx          # Status indicator badge
│   ├── PrismQuadrantChart.tsx        # 4D colour wheel visualization
│   ├── PrismBehaviourChart.tsx       # 8D behaviour radar/bar chart
│   ├── PrismWorkEnvironment.tsx      # Work environment Enhanced/Neutral/Inhibited display
│   ├── PrismBigFiveChart.tsx         # Big 5 personality visualization
│   ├── PrismEQChart.tsx              # Emotional Intelligence chart
│   ├── PrismMentalToughness.tsx      # Mental Toughness display
│   ├── PrismWorkAptitude.tsx         # Work Aptitude scores display
│   ├── __tests__/
│   │   ├── PrismAssessmentCard.test.tsx
│   │   ├── PrismInitiateForm.test.tsx
│   │   ├── PrismReportViewer.test.tsx
│   │   ├── PrismStatusBadge.test.tsx
│   │   └── PrismQuadrantChart.test.tsx
│   └── index.ts
├── pages/user/
│   └── PrismAssessment.tsx           # User-facing assessment page
├── pages/practitioner/
│   └── PrismClients.tsx              # Practitioner view of client assessments
├── pages/manager/
│   └── PrismTeam.tsx                 # Manager view of team assessments
└── constants/
    └── prism.ts                      # PRISM constants (type IDs, status enums, colours)
```

### 3B. Types — `src/types/prism/api-types.ts`

```typescript
// ── PRISM API Types (PUK Service Library v2.5) ──

/** Standard PRISM response envelope */
export type PRISMResponseEnvelope = {
  ResponseMessage: string
  ActionURL1: string
  ActionURL2: string
  ActionURL3: string
  ActionURL4: string
  IsAuthorised: boolean
  ResponseStatus: number   // 0=Not processed, 1=Error, 2=Success
  QuestStatus: number       // 1=Not exist, 2=Exists, 3=Completed, 4=Accepted, 5=Deleted, 6=Already paid
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

/** Report tier hierarchy for upgrades */
export const REPORT_TIERS: QuestTypeId[] = [4, 21, 1] // Foundation → Personal → Professional

/** PRISM 4D Quadrant */
export type PRISMQuadrant = {
  QuadID: 1 | 2 | 3 | 4   // 1=Green, 2=Blue, 3=Red, 4=Gold
  Name: string
  Value: number
}

/** PRISM 8D Behaviour Dimension */
export type PRISMBehaviourDimension = {
  BehaviourID: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  Name: string   // Innovating, Initiating, Supporting, Coordinating, Focusing, Delivering, Finishing, Evaluating
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
```

### 3C. Types — `src/types/prism/assessment-types.ts`

```typescript
import type { QuestTypeId, PRISMReportData, PRISMReportEIData, PRISMQuadrant, PRISMBehaviourDimension } from './api-types'

/** Assessment lifecycle status (IG-managed) */
export const ASSESSMENT_STATUS = {
  INITIATED: 'initiated',           // CreateCandidate called, waiting for user
  QUESTIONNAIRE_SENT: 'sent',       // Link sent to user
  IN_PROGRESS: 'in_progress',       // User has started
  COMPLETED: 'completed',           // Questionnaire finished, not yet paid
  UNLOCKED: 'unlocked',             // Paid/unlocked, report available
  REPORT_READY: 'report_ready',     // Report fetched + stored in S3
  INGESTED: 'ingested',             // Tokenized, scored, vectorized into IG
  ERROR: 'error',
} as const

export type AssessmentStatus = (typeof ASSESSMENT_STATUS)[keyof typeof ASSESSMENT_STATUS]

/** IG Assessment tracking record */
export type PrismAssessment = {
  id: string                           // IG assessment UUID
  userId: string                       // IG user ID
  externalIdent: string                // PRISM ExternalIdent
  parentExternalIdent: string          // PRISM ParentExternalIdent (org)
  questionnaireType: QuestTypeId
  questionnaireTypeName: string        // "Professional", "Foundation", etc.
  status: AssessmentStatus
  questionnaireUrl: string | null      // PRISM ActionURL1 for questionnaire
  reportUrl: string | null             // PRISM ActionURL1 for report PDF
  s3ReportKey: string | null           // S3 key for stored report
  s3DataKey: string | null             // S3 key for stored JSON data

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
  gender: boolean               // true=male, false=female
  organisation: string
  reference?: string
  questionnaireTypeId: QuestTypeId
  languageId?: number           // default 1 (English)
  isGift?: boolean              // auto-marks as paid
}

/** Initiate assessment response (from IG backend) */
export type InitiateAssessmentResponse = {
  assessmentId: string
  questionnaireUrl: string       // URL user must visit to complete
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
  elapsedMinutes: number | null  // Time from initiation
}

/** Full report response (from IG backend, after S3 retrieval) */
export type PrismReportResponse = {
  assessmentId: string
  userId: string
  status: AssessmentStatus
  reportPdfUrl: string | null           // Presigned S3 URL
  reportData: PRISMReportData | null    // Structured report data
  reportEIData: PRISMReportEIData | null
  quadrants: PRISMQuadrant[] | null     // 4D scores
  behaviours: PRISMBehaviourDimension[] | null  // 8D scores
  mapImageUrl: string | null            // Presigned S3 URL for PRISM wheel
  fetchedAt: string
}

/** Unlock (payment) request */
export type UnlockAssessmentRequest = {
  assessmentId: string
  transactionMethod: string     // e.g. "Stripe", "IG-Credits"
  orderReference: string        // payment/order ID
}

/** Upgrade request */
export type UpgradeAssessmentRequest = {
  assessmentId: string
  targetTypeId: QuestTypeId     // The tier to upgrade to
}

/** Notification payload for stakeholder alerts */
export type PrismNotification = {
  type: 'assessment_initiated' | 'questionnaire_completed' | 'report_ready' | 'report_ingested'
  assessmentId: string
  userId: string
  userName: string
  recipients: {
    role: string                // 'user' | 'practitioner' | 'manager' | 'company-admin' | 'distributor' | 'super-admin'
    userId: string
    notificationMethod: 'in-app' | 'email' | 'both'
  }[]
  message: string
  timestamp: string
}
```

### 3D. Constants — `src/constants/prism.ts`

```typescript
import { QUEST_TYPE, type QuestTypeId } from '@/types/prism/api-types'
import { ASSESSMENT_STATUS, type AssessmentStatus } from '@/types/prism/assessment-types'

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

/** PRISM 8D behaviour labels and colours */
export const BEHAVIOUR_CONFIG = {
  1: { label: 'Innovating', color: '#38A169' },
  2: { label: 'Initiating', color: '#2F855A' },
  3: { label: 'Supporting', color: '#E53E3E' },
  4: { label: 'Coordinating', color: '#C53030' },
  5: { label: 'Focusing', color: '#ECC94B' },
  6: { label: 'Delivering', color: '#D69E2E' },
  7: { label: 'Finishing', color: '#3182CE' },
  8: { label: 'Evaluating', color: '#2B6CB0' },
} as const

/** Status badge config for UI display */
export const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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
export const PRISM_POLL_INTERVAL = 30_000 // 30 seconds

/** Roles that receive notifications for assessment events */
export const NOTIFICATION_RECIPIENTS_BY_EVENT = {
  assessment_initiated: ['practitioner', 'manager'],
  questionnaire_completed: ['user', 'practitioner'],
  report_ready: ['user', 'practitioner', 'manager', 'company-admin'],
  report_ingested: ['user', 'practitioner', 'manager', 'company-admin', 'distributor', 'super-admin'],
} as const

/** Work Environment score thresholds */
export const WORK_ENV_THRESHOLDS = {
  ENHANCED: 65,    // score >= 65
  NEUTRAL_LOW: 35, // 35 <= score < 65
  INHIBITED: 35,   // score < 35
} as const
```

### 3E. Service — `src/services/prism/prism.service.ts`

Follow the existing service pattern. All calls go through the IG backend (which proxies to PRISM).

```typescript
import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type {
  InitiateAssessmentRequest,
  InitiateAssessmentResponse,
  AssessmentStatusResponse,
  PrismReportResponse,
  PrismAssessment,
  UnlockAssessmentRequest,
  UpgradeAssessmentRequest,
} from '@/types/prism/assessment-types'

const BASE = '/v1/prism'

/** Initiate a new PRISM assessment */
export function initiateAssessment(data: InitiateAssessmentRequest) {
  return api.post<BaseApiResponse<InitiateAssessmentResponse>>(`${BASE}/initiate`, data)
}

/** Poll assessment status */
export function getAssessmentStatus(assessmentId: string) {
  return api.get<BaseApiResponse<AssessmentStatusResponse>>(`${BASE}/status/${assessmentId}`)
}

/** Fetch completed report (PDF + structured data) */
export function getAssessmentReport(assessmentId: string) {
  return api.get<BaseApiResponse<PrismReportResponse>>(`${BASE}/report/${assessmentId}`)
}

/** Get all assessments for a user */
export function getUserAssessments(userId: string) {
  return api.get<BaseApiResponse<{ assessments: PrismAssessment[]; total: number }>>(`${BASE}/history/${userId}`)
}

/** Unlock/pay for a report */
export function unlockAssessment(data: UnlockAssessmentRequest) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(`${BASE}/unlock/${data.assessmentId}`, data)
}

/** Upgrade report to higher tier */
export function upgradeAssessment(data: UpgradeAssessmentRequest) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(`${BASE}/upgrade/${data.assessmentId}`, data)
}

/** Submit callback — called when user returns from PRISM questionnaire */
export function submitQuestionnaireCallback(assessmentId: string) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(`${BASE}/submit`, { assessmentId })
}
```

### 3F. Hooks — `src/hooks/prism/`

Each hook wraps a service call in React Query, following the `useAgents`/`useTones` pattern.

#### `usePrismInitiate.ts`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { initiateAssessment } from '@/services/prism/prism.service'
import type { InitiateAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismInitiate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InitiateAssessmentRequest) => initiateAssessment(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success('PRISM assessment initiated! Check your email for the questionnaire link.')
    },
    onError: () => {
      toast.error('Failed to initiate PRISM assessment. Please try again.')
    },
  })
}
```

#### `usePrismStatus.ts`
```typescript
import { useQuery } from '@tanstack/react-query'
import { getAssessmentStatus } from '@/services/prism/prism.service'
import { PRISM_POLL_INTERVAL } from '@/constants/prism'
import type { AxiosError } from 'axios'

/**
 * Polls assessment status. Automatically stops polling when status
 * reaches 'report_ready', 'ingested', or 'error'.
 */
export function usePrismStatus(assessmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['prism-status', assessmentId],
    queryFn: () => getAssessmentStatus(assessmentId!),
    enabled: enabled && !!assessmentId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status
      if (status === 'report_ready' || status === 'ingested' || status === 'error') {
        return false // stop polling
      }
      return PRISM_POLL_INTERVAL
    },
  })
}
```

#### `usePrismReport.ts`
```typescript
import { useQuery } from '@tanstack/react-query'
import { getAssessmentReport } from '@/services/prism/prism.service'

export function usePrismReport(assessmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['prism-report', assessmentId],
    queryFn: () => getAssessmentReport(assessmentId!),
    enabled: enabled && !!assessmentId,
    staleTime: 5 * 60 * 1000, // reports don't change often
  })
}
```

#### `usePrismHistory.ts`
```typescript
import { useQuery } from '@tanstack/react-query'
import { getUserAssessments } from '@/services/prism/prism.service'

export function usePrismHistory(userId: string | null) {
  return useQuery({
    queryKey: ['prism-history', userId],
    queryFn: () => getUserAssessments(userId!),
    enabled: !!userId,
  })
}
```

#### `usePrismUnlock.ts`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { unlockAssessment } from '@/services/prism/prism.service'
import type { UnlockAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismUnlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UnlockAssessmentRequest) => unlockAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prism-status', variables.assessmentId] })
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success('Report unlocked! Your PRISM report is being prepared.')
    },
    onError: () => {
      toast.error('Failed to unlock report. Please try again.')
    },
  })
}
```

#### `usePrismUpgrade.ts`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upgradeAssessment } from '@/services/prism/prism.service'
import type { UpgradeAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismUpgrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpgradeAssessmentRequest) => upgradeAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prism-status', variables.assessmentId] })
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success('Report upgrade initiated!')
    },
    onError: () => {
      toast.error('Failed to upgrade report.')
    },
  })
}
```

### 3G. Components (Implementation Specs)

#### `PrismStatusBadge.tsx`
- Accepts `status: AssessmentStatus`
- Uses `Badge` from shadcn/ui with variant from `STATUS_CONFIG`
- Shows appropriate label text

#### `PrismInitiateForm.tsx`
- React Hook Form + Zod validation
- Fields: questionnaire type (select), language (select), reference (optional text)
- Pre-fills forename, surname, email, organisation from `useAuth()` user
- Gender select (required by PRISM API)
- Submit calls `usePrismInitiate`
- On success, shows questionnaire URL with "Open Questionnaire" button (opens in new tab)

**Zod schema:**
```typescript
const initiateSchema = z.object({
  questionnaireTypeId: z.number({ required_error: 'Select a questionnaire type' }),
  languageId: z.number().default(1),
  gender: z.boolean({ required_error: 'Select gender' }),
  reference: z.string().optional(),
})
```

#### `PrismAssessmentCard.tsx`
- Card displaying a single `PrismAssessment`
- Shows: type name, status badge, dates, elapsed time
- Actions based on status:
  - `initiated`/`sent`: "Open Questionnaire" link
  - `completed`: "Unlock Report" button (calls `usePrismUnlock`)
  - `unlocked`/`report_ready`: "View Report" button
  - `ingested`: "View Dashboard" link
  - Any completed tier: "Upgrade" button if not at Professional level
- Uses `usePrismStatus` for live polling when status is in-progress

#### `PrismReportViewer.tsx`
- Master component that fetches and displays the full report
- Uses `usePrismReport` hook
- Renders sub-components:
  - `PrismQuadrantChart` — 4D colour wheel / bar chart
  - `PrismBehaviourChart` — 8D radar or horizontal bar chart
  - `PrismWorkAptitude` — scored aptitude items
  - `PrismWorkEnvironment` — Enhanced/Neutral/Inhibited categorized items
  - `PrismBigFiveChart` — Big 5 personality scores
  - `PrismEQChart` — Emotional Intelligence scores
  - `PrismMentalToughness` — Mental Toughness items
- Tabbed interface: "Overview" | "Behaviours" | "Work Profile" | "Personality" | "Report PDF"
- "Report PDF" tab embeds PDF from presigned S3 URL

#### `PrismQuadrantChart.tsx`
- Accepts `quadrants: PRISMQuadrant[]`
- Renders 4 colour bars (Green, Blue, Red, Gold) with percentage values
- Uses colours from `QUADRANT_CONFIG`
- Integrate with existing `PRISMThermometer` component pattern

#### `PrismBehaviourChart.tsx`
- Accepts `behaviours: PRISMBehaviourDimension[]`
- Horizontal bar chart showing 8 behaviour dimensions
- Colour-coded per `BEHAVIOUR_CONFIG`
- Score labels (0–100)

#### `PrismWorkEnvironment.tsx`
- Accepts `data: Record<string, string>` from `dtWEData`
- Groups items into Enhanced (≥65), Neutral (35–64), Inhibited (<35)
- Colour-coded sections: green for Enhanced, amber for Neutral, red for Inhibited

#### `PrismWorkAptitude.tsx`
- Accepts `data: WorkAptitude[]`
- Shows aptitude title, description, score bar, and occupation comparison score
- Side-by-side comparison bars if `occupation_score` is present

#### `PrismBigFiveChart.tsx`, `PrismEQChart.tsx`, `PrismMentalToughness.tsx`
- Horizontal bar chart components for their respective data types
- Consistent styling with other chart components

### 3H. Pages

#### `src/pages/user/PrismAssessment.tsx`
- Wrapped in `UserLayout`
- Sections:
  1. **Active Assessment** — if user has an in-progress assessment, show `PrismAssessmentCard` with live status polling
  2. **Request New Assessment** — `PrismInitiateForm` (disabled if active assessment exists)
  3. **Assessment History** — list of past `PrismAssessmentCard`s from `usePrismHistory`
  4. **Report Viewer** — expandable section showing `PrismReportViewer` for any completed assessment

#### `src/pages/practitioner/PrismClients.tsx`
- Wrapped in `PractitionerLayout`
- Table/list of all client assessments the practitioner manages
- Columns: client name, type, status, date initiated, date completed, actions
- Filter by status, type
- Click row to view `PrismReportViewer`

#### `src/pages/manager/PrismTeam.tsx`
- Wrapped in `ManagerLayout`
- Shows team members' PRISM assessment status
- Aggregate stats: completion rate, average scores
- Click member to see their report

### 3I. Route Registration

Add to `src/constants/routes.ts`:
```typescript
// In ROUTES object:
PRISM_ASSESSMENT: '/prism-assessment',

// In ROUTES.MANAGER:
PRISM_TEAM: '/manager/prism-team',

// In ROUTES.PRACTITIONER:
PRISM_CLIENTS: '/practitioner/prism-clients',

// In ROUTES.COMPANY_ADMIN:
PRISM_OVERVIEW: '/company-admin/prism-overview',
```

Add routes in `src/routes.tsx` and nav items in `src/constants/navigation.ts`.

---

## 4. Step Two — Report Ingestion Pipeline

After a report reaches `report_ready` status, the IG backend performs:

### 4A. Tokenize
- Extract text content from `PRISMReportData` fields: `fourDText`, `workAptitudeText`, `workEnvironmentText`, keyword arrays
- Tokenize into searchable segments for Alex (IG's AI coach)

### 4B. Score
- Normalize PRISM scores (4D quadrants, 8D behaviours, Work Aptitudes, Big 5, EQ, Mental Toughness) into IG's internal scoring format
- Map to IG's coaching dimensions
- Calculate composite scores for dashboard display

### 4C. Vectorize
- Generate embeddings from report text + scores for semantic search
- Store vectors in IG's vector database for Alex to query during coaching sessions
- Link vectors to user's profile for personalized coaching

### 4D. Dashboard Integration
- Update user's dashboard `PRISMThermometer` with real 4D scores (currently uses placeholder data)
- Add PRISM section to dashboard showing:
  - Current quadrant breakdown
  - Behaviour dimension highlights (top 3)
  - Work environment summary
  - Link to full report

### 4E. Notification Pipeline
When report reaches `ingested` status, notify all relevant stakeholders:

| Recipient | Notification |
|-----------|-------------|
| **User** | "Your PRISM report is ready! View your personalized coaching insights." |
| **Practitioner** | "Client {name}'s PRISM report is available for review." |
| **Manager** | "Team member {name} has completed their PRISM assessment." |
| **Company Admin** | "New PRISM report available for {name} in {org}." |
| **Distributor** | Summary notification (batched daily) |
| **Super Admin** | Audit log entry |

**Notification methods:**
- In-app toast via Sonner
- In-app notification bell (existing notification system)
- Email notification (via IG backend email service)

---

## 5. Testing Strategy

### 5A. Unit Tests (Jest + RTL)
- Test each component in isolation with mocked hook data
- Test hooks with mocked service responses using `msw` or jest mocks
- Test form validation (Zod schemas)
- Test status badge rendering for all statuses
- Test chart components with edge cases (empty data, max values, single quadrant)

### 5B. Integration Tests
- Test full initiation flow: form submit → success toast → history update
- Test status polling: mock refetch intervals, verify polling stops at terminal status
- Test unlock flow: button click → mutation → cache invalidation
- Test report viewer: tab switching, data loading states

### 5C. Standalone Testing (Plugin Independence)
Build a test harness page at `/dev/prism-test` (dev-only route) that:
- Provides mock data for all PRISM types
- Renders all components with sample data
- Has buttons to trigger each hook with mock responses
- Shows the full assessment lifecycle without needing a real backend

```typescript
// src/pages/dev/PrismTestHarness.tsx
// Only registered in routes when VITE_DEV_TOOLS=true
// Provides mock PrismAssessment data at each status
// Renders PrismInitiateForm, PrismAssessmentCard, PrismReportViewer
// with toggleable mock data
```

---

## 6. Implementation Sequence

1. **Types first** — `src/types/prism/` (api-types, assessment-types)
2. **Constants** — `src/constants/prism.ts`
3. **Service** — `src/services/prism/prism.service.ts`
4. **Hooks** — `src/hooks/prism/` (all 6 hooks)
5. **Atomic components** — StatusBadge, QuadrantChart, BehaviourChart, WorkEnvironment, WorkAptitude, BigFiveChart, EQChart, MentalToughness
6. **Composite components** — AssessmentCard, InitiateForm, ReportViewer
7. **Pages** — User PrismAssessment, Practitioner PrismClients, Manager PrismTeam
8. **Routes + Nav** — Register routes and nav items
9. **Tests** — Unit tests for all components and hooks
10. **Test harness** — Dev-only page with mock data
11. **Dashboard integration** — Wire real PRISM data into existing dashboard components

---

## 7. Environment Variables

Add to `.env` / Vite config:
```env
VITE_PRISM_CALLBACK_URL=https://app.inspiregenius.com/prism/callback
VITE_DEV_TOOLS=true  # enables test harness route in dev
```

The IG backend needs (not frontend concerns, but for reference):
```env
PRISM_SITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PRISM_CLIENT_ID=your-client-id
PRISM_API_URL=https://staging.prismbrainmapping.com/service_library/v2/api.svc
AWS_S3_PRISM_BUCKET=ig-prism-reports
```

---

## 8. Key Architectural Decisions

1. **Frontend never calls PRISM directly** — all PRISM API calls go through the IG backend. The frontend only talks to IG's `/v1/prism/*` endpoints. This keeps `SiteID`/`ClientID` credentials server-side.

2. **Polling over WebSockets for status** — PRISM has no webhooks. The IG backend polls PRISM via a background job. The frontend polls the IG backend via React Query's `refetchInterval`. This is simpler than adding WebSocket infrastructure for a single feature.

3. **S3 for report persistence** — Reports are fetched once from PRISM and stored in S3. Subsequent views use presigned S3 URLs. This avoids repeated PRISM API calls and ensures reports survive even if PRISM access changes.

4. **Plugin architecture** — All PRISM code lives in `types/prism/`, `services/prism/`, `hooks/prism/`, `components/prism/`. No modifications to existing components needed except: (a) adding routes, (b) adding nav items, (c) wiring real data into the existing `PRISMThermometer` dashboard component.
