# Inspire Genius — Process Guide
## PRISM Report Retrieval & Job Blueprint Creation

**Version:** 1.0
**Date:** March 22, 2026
**Classification:** Internal — Technical Reference

---

# Part 1: Get PRISM Report — End-to-End Process

This section documents the complete lifecycle of requesting a PRISM Brain Mapping questionnaire, tracking its completion, unlocking the report, retrieving the data, and delivering it to the user's S3 bucket.

---

## Step 1: User Requests a PRISM Assessment

**Who:** A user (employee), practitioner, or manager initiates the request from the Inspire Genius frontend.

**What happens:**
1. The user opens the **PRISM Assessment** page (`/prism-assessment`).
2. They fill out the **Request Assessment** form with:
   - **First Name** and **Last Name**
   - **Email Address** (PRISM sends the questionnaire link here)
   - **Gender** (required by PRISM API: `true` = male, `false` = female)
   - **Organisation** name
   - **Questionnaire Type** — one of:
     - Foundation (ID: `4`) — entry level, 4D quadrant profile
     - Personal (ID: `21`) — mid level, adds 8D behaviours and work environment
     - Professional (ID: `1`) — full level, adds Big 5, EQ, Mental Toughness, Career Development
   - **Language** (default: English, 20+ languages supported)
   - **Create PRISM User Account** toggle (first-time users need this enabled)
   - **Gift / Pre-paid** toggle (if enabled, skips the unlock/payment step)
   - **Internal Reference** (optional, for organisational tracking)
3. The user clicks **Request Assessment**.

**What the frontend does:**
- Calls `POST /v1/prism/initiate` on the IG backend with the form data.
- The `usePrismInitiate` React Query mutation handles the request, toast notifications, and cache invalidation.

---

## Step 2: IG Backend Calls PRISM CreateCandidate API

**Who:** The IG backend (server-side only — the frontend never calls PRISM directly).

**What happens:**

The IG backend receives the initiate request and calls the PRISM API:

**API Call:**
```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/CreateCandidate
```
*(Staging: `https://staging.prismbrainmapping.com/service_library/v2/api.svc/CreateCandidate`)*

**Request Body:**
```json
{
  "SiteID": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "ClientID": "inspire-genius-client-id",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "ParentExternalIdent": "IG-ORG-x9y8z7",
  "Forename": "Jane",
  "Surname": "Smith",
  "Organisation": "Acme Corp",
  "Reference": "IG-REF-2026-042",
  "Email": "jane.smith@acme.com",
  "Gender": false,
  "LangID": 1,
  "QTypeID": 1,
  "CreateUser": true,
  "IsGift": false,
  "AccID": 0
}
```

| Field | Source | Notes |
|-------|--------|-------|
| `SiteID` | IG backend env var `PRISM_SITE_ID` | GUID provided by PRISM admin; never exposed to frontend |
| `ClientID` | IG backend env var `PRISM_CLIENT_ID` | Identifies IG as the calling application |
| `ExternalIdent` | Auto-generated from IG user ID | Unique identifier linking this candidate to IG's user record |
| `ParentExternalIdent` | From user's organisation ID in IG | Links to the parent company/school in PRISM |
| `CreateUser` | `true` on first call | Creates a login on the PRISM platform; subsequent calls use `false` |
| `IsGift` | User's toggle choice | If `true`, auto-marks as paid — report available immediately, skipping Step 6 |
| `QTypeID` | Selected questionnaire type | 1=Professional, 4=Foundation, 21=Personal |

**PRISM Response:**
```json
{
  "CreateCandidateResult": {
    "ResponseMessage": "Candidate created successfully",
    "ActionURL1": "https://app.prismbrainmapping.com/questionnaire/abc123xyz",
    "ActionURL2": "",
    "ActionURL3": "",
    "ActionURL4": "",
    "IsAuthorised": true,
    "ResponseStatus": 2,
    "QuestStatus": 2,
    "QuestStatusDesc": "Questionnaire exists"
  }
}
```

| Response Field | Meaning |
|---------------|---------|
| `ResponseStatus: 2` | Success |
| `QuestStatus: 2` | Questionnaire has been created and exists |
| `ActionURL1` | **The questionnaire URL** — this is what the user clicks to complete the PRISM survey |

**What the IG backend does next:**
1. Creates an assessment tracking record in the IG database with status `initiated`.
2. Stores the `ExternalIdent` mapping for future API calls.
3. Records timestamps: `initiatedAt`, `questionnaireSentAt`.
4. Returns the `questionnaireUrl` (from `ActionURL1`) to the frontend.

**What the frontend shows:**
- A success toast: "PRISM assessment initiated!"
- A card with a **"Open Questionnaire"** button linking to the PRISM URL (opens in new tab).

---

## Step 3: User Completes the PRISM Questionnaire

**Who:** The user (candidate).

**What happens:**
1. The user clicks the questionnaire link and is taken to the PRISM Brain Mapping website.
2. They complete the questionnaire (typically 15–45 minutes depending on type).
3. The questionnaire has 4 parts that must be completed in order: Part 1A, Part 1B, Part 2A, Part 2B.
4. Upon completion, PRISM marks the questionnaire as `Completed` (QuestStatus: 3).

**Important:** PRISM has **no webhook or callback mechanism**. There is no automatic notification back to IG when the questionnaire is finished. IG must poll for completion.

---

## Step 4: IG Backend Polls for Questionnaire Completion

**Who:** The IG backend (automated polling service).

**What happens:**

Since PRISM provides no webhooks, the IG backend runs a **polling job** that periodically checks the status of active assessments.

**API Call (repeated every 30–60 seconds for active assessments):**
```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/FetchCandidateHistory
```

**Request Body:**
```json
{
  "SiteID": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "ClientID": "inspire-genius-client-id",
  "ExternalIdent": "IG-USR-a1b2c3d4"
}
```

**PRISM Response (questionnaire not yet completed):**
```json
{
  "FetchCandidateHistoryResult": {
    "ResponseMessage": "",
    "IsAuthorised": true,
    "ResponseStatus": 2,
    "ExternalIdent": "IG-USR-a1b2c3d4",
    "CandidateName": "Jane Smith",
    "Reference": "IG-REF-2026-042",
    "HistoryList": [
      {
        "EntityType": "Professional",
        "ExternalIdent": "IG-USR-a1b2c3d4",
        "CandidateName": "Jane Smith",
        "DateSent": "2026-03-22T10:30:00",
        "DateCompleted": "",
        "IsCompleted": false,
        "IsPaidFor": false,
        "SubActionURL1": "https://app.prismbrainmapping.com/questionnaire/abc123xyz",
        "SubActionURL2": "https://app.prismbrainmapping.com/auto-signin/abc123xyz"
      }
    ]
  }
}
```

**PRISM Response (questionnaire completed):**
```json
{
  "FetchCandidateHistoryResult": {
    "ResponseMessage": "",
    "IsAuthorised": true,
    "ResponseStatus": 2,
    "HistoryList": [
      {
        "EntityType": "Professional",
        "ExternalIdent": "IG-USR-a1b2c3d4",
        "CandidateName": "Jane Smith",
        "DateSent": "2026-03-22T10:30:00",
        "DateCompleted": "2026-03-22T11:15:00",
        "IsCompleted": true,
        "IsPaidFor": false,
        "SubActionURL1": "https://app.prismbrainmapping.com/pay/abc123xyz",
        "SubActionURL2": "https://app.prismbrainmapping.com/auto-signin/abc123xyz"
      }
    ]
  }
}
```

| Field | Before Completion | After Completion |
|-------|-------------------|------------------|
| `IsCompleted` | `false` | `true` |
| `DateCompleted` | `""` (empty) | ISO date string |
| `IsPaidFor` | `false` | `false` (not yet unlocked) |
| `SubActionURL1` | Questionnaire continue URL | Payment URL |

**When `IsCompleted` flips to `true`:**
1. The IG backend updates the assessment status to `completed`.
2. Records `questionnaireCompletedAt` timestamp.
3. Stops polling for this assessment.
4. Proceeds to Step 5 (or Step 6 if `IsGift` was `true`, meaning already paid).

**Frontend polling:**
The frontend also polls via the `usePrismStatus` hook using React Query's `refetchInterval` (every 30 seconds). When status changes to `completed`, the `PrismAssessmentCard` updates to show the **"Unlock Report"** button. Polling auto-stops when status reaches `report_ready`, `ingested`, or `error`.

---

## Step 5: Candidate Assessment Status Check (Optional)

Before unlocking, the IG backend can verify the entity exists and check detailed status:

**API Call:**
```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/CheckEntityExists
```

**Request Body:**
```json
{
  "SiteID": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "ClientID": "inspire-genius-client-id",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "ChildIdentifier": "",
  "EntityTypeID": 1,
  "DetailOne": "Jane",
  "DetailTwo": "Smith",
  "RetURL": ""
}
```

**PRISM Response:**
```json
{
  "CheckEntityExistsResult": {
    "ObjectExists": true,
    "ActionURL1": "https://app.prismbrainmapping.com/report/abc123xyz",
    "ResponseStatus": 2,
    "IsAuthorised": true
  }
}
```

This confirms the questionnaire exists and returns the report URL (available after unlock).

---

## Step 6: Unlock (Pay For) the Report

**Who:** The IG backend, triggered by the user clicking "Unlock Report" or automatically if `IsGift` was `true`.

**What happens:**

The user clicks **"Unlock Report"** on the `PrismAssessmentCard`. The frontend calls `POST /v1/prism/unlock/{assessmentId}`. The IG backend then calls PRISM:

**API Call:**
```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/UnlockReport
```

**Request Body:**
```json
{
  "SiteID": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "ClientID": "inspire-genius-client-id",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 1,
  "TransactionMethod": "IG-Platform",
  "OrderReference": "IG-ORD-2026-0322-001"
}
```

| Field | Value | Notes |
|-------|-------|-------|
| `EntityTypeID` | `1` | Must match the QTypeID used in CreateCandidate |
| `TransactionMethod` | `"IG-Platform"` | Identifies the payment channel |
| `OrderReference` | `"IG-ORD-..."` | IG's internal order/transaction reference |

**PRISM Response:**
```json
{
  "UnlockReportResult": {
    "ResponseMessage": "Report unlocked",
    "ActionURL1": "https://app.prismbrainmapping.com/report/view/abc123xyz",
    "ActionURL2": "",
    "IsAuthorised": true,
    "ResponseStatus": 2,
    "QuestStatus": 6,
    "QuestStatusDesc": "Questionnaire already paid for"
  }
}
```

| Response Field | Meaning |
|---------------|---------|
| `ResponseStatus: 2` | Success |
| `QuestStatus: 6` | Already paid — report is now available |
| `ActionURL1` | **Direct URL to view the PDF report on PRISM** |

**What the IG backend does:**
1. Updates the assessment status to `unlocked`.
2. Records `unlockedAt` timestamp.
3. Stores the report URL from `ActionURL1`.
4. Immediately proceeds to Step 7 to fetch and store the report data.

---

## Step 7: Fetch All Report Data from PRISM

**Who:** The IG backend (immediately after unlock).

The IG backend makes **four parallel API calls** to retrieve all report data:

### 7A. Fetch 4D Raw Output (Quadrant Scores)

```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/Fetch4DRawOutput
```

**Request:**
```json
{
  "SiteID": "...",
  "ClientID": "...",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 1
}
```

**Response:**
```json
{
  "Fetch4DRawOutputResult": {
    "ResponseStatus": 2,
    "IsAuthorised": true,
    "Output4D": [
      { "QuadID": 1, "Name": "Green", "Value": 72 },
      { "QuadID": 2, "Name": "Blue", "Value": 58 },
      { "QuadID": 3, "Name": "Red", "Value": 45 },
      { "QuadID": 4, "Name": "Gold", "Value": 85 }
    ]
  }
}
```

The four quadrants represent the person's fundamental behavioural preferences:
- **Green (QuadID 1):** People-oriented, empathetic, collaborative
- **Blue (QuadID 2):** Analytical, detail-oriented, systematic
- **Red (QuadID 3):** Action-oriented, decisive, competitive
- **Gold (QuadID 4):** Structured, reliable, process-driven

### 7B. Fetch Full Map (PRISM Wheel + 8D Scores)

```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/FetchFullMap
```

**Request:**
```json
{
  "SiteID": "...",
  "ClientID": "...",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 1,
  "ShowUnderlying": true,
  "ShowAdapted": false,
  "ShowConsistent": false,
  "ShowBenchmarkOnly": false,
  "ONetCode": "",
  "UserRandomCode": "",
  "Dimensions": 8,
  "LanguageID": 1
}
```

**Response:**
```json
{
  "FetchFullMapResult": {
    "ResponseStatus": 2,
    "ResponseMessage": "Map created",
    "CandName": "Jane Smith",
    "MapFileName": "prism_map_abc123xyz.png",
    "Output4D": null,
    "Output8D": [
      { "BehaviourID": 1, "Name": "Innovating", "Value": 45 },
      { "BehaviourID": 2, "Name": "Initiating", "Value": 88 },
      { "BehaviourID": 3, "Name": "Supporting", "Value": 62 },
      { "BehaviourID": 4, "Name": "Coordinating", "Value": 55 },
      { "BehaviourID": 5, "Name": "Focusing", "Value": 70 },
      { "BehaviourID": 6, "Name": "Delivering", "Value": 78 },
      { "BehaviourID": 7, "Name": "Finishing", "Value": 50 },
      { "BehaviourID": 8, "Name": "Evaluating", "Value": 88 }
    ]
  }
}
```

- `MapFileName` — the generated PRISM wheel image (PNG). The IG backend downloads this image for S3 storage.
- `Output8D` — the 8 behaviour dimension scores (0–100), the core of the PRISM profile.

### 7C. Fetch Report Data (Full Structured Report)

```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/FetchReportData
```

**Request:**
```json
{
  "SiteID": "...",
  "ClientID": "...",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 1,
  "ONetCode": ""
}
```

**Response:**
```json
{
  "FetchReportDataResult": {
    "ResponseStatus": 2,
    "ReportData": {
      "dtBehData": {
        "88": "Initiating | Enthusiastic, persuasive, builds positive relationships",
        "78": "Delivering | Goal-oriented, resourceful, works well under pressure",
        "62": "Supporting | Patient, empathetic, team-oriented"
      },
      "dtKeyData1": ["Creative", "Energetic", "Collaborative", "Strategic"],
      "dtKeyData2": ["Attention to detail", "Patience under ambiguity"],
      "dtTopBehData": {
        "88": "Initiating — Takes decisive action and drives momentum",
        "78": "Delivering — Ensures consistent, reliable output"
      },
      "dtWAData": [
        {
          "apt_id": 1,
          "apt_title": "Analytical Thinking",
          "apt_desc": "Ability to analyze complex information and draw conclusions",
          "apt_desc_short": "Breaks down complex problems",
          "score": 78,
          "occupation_score": 65
        }
      ],
      "dtWAPData": [
        {
          "group_id": 1,
          "group_name": "Work Activity Group 1",
          "item_name": "Research & Investigation",
          "description_high": "Enjoys deep research and data analysis",
          "description_low": "Prefers practical over theoretical work",
          "score": 72
        }
      ],
      "dtWEData": {
        "82": "Collaborative teamwork",
        "55": "Structured processes",
        "28": "High-pressure deadlines"
      },
      "fourDText": "This individual demonstrates a strong Gold preference, indicating a natural inclination towards structure, reliability, and systematic thinking...",
      "kwdsleast": ["Rigid", "Cautious", "Reserved"],
      "kwdsMost": ["Creative", "Energetic", "Collaborative", "Strategic", "Resilient"],
      "workAptitudeText": "The aptitude profile reveals...",
      "workEnvironmentText": "Optimal environments include..."
    }
  }
}
```

Key data fields:
- `dtBehData` — Behaviour scores (key = score, value = "Title | Description")
- `dtKeyData1` / `dtKeyData2` — Positive strengths and development areas (keyword lists)
- `dtTopBehData` — Top 3 demonstrated behaviours
- `dtWAData` — Work Aptitude scores with occupation comparison
- `dtWEData` — Work Environment items (key = score: ≥65 Enhanced, 35–64 Neutral, <35 Inhibited)
- `fourDText` — Narrative 4D analysis text
- `kwdsMost` / `kwdsleast` — Words the candidate selected as MOST and LEAST like them

### 7D. Fetch Extended Report Data (Big 5, EQ, Mental Toughness)

```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/FetchReportEIData
```

**Request:**
```json
{
  "SiteID": "...",
  "ClientID": "...",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 1
}
```

**Response:**
```json
{
  "FetchReportEIDataResult": {
    "ResponseStatus": 2,
    "ReportData": {
      "BigFiveItems": [
        { "item_id": 1, "item_title": "Openness", "item_score": 78 },
        { "item_id": 2, "item_title": "Conscientiousness", "item_score": 65 },
        { "item_id": 3, "item_title": "Extraversion", "item_score": 82 },
        { "item_id": 4, "item_title": "Agreeableness", "item_score": 58 },
        { "item_id": 5, "item_title": "Neuroticism", "item_score": 35 }
      ],
      "CDAItems": [
        { "group_id": 1, "item_title": "Career Planning", "score_desc_high": "Strategic career thinker", "score_desc_low": "Reactive career approach", "item_score": 72 }
      ],
      "EQItems": [
        { "item_id": 1, "item_title": "Self-Awareness", "item_score": 72 },
        { "item_id": 2, "item_title": "Self-Regulation", "item_score": 65 },
        { "item_id": 3, "item_title": "Motivation", "item_score": 88 },
        { "item_id": 4, "item_title": "Empathy", "item_score": 70 },
        { "item_id": 5, "item_title": "Social Skills", "item_score": 78 }
      ],
      "MTItems": [
        { "item_id": 1, "item_title": "Challenge", "item_desc": "Sees challenges as opportunities for growth", "item_score": 82 },
        { "item_id": 2, "item_title": "Commitment", "item_desc": "Deeply involved in goal pursuit", "item_score": 75 },
        { "item_id": 3, "item_title": "Control", "item_desc": "Believes in ability to influence outcomes", "item_score": 68 },
        { "item_id": 4, "item_title": "Confidence", "item_desc": "Self-belief and handles setbacks", "item_score": 70 }
      ]
    }
  }
}
```

**Note:** `BigFiveItems` and `EQItems` are **not available** for Career Explorer questionnaire types. Only Professional and Personal types include this data.

---

## Step 8: Store Report in S3

**Who:** The IG backend (immediately after all fetches complete).

**What happens:**

The IG backend stores all fetched report data in the user's dedicated S3 folder:

```
s3://ig-prism-reports/
  └── {userId}/
      └── {assessmentId}/
          ├── report.pdf          ← Downloaded from PRISM ActionURL1
          ├── report-data.json    ← FetchReportData response (structured data)
          ├── report-ei-data.json ← FetchReportEIData response (Big 5, EQ, MT)
          ├── map-full.png        ← Downloaded from FetchFullMap MapFileName
          ├── raw-4d.json         ← Fetch4DRawOutput response (quadrant scores)
          └── metadata.json       ← Assessment tracking metadata + timestamps
```

**`metadata.json` example:**
```json
{
  "assessmentId": "assess-abc123",
  "userId": "user-xyz789",
  "externalIdent": "IG-USR-a1b2c3d4",
  "questionnaireType": 1,
  "questionnaireTypeName": "Professional",
  "initiatedAt": "2026-03-22T10:00:00Z",
  "questionnaireSentAt": "2026-03-22T10:00:00Z",
  "questionnaireCompletedAt": "2026-03-22T11:15:00Z",
  "unlockedAt": "2026-03-22T11:20:00Z",
  "reportFetchedAt": "2026-03-22T11:20:05Z",
  "status": "report_ready"
}
```

**After storage:**
1. Updates the assessment status to `report_ready`.
2. Generates **presigned S3 URLs** (time-limited) for the PDF, map image, and JSON data.
3. Returns these URLs to the frontend when requested.

---

## Step 9: Report Ingestion into IG

**Who:** The IG backend (automated pipeline triggered when status reaches `report_ready`).

**What happens — four sub-steps:**

### 9A. Tokenize
- Extracts text content from report fields: `fourDText`, `workAptitudeText`, `workEnvironmentText`, keyword arrays (`kwdsMost`, `kwdsleast`, `dtKeyData1`, `dtKeyData2`).
- Tokenizes into searchable segments for Alex (IG's AI coaching agent).

### 9B. Score
- Normalizes all PRISM scores into IG's internal format:
  - 4D quadrant scores (Green, Blue, Red, Gold)
  - 8D behaviour dimension scores
  - Work Aptitude scores
  - Big 5 personality scores
  - Emotional Intelligence scores
  - Mental Toughness scores
- Calculates composite scores for dashboard display.
- Maps to IG's coaching dimensions for personalized guidance.

### 9C. Vectorize
- Generates vector embeddings from the report text + normalized scores.
- Stores vectors in IG's vector database for semantic search.
- Links vectors to the user's profile so Alex can query them during coaching sessions.

### 9D. Dashboard Integration
- Updates the user's dashboard `PRISMThermometer` component with real 4D scores (replacing placeholder data).
- Adds PRISM section to dashboard showing:
  - Current quadrant breakdown (colour bars)
  - Behaviour dimension highlights (top 3)
  - Work environment summary (Enhanced / Neutral / Inhibited)
  - Link to full report viewer

**After ingestion:**
- Updates assessment status to `ingested`.
- Records `ingestedAt` timestamp.

---

## Step 10: Notify All Stakeholders

**Who:** The IG backend notification service.

**What happens:**

When the report reaches `ingested` status, the system sends notifications to all relevant stakeholders:

| Recipient | Channel | Message |
|-----------|---------|---------|
| **User** | In-app toast + email | "Your PRISM report is ready! View your personalized coaching insights." |
| **Practitioner** | In-app + email | "Client Jane Smith's PRISM report is available for review." |
| **Manager** | In-app + email | "Team member Jane Smith has completed their PRISM assessment." |
| **Company Admin** | In-app | "New PRISM report available for Jane Smith in Acme Corp." |
| **Distributor** | Email (batched daily) | Summary of new reports across their practitioner network. |
| **Super Admin** | Audit log entry | Recorded for platform-wide tracking. |

---

## Step 11: User Views the Report

**Who:** The user (and authorized stakeholders).

**What happens:**
1. The user opens the **PRISM Assessment** page.
2. Their assessment card now shows status **"Active"** with a **"View Report"** button.
3. Clicking "View Report" opens the `PrismReportViewer` component.
4. The viewer has 5 tabs:

| Tab | Content |
|-----|---------|
| **Overview** | PRISM wheel image, 4D quadrant bars, narrative analysis text, strength/development keywords |
| **Behaviours** | 8D behaviour dimension chart (horizontal bars), top 3 behaviours highlighted |
| **Work Profile** | Work Aptitude scores (with occupation comparison), Work Environment items (Enhanced/Neutral/Inhibited) |
| **Personality** | Big 5 personality chart, Emotional Intelligence chart, Mental Toughness chart |
| **Report PDF** | Embedded PDF viewer (presigned S3 URL) |

---

## Optional: Upgrade Report Tier

A Foundation or Personal report can be upgraded to a higher tier:

**API Call:**
```
POST https://api.prismbrainmapping.com/service_library/v2/api.svc/UpgradeReport
```

**Request:**
```json
{
  "SiteID": "...",
  "ClientID": "...",
  "ExternalIdent": "IG-USR-a1b2c3d4",
  "EntityTypeID": 4,
  "UpgradeEntityTypeID": 1
}
```

This upgrades from Foundation (4) to Professional (1). The response contains a new `ActionURL1` for the upgraded report. The IG backend then re-fetches all report data (Steps 7–9) with the new type.

---

## Complete PRISM API Call Sequence Diagram

```
User                    IG Frontend              IG Backend                PRISM API                    S3
 |                          |                        |                        |                          |
 |-- Fill form ----------->|                        |                        |                          |
 |                          |-- POST /v1/prism/     |                        |                          |
 |                          |   initiate ---------->|                        |                          |
 |                          |                        |-- POST CreateCandidate>|                          |
 |                          |                        |<-- ActionURL1 ---------|                          |
 |                          |                        |   (questionnaire URL)  |                          |
 |                          |<-- questionnaireUrl ---|                        |                          |
 |<-- Show "Open" button --|                        |                        |                          |
 |                          |                        |                        |                          |
 |== User completes questionnaire on PRISM site ==========================================              |
 |                          |                        |                        |                          |
 |                          |                        |-- POST FetchCandidate  |                          |
 |                          |                        |   History (polling) -->|                          |
 |                          |                        |<-- IsCompleted: true --|                          |
 |                          |                        |                        |                          |
 |-- Click "Unlock" ------>|                        |                        |                          |
 |                          |-- POST /v1/prism/     |                        |                          |
 |                          |   unlock ------------>|                        |                          |
 |                          |                        |-- POST UnlockReport -->|                          |
 |                          |                        |<-- QuestStatus: 6 -----|                          |
 |                          |                        |   (report URL)         |                          |
 |                          |                        |                        |                          |
 |                          |                        |-- POST Fetch4DRaw ---->|                          |
 |                          |                        |-- POST FetchFullMap -->|                          |
 |                          |                        |-- POST FetchReportData>|                          |
 |                          |                        |-- POST FetchReportEI ->|                          |
 |                          |                        |<-- All data returned --|                          |
 |                          |                        |                        |                          |
 |                          |                        |-- PUT report.pdf ------|------------------------->|
 |                          |                        |-- PUT report-data.json |------------------------->|
 |                          |                        |-- PUT report-ei.json --|------------------------->|
 |                          |                        |-- PUT map-full.png ----|------------------------->|
 |                          |                        |-- PUT raw-4d.json -----|------------------------->|
 |                          |                        |-- PUT metadata.json ---|------------------------->|
 |                          |                        |                        |                          |
 |                          |                        |== Ingest: tokenize, score, vectorize ==          |
 |                          |                        |                        |                          |
 |                          |                        |-- Notify user, practitioner, manager...           |
 |                          |<-- status: ingested ---|                        |                          |
 |<-- "View Report" btn ---|                        |                        |                          |
 |-- Click "View" -------->|                        |                        |                          |
 |                          |-- GET /v1/prism/      |                        |                          |
 |                          |   report/{id} ------->|                        |                          |
 |                          |                        |-- GET presigned URLs --|------------------------->|
 |                          |<-- report data + URLs -|                        |                          |
 |<-- Render report -------|                        |                        |                          |
```

---
---

# Part 2: Job Blueprint — End-to-End Process

This section documents the complete lifecycle of creating a Job Blueprint (Job DNA), screening candidates against it, conducting interviews with scorecards, and onboarding hires.

---

## Step 1: Create a Job DNA Profile (6-Step Wizard)

**Who:** A Practitioner or HR professional.

**What happens:**

The practitioner opens the **Job DNA Creation** page and works through a 6-step wizard to build the behavioural profile for a specific role.

### Step 1.1: Role Information
- Enter **Role Title** (e.g., "Senior Software Engineer")
- Select **Department** (e.g., "Engineering")
- Select **Tier** — determines pricing:
  - Front Line (salary < $75k)
  - Professional (salary $75k–$150k)
  - Executive (salary > $150k)

### Step 1.2: Rank & Rate 8 Behaviour Preferences
The practitioner considers the top performers in this role and:

1. **RANKS** all 8 behaviours from most important (1st) to least important (8th):
   - Innovating, Initiating, Supporting, Coordinating, Focusing, Delivering, Finishing, Evaluating

2. **RATES** each behaviour on importance (1–8 scale)

3. The system calculates the **benchmark score** for each behaviour:
   ```
   rankPercent = [96%, 84%, 72%, 60%, 48%, 36%, 24%, 12%] (by position)
   ratePercent = (rateValue / 8) × 100
   finalBenchmark = (rankPercent + ratePercent) / 2
   ```

**Example:**
| Behaviour | Rank | Rank% | Rate | Rate% | Final Benchmark |
|-----------|------|-------|------|-------|-----------------|
| Delivering | 1st | 96% | 8 | 100% | **98%** (Very High) |
| Initiating | 2nd | 84% | 7 | 88% | **86%** (Very High) |
| Innovating | 3rd | 72% | 6 | 75% | **74%** (Natural) |
| Coordinating | 4th | 60% | 5 | 63% | **61%** (Moderate) |
| Supporting | 5th | 48% | 4 | 50% | **49%** (Moderate) |
| Evaluating | 6th | 36% | 3 | 38% | **37%** (Low) |
| Finishing | 7th | 24% | 2 | 25% | **25%** (Low) |
| Focusing | 8th | 12% | 1 | 13% | **12%** (Avoidance) |

The top 3 behaviours become the **Job DNA behavioural signature**. The bottom-ranked behaviour(s) become **counter-productive** — a strong natural preference for these would undermine performance in this role.

**Interpretation Bands:**
| Score Range | Classification | Meaning |
|-------------|---------------|---------|
| 85–100% | Very High | Critical requirement — must be a dominant preference |
| 65–84% | Natural | Important — should be a comfortable regular preference |
| 45–64% | Moderate | Relevant but not dominant |
| 25–44% | Low | Minor relevance to the role |
| 0–24% | Avoidance | Counter-productive if the candidate has a strong preference here |

### Step 1.3: Rank & Rate 8 Work Aptitude Preferences
Same process for aptitudes, with a slightly different scoring table:
```
rankPercent = [100%, 88%, 75%, 62%, 50%, 37%, 25%, 13%]
ratePercent = (rateValue / 8) × 100
```

The 8 aptitudes: Practical & Mechanical, Investigative & Analytical, Creative & Artistic, Social & Empathetic, Competitive & Entrepreneurial, Orderly & Efficient, Mathematical & Logical, Outgoing & Expressive.

### Step 1.4: Rank & Rate 6 Core Traits
Same process for traits, with 6 items:
```
rankPercent = [100%, 83%, 67%, 50%, 33%, 17%]
ratePercent = (rateValue / 6) × 100
```

The 6 traits: Relationship Management, Emotional Stability, Decisiveness, Self-Motivation, Conscientiousness, Flexibility.

### Step 1.5: Role Context & Environment
The practitioner describes the work environment:
- **Work pressures** — deadlines, pace, volume
- **Required work styles** — independent, collaborative, structured, flexible
- **Environmental factors** — office, remote, hybrid, travel
- **Cultural factors** — formal, casual, innovative, traditional

### Step 1.6: Review & Submit
- The system displays a **radar chart** showing all 22 dimension benchmarks.
- The practitioner reviews the complete Job DNA profile.
- Clicks **Submit** to finalize the benchmark.
- The Job DNA is saved with status `benchmarked` and is now ready for candidate screening.

**Total dimensions benchmarked:** 22 (8 behaviours + 8 aptitudes + 6 core traits).

---

## Step 2: Candidates Complete Brain Mapping Light (BML) Assessment

**Who:** Job candidates.

**What happens:**

1. The practitioner adds candidates to the hiring pipeline for a specific Job DNA.
2. Each candidate receives an email invitation with a link to the **Brain Mapping Light** survey.
3. The candidate opens the link and completes a **48-question Likert-scale survey** (10–15 minutes):

| Section | Questions | Dimensions Covered |
|---------|-----------|-------------------|
| Behaviour | 24 questions (3 per behaviour) | 8 behaviours |
| Aptitude | 16 questions (2 per aptitude) | 8 aptitudes |
| Core Traits | 8 questions (2 per trait) | 4 core traits (reduced set) |

4. Each question uses a **1–7 Likert scale** (Strongly Disagree → Strongly Agree).
5. On submission, the system normalizes responses:
   ```
   dimensionScore = average(responses for that dimension) / 7 × 100
   ```
   This produces a **0–100% score** for each of the 22 PRISM dimensions.
6. A **confidence score** is calculated from the standard deviation of responses within each dimension (low SD = high confidence, consistent answers).

---

## Step 3: Best-Fit Scoring & Candidate Ranking

**Who:** The system (automated).

**What happens immediately after BML submission:**

### 3A. Calculate Variation Per Dimension
For each of the 22 dimensions:
```
variation = |candidateScore - benchmarkScore|
```

### 3B. Sum Variations by Category
```
behaviorVariation  = sum of all 8 behavior variations
aptitudeVariation  = sum of all 8 aptitude variations
coreTraitVariation = sum of all 6 core trait variations
totalVariation     = behaviorVariation + aptitudeVariation + coreTraitVariation
```

### 3C. Calculate Statistical Metrics
- **Standard Deviation** — measures consistency of fit across dimensions. Low SD = uniformly close to benchmark. High SD = some dimensions match well, others don't.
- **Skew** — indicates direction of deviation. Positive skew = candidate generally exceeds benchmarks. Negative skew = candidate generally falls below benchmarks.

### 3D. Classify Candidate Tier

| Total Variation | Tier | Label | Colour |
|-----------------|------|-------|--------|
| 0–100 | **Strong Fit** | Excellent match to Job DNA | Green |
| 101–200 | **Potential Fit** | Good match, development needed in some areas | Amber |
| 201–300 | **Moderate Fit** | Significant gaps, consider carefully | Orange |
| 300+ | **Misalignment** | Poor match to this role's requirements | Red |

### 3E. Rank All Candidates
All candidates for a job are sorted by **Total Variation ascending** (lowest variation = best fit). This produces a ranked shortlist.

**Example Candidate Ranking:**

| Rank | Candidate | Behavior Var. | Aptitude Var. | Trait Var. | Total | SD | Tier |
|------|-----------|---------------|---------------|------------|-------|----|------|
| 1 | Candidate A | 28 | 22 | 15 | **65** | 4.2 | Strong Fit |
| 2 | Candidate B | 45 | 35 | 30 | **110** | 6.8 | Potential Fit |
| 3 | Candidate C | 62 | 58 | 42 | **162** | 8.1 | Potential Fit |
| 4 | Candidate D | 95 | 88 | 72 | **255** | 12.3 | Moderate Fit |

Optional: **blind screening** — candidates are identified by code only (e.g., "CND-001") to eliminate unconscious bias during initial ranking.

---

## Step 4: Generate Customised Interview Guide

**Who:** James AI (Interview Coach agent), triggered automatically for shortlisted candidates.

**What happens:**

For each candidate advancing to interview, James generates a personalised interview guide containing:

1. **Alignment Areas** — dimensions where the candidate closely matches the Job DNA benchmark. These confirm strengths.
2. **Divergence Areas** — dimensions where the candidate significantly differs from the benchmark. These require probing.
3. **Behavioural Interview Questions** — using the SAR framework (Situation, Action, Result):
   - Questions for the **Top 3 Job DNA behaviours** — to verify the candidate demonstrates them
   - Questions for **Counter-Productive behaviours** — to check the candidate does NOT have a strong preference
   - Questions for **Top 3 Aptitudes** and **Top 3 Core Traits**
4. **Probe Questions** — follow-up questions for areas of concern (high variation dimensions).
5. **Risk Factors** — specific areas where the candidate may struggle in this role.
6. **Opportunity Factors** — areas where the candidate exceeds the benchmark and could add unexpected value.

The interview guide is available as a structured view in the app and can be exported as a PDF.

---

## Step 5: Conduct Interview & Complete Scorecard

**Who:** The interviewer (hiring manager, recruiter, or panel member).

**What happens:**

1. The interviewer opens the **Scorecard** page for the candidate.
2. They score the candidate on **11 dimensions** using a **0 / 3 / 5** scale:

| Section | What's Scored | # Dimensions | Max Points |
|---------|---------------|--------------|------------|
| Top 3 Behaviours | The 3 highest-ranked behaviours from the Job DNA | 3 | 15 |
| Counter-Productive Behaviours | The 2 lowest-ranked behaviours (scoring inverted) | 2 | 10 |
| Top 3 Work Aptitudes | The 3 highest-ranked aptitudes from the Job DNA | 3 | 15 |
| Top 3 Core Traits | The 3 highest-ranked traits from the Job DNA | 3 | 15 |
| **Total** | | **11** | **55** |

**Rating Definitions:**
- **5** — Demonstrated to a large extent with specific examples and evidence
- **3** — Demonstrated to a moderate extent, required more probing to confirm
- **0** — Unable to demonstrate satisfactorily

**For counter-productive behaviours (inverted):**
- **5** — Little evidence of this behaviour (good — it's counter-productive)
- **3** — Some evidence, manageable
- **0** — Strong evidence of this behaviour (bad — it's counter-productive for this role)

3. For each dimension, the interviewer adds **evidence notes** explaining their score.
4. The system auto-calculates the **Grand Total** and generates a **recommendation**:

| Grand Total | Recommendation |
|-------------|---------------|
| 45–55 | **Strong Hire** — proceed with offer |
| 35–44 | **Hire with Development Plan** — proceed with targeted onboarding |
| 25–34 | **Conditional** — consider carefully, significant development needed |
| 0–24 | **Do Not Hire** — candidate does not meet role requirements |

---

## Step 6: Generate Insight Package

**Who:** Nova AI (Career Strategist) + James AI (Interview Coach).

**What happens:**

After the interview scorecard is completed, the system generates a comprehensive **Insight Package** for the hiring manager:

1. **Fit Score Summary** — total variation, classification tier, confidence
2. **Gap Analysis Table** — per-dimension comparison of candidate score vs benchmark, with gap size and specific recommendations
3. **Interview Focus Areas** — summary of key findings from the scorecard
4. **Probe Questions** — additional questions if a follow-up interview is needed
5. **Risk Factors** — areas where the candidate may underperform
6. **Opportunity Factors** — areas where the candidate could exceed expectations
7. **Candidate Comparison Matrix** — if multiple candidates, side-by-side analysis

---

## Step 7: Hire Decision & Onboarding

**Who:** Hiring manager.

**What happens:**

1. The hiring manager reviews the Insight Package and candidate rankings.
2. Makes a hire/no-hire decision based on:
   - Best-Fit ranking position
   - Interview scorecard grand total and recommendation
   - Insight Package risk/opportunity analysis
3. For the selected candidate, the system generates an **Onboarding Plan** including:
   - **Strengths to leverage immediately** (high-scoring dimensions)
   - **Development areas** (high-variation dimensions)
   - **Personal Development Plan** aligned to the Job DNA
   - **AI Agent access** — Alex coaching with PRISM-informed guidance
   - **Recommended coaching focus** for the first 90 days

---

## Complete Job Blueprint Flow Diagram

```
Practitioner                 System                    Candidates                 Hiring Manager
     |                          |                          |                          |
     |-- Create Job DNA ------->|                          |                          |
     |   (6-step wizard)        |                          |                          |
     |   1. Role Info           |                          |                          |
     |   2. Rank/Rate Behaviors |                          |                          |
     |   3. Rank/Rate Aptitudes |                          |                          |
     |   4. Rank/Rate Traits    |                          |                          |
     |   5. Role Context        |                          |                          |
     |   6. Review & Submit     |                          |                          |
     |                          |                          |                          |
     |                          |-- Calculate 22-dim       |                          |
     |                          |   PRISM benchmark        |                          |
     |                          |                          |                          |
     |-- Add candidates ------->|                          |                          |
     |                          |-- Send BML invitation -->|                          |
     |                          |                          |                          |
     |                          |                          |-- Complete 48-question    |
     |                          |                          |   Likert survey (15 min)  |
     |                          |                          |                          |
     |                          |<-- BML responses --------|                          |
     |                          |                          |                          |
     |                          |-- Normalize scores       |                          |
     |                          |   (Likert 1-7 → 0-100%) |                          |
     |                          |                          |                          |
     |                          |-- Calculate variation    |                          |
     |                          |   per dimension          |                          |
     |                          |                          |                          |
     |                          |-- Classify tier          |                          |
     |                          |   (Strong/Potential/     |                          |
     |                          |    Misalignment)         |                          |
     |                          |                          |                          |
     |                          |-- Rank all candidates    |                          |
     |                          |   by total variation     |                          |
     |                          |                          |                          |
     |<-- Ranked shortlist -----|                          |                          |
     |                          |                          |                          |
     |                          |-- James generates        |                          |
     |                          |   interview guide -------|------------------------->|
     |                          |                          |                          |
     |                          |                          |              Interview -->|
     |                          |                          |                          |
     |                          |                          |          Scorecard       |
     |                          |                          |          (0/3/5 × 11) -->|
     |                          |                          |                          |
     |                          |<-- Scorecard submitted --|--------------------------|
     |                          |                          |                          |
     |                          |-- Nova + James generate  |                          |
     |                          |   Insight Package -------|------------------------->|
     |                          |                          |                          |
     |                          |                          |         Hire decision -->|
     |                          |                          |                          |
     |                          |-- Generate onboarding    |                          |
     |                          |   plan + AI access ------|------------------------->|
     |                          |                          |                          |
```

---

## Appendix: PRISM API Quick Reference

| API Method | When Called | Key Request Fields | Key Response Fields |
|------------|-----------|-------------------|---------------------|
| `CreateCandidate` | Step 2 | SiteID, ClientID, ExternalIdent, Email, Gender, QTypeID, CreateUser | ActionURL1 (questionnaire URL), ResponseStatus, QuestStatus |
| `FetchCandidateHistory` | Step 4 (polling) | SiteID, ClientID, ExternalIdent | IsCompleted, IsPaidFor, DateCompleted, SubActionURL1 |
| `CheckEntityExists` | Step 5 (optional) | SiteID, ClientID, ExternalIdent, EntityTypeID | ObjectExists, ActionURL1 |
| `UnlockReport` | Step 6 | SiteID, ClientID, ExternalIdent, EntityTypeID, TransactionMethod, OrderReference | ActionURL1 (report URL), QuestStatus: 6 |
| `Fetch4DRawOutput` | Step 7A | SiteID, ClientID, ExternalIdent, EntityTypeID | Output4D[] (QuadID, Name, Value) |
| `FetchFullMap` | Step 7B | + ShowUnderlying, Dimensions, LanguageID | MapFileName, Output8D[] (BehaviourID, Name, Value) |
| `FetchReportData` | Step 7C | SiteID, ClientID, ExternalIdent, EntityTypeID | ReportData (dtBehData, dtWAData, dtWEData, fourDText, keywords) |
| `FetchReportEIData` | Step 7D | SiteID, ClientID, ExternalIdent, EntityTypeID | BigFiveItems[], EQItems[], MTItems[], CDAItems[] |
| `UpgradeReport` | Optional | + EntityTypeID, UpgradeEntityTypeID | ActionURL1 (upgraded report URL) |
