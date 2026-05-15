# Job Blueprint Microservice — Implementation Prompt

> **Goal:** Build a standalone, testable Job Blueprint microservice (React + TypeScript frontend) that can later plug into the Inspire Genius platform. Covers the full Job DNA lifecycle: creating role profiles with PRISM benchmarks, screening candidates via Brain Mapping Light, running the 6-step hiring triage pipeline, generating interview guides and scorecards, and delivering onboarding plans.
>
> **Exclusions:** VoiceDeskAI integration and DAMS (Document Archive Management System) are out of scope for this build. Use local/S3 storage instead.

---

## 1. Domain Overview

### What Is a Job Blueprint?

A Job Blueprint (also called "Job DNA") captures the behavioral DNA of top performers in a specific role. It uses PRISM Brain Mapping to identify the 22 dimensions (8 Behaviors, 8 Work Aptitudes, 6 Core Traits) that predict success, then scores candidates against that benchmark to rank them by fit.

### The Three-Pillar Methodology

**Pillar 1 — Behavioral Requirements (PRISM Assessment)**
- Behavior Preferences — winning combination of natural behaviors for peak performance
- Work Aptitude Preferences — natural talents for learning and performing key tasks
- Core Traits — essential characteristics universally linked to excellence
- Created by analyzing PRISM results from 10 high performers + stakeholder input

**Pillar 2 — Role Context & Environment (Workplace Context Survey)**
- Anonymous online survey completed by broader stakeholder group
- Captures: work pressures, required work styles, environmental factors, culture
- Outputs: success factor analysis, work-culture mapping

**Pillar 3 — Job Role Deliverables**
- Integrates existing role documentation: job descriptions, KPIs, performance metrics
- Maps critical job activities, key people interactions, competency frameworks

### The 22 PRISM Dimensions

#### 8 Behavior Preferences
| ID | Behavior | Description |
|----|----------|-------------|
| 1 | **Innovating** | Generate ideas, original thinking, creative and curious |
| 2 | **Initiating** | Enthusiastic, persuasive, effective communication, build relationships |
| 3 | **Supporting** | Patient, deliberate, empathetic, team-oriented |
| 4 | **Coordinating** | Collaborative, broad-minded, uses others' skills, consultative |
| 5 | **Focusing** | Assertive, challenging, driven, high-pressure negotiation |
| 6 | **Delivering** | Goal-oriented, resourceful, works under pressure, structured |
| 7 | **Finishing** | Attention to detail, accuracy, follows through to completion |
| 8 | **Evaluating** | Questions data validity, checks pros/cons, fact-based decisions |

#### 8 Work Aptitude Preferences
| ID | Aptitude | Description |
|----|----------|-------------|
| 1 | **Practical & Mechanical** | Hands-on, enjoy working with tools and machinery |
| 2 | **Investigative & Analytical** | Research-oriented, enjoy solving complex problems |
| 3 | **Creative & Artistic** | Blend art with science, sensitive and expressive |
| 4 | **Social & Empathetic** | Good interpersonal skills, concerned with human welfare |
| 5 | **Competitive & Entrepreneurial** | Ambitious, risk-taking, project-driven |
| 6 | **Orderly & Efficient** | Methodical, structured, follows defined procedures |
| 7 | **Mathematical & Logical** | Numerical reasoning, systematic problem-solving |
| 8 | **Outgoing & Expressive** | Rapport building, self-confident, persuasive |

#### 6 Core Traits
| ID | Trait | Description |
|----|-------|-------------|
| 1 | **Relationship Management** | Effective interpersonal interaction, managing difficult situations |
| 2 | **Emotional Stability** | Calm under pressure, resistant to stress, high self-awareness |
| 3 | **Decisiveness** | Sound judgment under pressure, commitment to decisions |
| 4 | **Self-Motivation** | Self-confident, energetic, self-starter |
| 5 | **Conscientiousness** | Reliable, thorough, dedicated to quality |
| 6 | **Flexibility** | Adaptable, open to change, resilient |

---

## 2. Scoring Algorithms

### 2A. PRISM Benchmark — Rank-then-Rate

Stakeholders first **RANK** all dimensions in order of importance for the role, then **RATE** each on importance. The final benchmark = average of Rank% and Rate%.

**Behavior Scoring Table (8 items):**
| Rank Position | Rank % | Rate Scale |
|---------------|--------|------------|
| 1st | 96% | 8 |
| 2nd | 84% | 7 |
| 3rd | 72% | 6 |
| 4th | 60% | 5 |
| 5th | 48% | 4 |
| 6th | 36% | 3 |
| 7th | 24% | 2 |
| 8th | 12% | 1 |

**Aptitude Scoring Table (8 items):**
| Rank Position | Rank % | Rate Scale |
|---------------|--------|------------|
| 1st | 100% | 8 |
| 2nd | 88% | 7 |
| 3rd | 75% | 6 |
| 4th | 62% | 5 |
| 5th | 50% | 4 |
| 6th | 37% | 3 |
| 7th | 25% | 2 |
| 8th | 13% | 1 |

**Core Traits Scoring Table (6 items):**
| Rank Position | Rank % | Rate Scale |
|---------------|--------|------------|
| 1st | 100% | 6 |
| 2nd | 83% | 5 |
| 3rd | 67% | 4 |
| 4th | 50% | 3 |
| 5th | 33% | 2 |
| 6th | 17% | 1 |

**Calculation:** `finalBenchmark% = (rankPercent + (rateValue / maxRate * 100)) / 2`

**Interpretation Bands:**
| Score | Classification |
|-------|---------------|
| 85–100% | Very High — critical requirement, must be dominant preference |
| 65–84% | Natural — important, should be comfortable regular preference |
| 45–64% | Moderate — relevant but not dominant |
| 25–44% | Low — minor relevance |
| 0–24% | Avoidance — counter-productive if strongly present |

### 2B. Best-Fit Variation Scoring

Ranks candidates against the Job DNA benchmark:

1. **Score Each Dimension:** Candidate gets 0–100% for all 22 dimensions from PRISM
2. **Calculate Variation:** `|candidateScore - benchmarkScore|` per dimension, then sum per category
3. **Statistical Metrics:** Standard Deviation (consistency), Skew (positive = exceeds, negative = falls below)
4. **Total Variation:** `behaviorVariation + aptitudeVariation + coreTraitVariation`
5. **Rank:** Sort ascending by Total Variation (lowest = best fit)

**Variation Interpretation:**
| Total Variation | Tier | Label |
|-----------------|------|-------|
| 0–100 | Strong Fit | Excellent match |
| 101–200 | Potential Fit | Good with development |
| 201–300 | Moderate Fit | Significant gaps |
| 300+ | Misalignment | Poor match |

### 2C. Interview Scorecard

**Rating Scale (0 / 3 / 5 per dimension):**
- **5** = Demonstrated to a large extent with specific examples
- **3** = Demonstrated to a moderate extent, required more probing
- **0** = Unable to demonstrate satisfactorily
- Counter-productive behaviors: scoring inverted (5 = little preference shown)

**Scorecard Structure:**
| Section | Dimensions Scored | Max Points |
|---------|-------------------|------------|
| Top 3 Behaviors | 3 × 5 | 15 |
| Counter-Productive Behaviors | 2 × 5 | 10 |
| Top 3 Work Aptitudes | 3 × 5 | 15 |
| Top 3 Core Traits | 3 × 5 | 15 |
| **Grand Total** | **11 dimensions** | **55** |

**Grand Total Interpretation:**
| Score | Recommendation |
|-------|---------------|
| 45–55 | Strong Hire |
| 35–44 | Hire with Development Plan |
| 25–34 | Conditional |
| 0–24 | Do Not Hire |

### 2D. Brain Mapping Light (BML)

**48 Likert-scale questions (1–7), 10–15 minutes:**
- 24 Behavior questions (3 per behavior × 8 behaviors)
- 16 Aptitude questions (2 per aptitude × 8 aptitudes)
- 8 Core Trait questions (2 per trait × 4 traits, reduced set)

**Scoring:** Likert (1–7) normalized to 0–100%. Multiple questions per dimension averaged. Same variation calculation as full Best-Fit. Confidence indicator = low SD across questions = high confidence.

---

## 3. Six-Step Hiring Framework

| Phase | Step | Action | Owner |
|-------|------|--------|-------|
| **1. Role Design** | Step 1 | Create the Job DNA (3-pillar analysis → benchmark) | Practitioner |
| **2. Assessment** | Step 2 | Candidates complete PRISM survey (or BML) | Candidates |
| | Step 3 | Best-Fit Report & Ranked Shortlist generated | System |
| **3. Interview** | Step 4 | Customized Interview Guide per candidate | James AI |
| | Step 5 | Interview Summary Scorecard completed | Interviewer |
| **4. Onboarding** | Step 6 | Personal Development Plan + AI agent access | System + Nova |

### Nova-James Triage Pipeline (6 sub-steps within Steps 2–3)

| Step | Action | Agent | Event |
|------|--------|-------|-------|
| 1 | Candidate Intake — validate submission | Nova | `ig.triage.intake-received` |
| 2 | BML Invitation — send 10–15 min assessment | Nova | `ig.triage.candidate-invited` |
| 3 | Assessment Completion — results mapped to PRISM | System | `ig.triage.assessment-completed` |
| 4 | Behavioral Fit Scoring — score against Job DNA | James | `ig.triage.fit-scored` |
| 5 | Candidate Classification — assign tier | James | `ig.triage.candidate-classified` |
| 6 | Insight Package — fit score, gaps, interview Qs | James+Nova | `ig.nova.insight-generated` |

---

## 4. API Endpoints

All endpoints under `/v1/blueprint/`. The standalone microservice provides its own Express/Fastify mock server for development.

### Job DNA Service
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/blueprint/job-dna` | Create new Job DNA profile (draft) |
| GET | `/v1/blueprint/job-dna/{id}` | Retrieve Job DNA by ID |
| PUT | `/v1/blueprint/job-dna/{id}` | Update Job DNA (add pillar data) |
| GET | `/v1/blueprint/job-dna` | List all Job DNAs for org |
| PUT | `/v1/blueprint/job-dna/{id}/benchmark` | Finalize PRISM benchmark |
| GET | `/v1/blueprint/job-dna/{id}/benchmark` | Get benchmark scores |
| POST | `/v1/blueprint/job-dna/{id}/questions` | Generate survey questions |

### Triage / Pipeline Service
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/blueprint/triage/intake` | Submit candidate to pipeline |
| GET | `/v1/blueprint/triage/pipeline/{jobId}` | Get all candidates for a job |
| GET | `/v1/blueprint/triage/candidate/{candidateId}` | Get candidate detail + scores |
| POST | `/v1/blueprint/triage/advance/{candidateId}` | Advance candidate to next step |
| GET | `/v1/blueprint/triage/stats` | Pipeline statistics |
| GET | `/v1/blueprint/triage/candidate/{id}/insights` | Nova-generated insight package |
| GET | `/v1/blueprint/triage/pipeline/{jobId}?compare=true` | Multi-candidate comparison |

### Assessment Service
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/blueprint/assessment` | Create assessment invitation |
| GET | `/v1/blueprint/assessment/{id}` | Get assessment detail |
| POST | `/v1/blueprint/assessment/{id}/submit` | Submit BML responses |
| GET | `/v1/blueprint/assessment/{id}/results` | Get normalized scores |
| GET | `/v1/blueprint/assessment/stats` | Assessment statistics |

### Interview & Scorecard
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/blueprint/interview-guide/{jobId}` | Generate interview guide for candidate |
| GET | `/v1/blueprint/interview-guide/{jobId}` | Retrieve interview guide |
| POST | `/v1/blueprint/scorecard/{candidateId}` | Submit scorecard |
| GET | `/v1/blueprint/scorecard/{candidateId}` | Get scorecard with calculated total |

### Onboarding
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/blueprint/onboarding/{candidateId}` | Get onboarding plan |
| POST | `/v1/blueprint/onboarding/{candidateId}/package` | Assign AI package |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/blueprint/analytics/funnel` | Hiring funnel data |
| GET | `/v1/blueprint/analytics/accuracy` | Prediction vs outcome |
| GET | `/v1/blueprint/analytics/time-to-fill` | Time-to-fill metrics |
| GET | `/v1/blueprint/analytics/hires?period=month` | Hires by period |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/v1/blueprint/user/profile` | User profile |
| GET/PUT | `/v1/blueprint/org/settings` | Organization settings |
| GET | `/v1/blueprint/activity?limit=5` | Recent activity feed |

---

## 5. Data Models

### JobDNA
```typescript
type JobDNA = {
  id: string
  orgId: string
  roleTitle: string
  department: string
  tier: 'front-line' | 'professional' | 'executive'
  status: 'draft' | 'benchmarked' | 'active' | 'archived'

  // Pillar 1: Behavioral Requirements
  behaviors: DimensionBenchmark[]      // 8 items
  aptitudes: DimensionBenchmark[]      // 8 items
  coreTraits: DimensionBenchmark[]     // 6 items
  counterProductiveBehaviors: string[] // IDs of bottom-ranked behaviors

  // Pillar 2: Role Context
  roleContext: {
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
    surveyResponses?: ContextSurveyResponse[]
  }

  // Pillar 3: Job Role Deliverables
  deliverables: {
    jobDescription: string
    kpis: string[]
    criticalActivities: string[]
    keyInteractions: string[]
    competencyFramework?: string
  }

  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
}

type DimensionBenchmark = {
  dimensionId: number
  dimensionName: string
  category: 'behavior' | 'aptitude' | 'core-trait'
  rankPosition: number       // 1-8 for behaviors/aptitudes, 1-6 for traits
  rankPercent: number         // from scoring table
  rateValue: number           // 1-8 for behaviors/aptitudes, 1-6 for traits
  finalBenchmarkPercent: number // avg(rankPercent, ratePercent)
  interpretation: 'very-high' | 'natural' | 'moderate' | 'low' | 'avoidance'
}
```

### Candidate & Pipeline
```typescript
type Candidate = {
  id: string
  jobId: string
  name: string
  email: string
  code?: string             // Optional anonymized code for blind screening
  status: PipelineStep
  assessmentId: string | null
  prismScores: DimensionScore[] | null
  variationScores: VariationResult | null
  classificationTier: ClassificationTier | null
  scorecardId: string | null
  insightPackage: InsightPackage | null
  createdAt: string
  updatedAt: string
}

type PipelineStep =
  | 'intake'
  | 'assessment-invited'
  | 'assessment-completed'
  | 'fit-scored'
  | 'classified'
  | 'insights-delivered'
  | 'interview-scheduled'
  | 'interview-completed'
  | 'hired'
  | 'rejected'

type DimensionScore = {
  dimensionId: number
  dimensionName: string
  category: 'behavior' | 'aptitude' | 'core-trait'
  score: number             // 0-100
}

type VariationResult = {
  behaviorVariation: number
  aptitudeVariation: number
  coreTraitVariation: number
  totalVariation: number
  standardDeviation: number
  skew: number               // positive = exceeds benchmarks
  perDimension: { dimensionId: number; variation: number }[]
}

type ClassificationTier = 'strong-fit' | 'potential-fit' | 'misalignment'
```

### Assessment (Brain Mapping Light)
```typescript
type BMLAssessment = {
  id: string
  candidateId: string
  jobId: string
  status: 'invited' | 'in-progress' | 'completed' | 'expired'
  questions: BMLQuestion[]
  responses: BMLResponse[] | null
  normalizedScores: DimensionScore[] | null
  confidenceScore: number | null  // based on response consistency
  startedAt: string | null
  completedAt: string | null
  expiresAt: string
}

type BMLQuestion = {
  id: string
  dimensionId: number
  dimensionName: string
  category: 'behavior' | 'aptitude' | 'core-trait'
  text: string
  order: number
}

type BMLResponse = {
  questionId: string
  value: number  // 1-7 Likert
}
```

### Interview Scorecard
```typescript
type InterviewScorecard = {
  id: string
  candidateId: string
  jobId: string
  interviewerId: string
  interviewDate: string

  // Scored dimensions (from Job DNA top 3 + counter-productive)
  behaviorScores: ScorecardEntry[]       // Top 3 behaviors (max 15)
  counterProductiveScores: ScorecardEntry[] // 2 counter-productive (max 10)
  aptitudeScores: ScorecardEntry[]       // Top 3 aptitudes (max 15)
  coreTraitScores: ScorecardEntry[]      // Top 3 traits (max 15)

  grandTotal: number                     // max 55
  recommendation: 'strong-hire' | 'hire-with-plan' | 'conditional' | 'do-not-hire'
  notes: string
  completedAt: string
}

type ScorecardEntry = {
  dimensionId: number
  dimensionName: string
  score: 0 | 3 | 5
  evidence: string  // Interviewer notes on demonstrated behavior
}
```

### Insight Package
```typescript
type InsightPackage = {
  candidateId: string
  jobId: string
  fitScore: number
  tier: ClassificationTier
  gapAnalysis: {
    dimensionId: number
    dimensionName: string
    category: string
    candidateScore: number
    benchmarkScore: number
    gap: number
    recommendation: string
  }[]
  interviewFocusAreas: string[]
  probeQuestions: { area: string; question: string }[]
  riskFactors: string[]
  opportunityFactors: string[]
  generatedAt: string
}
```

---

## 6. What to Build (Frontend Microservice)

### 6A. Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4 + shadcn/ui (matches IG platform)
- **Forms:** React Hook Form + Zod
- **Server State:** TanStack React Query
- **Charts:** Chart.js or Recharts (radar charts, bar charts, heatmaps)
- **Routing:** React Router v6
- **Mock Server:** MSW (Mock Service Worker) for standalone testing
- **Path alias:** `@/` → `src/`

### 6B. File Structure

```
src/
├── types/
│   ├── job-dna.ts            # JobDNA, DimensionBenchmark, scoring types
│   ├── candidate.ts          # Candidate, Pipeline, VariationResult
│   ├── assessment.ts         # BMLAssessment, BMLQuestion, BMLResponse
│   ├── scorecard.ts          # InterviewScorecard, ScorecardEntry
│   ├── insight.ts            # InsightPackage
│   ├── analytics.ts          # Dashboard & reporting types
│   └── index.ts
├── constants/
│   ├── dimensions.ts         # All 22 PRISM dimensions with metadata
│   ├── scoring-tables.ts     # Rank-then-Rate scoring tables
│   ├── classification.ts     # Tier thresholds, interpretation bands
│   └── bml-questions.ts      # All 48 BML questions
├── lib/
│   ├── scoring.ts            # Pure functions: benchmark calc, best-fit, classification
│   ├── api.ts                # Axios instance
│   └── utils.ts              # cn() and helpers
├── services/
│   ├── job-dna.service.ts
│   ├── triage.service.ts
│   ├── assessment.service.ts
│   ├── scorecard.service.ts
│   └── analytics.service.ts
├── hooks/
│   ├── useJobDna.ts          # CRUD queries/mutations
│   ├── useBenchmark.ts       # Benchmark calculation
│   ├── useTriage.ts          # Pipeline management
│   ├── useAssessment.ts      # BML assessment
│   ├── useScorecard.ts       # Interview scorecard
│   ├── useBestFit.ts         # Best-fit scoring
│   └── useAnalytics.ts       # Dashboard data
├── components/
│   ├── job-dna/
│   │   ├── JobDnaWizard.tsx            # 6-step creation wizard
│   │   ├── RoleInfoStep.tsx            # Step 1: role title, dept, tier
│   │   ├── BehaviorRankRate.tsx        # Step 2: rank & rate 8 behaviors
│   │   ├── AptitudeRankRate.tsx        # Step 3: rank & rate 8 aptitudes
│   │   ├── CoreTraitRankRate.tsx       # Step 4: rank & rate 6 core traits
│   │   ├── RoleContextStep.tsx         # Step 5: context survey
│   │   ├── ReviewSubmitStep.tsx        # Step 6: review benchmark + submit
│   │   ├── RankRateInput.tsx           # Reusable drag-rank + rate slider
│   │   ├── BenchmarkRadarChart.tsx     # Radar chart of 22 dimensions
│   │   ├── BenchmarkBarChart.tsx       # Horizontal bars per dimension
│   │   ├── DimensionInterpretation.tsx # Color-coded interpretation band
│   │   └── JobDnaCard.tsx              # Card for listing view
│   ├── triage/
│   │   ├── PipelineDashboard.tsx       # Kanban/table of candidates by step
│   │   ├── CandidateCard.tsx           # Individual candidate status card
│   │   ├── FitAnalysisView.tsx         # Variation scores + dimension breakdown
│   │   ├── CandidateComparison.tsx     # Side-by-side multi-candidate table
│   │   ├── InsightPackageView.tsx      # Nova-generated insight display
│   │   ├── ClassificationBadge.tsx     # Strong Fit / Potential / Misalignment
│   │   └── PipelineStepBadge.tsx       # Step indicator badge
│   ├── assessment/
│   │   ├── BMLSurvey.tsx              # Full 48-question Likert survey
│   │   ├── LikertScale.tsx            # Single Likert 1-7 question component
│   │   ├── BMLProgressBar.tsx         # Survey progress indicator
│   │   ├── BMLResultsView.tsx         # Normalized scores display
│   │   └── AssessmentInviteForm.tsx   # Send assessment to candidate
│   ├── scorecard/
│   │   ├── ScorecardForm.tsx          # 0/3/5 rating form for 11 dimensions
│   │   ├── ScorecardEntry.tsx         # Single dimension score input
│   │   ├── ScorecardSummary.tsx       # Grand total + recommendation
│   │   ├── ScorecardComparison.tsx    # Score vs benchmark overlay
│   │   └── InterviewGuideView.tsx     # Generated interview questions
│   ├── analytics/
│   │   ├── HiringFunnel.tsx           # Funnel chart (applied → hired)
│   │   ├── AccuracyChart.tsx          # Prediction vs outcome
│   │   ├── TimeToFillChart.tsx        # Time-to-fill metrics
│   │   └── StatsGrid.tsx             # KPI cards grid
│   ├── shared/
│   │   ├── DimensionBadge.tsx         # Color-coded dimension chip
│   │   ├── ScoreBar.tsx              # Horizontal score bar (0-100)
│   │   └── RadarChart.tsx            # Reusable radar chart wrapper
│   └── __tests__/
│       ├── scoring.test.ts            # Unit tests for all scoring algorithms
│       ├── BMLSurvey.test.tsx
│       ├── ScorecardForm.test.tsx
│       ├── RankRateInput.test.tsx
│       └── ClassificationBadge.test.tsx
├── pages/
│   ├── Dashboard.tsx                  # Main dashboard with stats + activity
│   ├── JobDnaCreate.tsx               # Job DNA wizard page
│   ├── JobDnaList.tsx                 # List all Job DNAs
│   ├── JobDnaDetail.tsx               # View single Job DNA + benchmark
│   ├── HiringTriage.tsx               # Pipeline dashboard for a job
│   ├── CandidateDetail.tsx            # Single candidate: scores + insights
│   ├── AssessmentTake.tsx             # BML survey page (candidate-facing)
│   ├── InterviewGuide.tsx             # Interview guide view
│   ├── ScorecardPage.tsx              # Scorecard entry page
│   ├── Onboarding.tsx                 # Onboarding plan page
│   ├── Analytics.tsx                  # Reports & analytics
│   └── Settings.tsx                   # User/org settings
├── mocks/
│   ├── handlers.ts                    # MSW request handlers for all endpoints
│   ├── data/
│   │   ├── job-dna.ts                 # Sample Job DNA profiles
│   │   ├── candidates.ts             # Sample candidates with scores
│   │   ├── assessments.ts            # Sample BML responses
│   │   ├── scorecards.ts             # Sample completed scorecards
│   │   └── bml-questions.ts          # All 48 BML questions
│   └── browser.ts                     # MSW browser setup
├── routes.tsx
└── App.tsx
```

### 6C. Constants — `src/constants/dimensions.ts`

```typescript
export const BEHAVIORS = [
  { id: 1, name: 'Innovating', description: 'Generate ideas, original thinking, creative and curious', color: '#38A169' },
  { id: 2, name: 'Initiating', description: 'Enthusiastic, persuasive, effective communication', color: '#2F855A' },
  { id: 3, name: 'Supporting', description: 'Patient, deliberate, empathetic, team-oriented', color: '#E53E3E' },
  { id: 4, name: 'Coordinating', description: 'Collaborative, broad-minded, consultative', color: '#C53030' },
  { id: 5, name: 'Focusing', description: 'Assertive, challenging, driven', color: '#ECC94B' },
  { id: 6, name: 'Delivering', description: 'Goal-oriented, resourceful, works under pressure', color: '#D69E2E' },
  { id: 7, name: 'Finishing', description: 'Attention to detail, accuracy, follows through', color: '#3182CE' },
  { id: 8, name: 'Evaluating', description: 'Questions data validity, fact-based decisions', color: '#2B6CB0' },
] as const

export const APTITUDES = [
  { id: 1, name: 'Practical & Mechanical', description: 'Hands-on, tools and machinery' },
  { id: 2, name: 'Investigative & Analytical', description: 'Research, complex problems' },
  { id: 3, name: 'Creative & Artistic', description: 'Art with science, expressive' },
  { id: 4, name: 'Social & Empathetic', description: 'Interpersonal, human welfare' },
  { id: 5, name: 'Competitive & Entrepreneurial', description: 'Ambitious, risk-taking' },
  { id: 6, name: 'Orderly & Efficient', description: 'Methodical, structured' },
  { id: 7, name: 'Mathematical & Logical', description: 'Numerical, systematic' },
  { id: 8, name: 'Outgoing & Expressive', description: 'Rapport, persuasive' },
] as const

export const CORE_TRAITS = [
  { id: 1, name: 'Relationship Management', description: 'Managing interactions and difficult situations' },
  { id: 2, name: 'Emotional Stability', description: 'Calm under pressure, stress resistant' },
  { id: 3, name: 'Decisiveness', description: 'Sound judgment, committed decisions' },
  { id: 4, name: 'Self-Motivation', description: 'Self-confident, energetic self-starter' },
  { id: 5, name: 'Conscientiousness', description: 'Reliable, thorough, quality-dedicated' },
  { id: 6, name: 'Flexibility', description: 'Adaptable, open to change, resilient' },
] as const
```

### 6D. Scoring Library — `src/lib/scoring.ts`

Implement as **pure functions** (no side effects, fully testable):

```typescript
// Rank-then-Rate scoring tables
export const BEHAVIOR_RANK_TABLE = [96, 84, 72, 60, 48, 36, 24, 12]
export const APTITUDE_RANK_TABLE = [100, 88, 75, 62, 50, 37, 25, 13]
export const CORE_TRAIT_RANK_TABLE = [100, 83, 67, 50, 33, 17]

/** Calculate final benchmark % from rank position and rate value */
export function calculateBenchmark(
  rankPosition: number,     // 0-indexed
  rateValue: number,        // 1-based
  category: 'behavior' | 'aptitude' | 'core-trait'
): number

/** Calculate best-fit variation for a candidate against a benchmark */
export function calculateBestFit(
  candidateScores: DimensionScore[],
  benchmark: DimensionBenchmark[]
): VariationResult

/** Classify candidate tier based on total variation */
export function classifyCandidate(totalVariation: number): ClassificationTier

/** Calculate interview scorecard grand total and recommendation */
export function calculateScorecardTotal(
  entries: ScorecardEntry[]
): { grandTotal: number; recommendation: ScorecardRecommendation }

/** Normalize BML Likert (1-7) responses to 0-100% dimension scores */
export function normalizeBMLResponses(
  responses: BMLResponse[],
  questions: BMLQuestion[]
): { scores: DimensionScore[]; confidence: number }

/** Get interpretation band for a benchmark score */
export function getInterpretation(score: number):
  'very-high' | 'natural' | 'moderate' | 'low' | 'avoidance'
```

### 6E. Key UI Component Specs

#### `RankRateInput.tsx` — Core reusable component
- Accepts a list of dimensions (8 behaviors, 8 aptitudes, or 6 traits)
- **Rank** section: drag-and-drop sortable list (or numbered selects) to order by importance
- **Rate** section: slider or select (1–N) for each dimension
- Shows calculated `finalBenchmarkPercent` in real-time with color-coded interpretation band
- Emits `onChange(dimensions: DimensionBenchmark[])` on every change

#### `JobDnaWizard.tsx` — 6-step wizard
- Step indicator (1–6) with current step highlighted
- Back/Next navigation with validation per step
- Step 1: Role info (title, department, tier select)
- Step 2: `<RankRateInput>` for 8 Behaviors
- Step 3: `<RankRateInput>` for 8 Aptitudes
- Step 4: `<RankRateInput>` for 6 Core Traits
- Step 5: Role context form (text areas for pressures, work styles, culture)
- Step 6: Review all data + radar chart preview + Submit button

#### `BenchmarkRadarChart.tsx`
- Radar chart showing all 22 dimensions grouped by category
- Color-coded: Green=behaviors, Blue=aptitudes, Orange=traits
- Shows benchmark scores as the filled area
- Optional overlay for candidate scores (comparison mode)

#### `BMLSurvey.tsx` — Candidate-facing assessment
- Progressive survey showing one question at a time (or grouped by dimension)
- Likert 1–7 radio buttons or slider per question
- Progress bar showing completion %
- Timer showing elapsed time
- Submit button at end → normalizes scores

#### `PipelineDashboard.tsx`
- Kanban columns by pipeline step OR table view toggle
- Each candidate shows: name/code, status badge, fit tier badge, variation score
- Click candidate → detail view
- Bulk actions: invite to assessment, advance step

#### `ScorecardForm.tsx`
- Groups: Top 3 Behaviors, Counter-Productive (2), Top 3 Aptitudes, Top 3 Core Traits
- Each dimension: name, 0/3/5 radio buttons, evidence text area
- Running grand total display
- Auto-calculates recommendation on complete
- Submit saves to API

#### `FitAnalysisView.tsx`
- Candidate scores vs benchmark (side-by-side bars per dimension)
- Total variation score with tier badge
- Per-category breakdown (behavior, aptitude, trait variations)
- Skew indicator (exceeds vs falls below)
- Gap analysis table: dimension, candidate, benchmark, gap, flagged

#### `CandidateComparison.tsx`
- Multi-select candidates for comparison
- Table: dimensions as rows, candidates as columns
- Color-coded cells (green = close to benchmark, red = far)
- Sort by total variation

---

## 7. Mock Data & Standalone Testing

### MSW Handlers
Create MSW handlers for every API endpoint listed in Section 4. Each handler should:
- Return realistic mock data matching the types in Section 5
- Support CRUD operations (persist in memory during session)
- Include 2–3 pre-seeded Job DNA profiles with different tiers
- Include 5–10 pre-seeded candidates at various pipeline stages
- Include sample BML questions (all 48)

### Test Harness Page
Build a `/dev/test` page (no auth) that:
- Shows all components with mock data
- Has a Job DNA creation wizard with working rank-rate inputs
- Shows a populated pipeline dashboard with candidates at each step
- Renders a BML survey that can be filled out and scored
- Shows a scorecard form with calculated totals
- Displays radar charts, comparison views, and analytics

---

## 8. Plugin Architecture (for later IG integration)

When this microservice is integrated into the IG platform:

1. **Service layer** → calls go through IG backend (`/v1/blueprint/*`) instead of local mock
2. **Auth** → `useAuth()` from IG's `AuthContext` replaces local auth
3. **Layout** → Pages wrap with IG's role-specific layouts (`PractitionerLayout`, `ManagerLayout`)
4. **Routes** → Register under `/practitioner/job-blueprint/*` and `/manager/hiring/*`
5. **Nav items** → Add to `NAV_ITEMS_BY_ROLE` in IG's `navigation.ts`
6. **Notifications** → Wire to IG's toast system (Sonner)
7. **PRISM data** → Connect to existing PRISM integration (`usePrismReport`, etc.)

To enable this:
- All API calls go through a single `api.ts` axios instance (swappable base URL)
- All auth access through a single `useCurrentUser()` hook (swappable context)
- All layout wrapping through a single `<AppLayout>` component (swappable)
- Feature flag: `VITE_STANDALONE=true` uses MSW mocks, `false` uses real API

---

## 9. Implementation Sequence

1. **Types + Constants** — all data models, 22 dimensions, scoring tables, BML questions
2. **Scoring library** — pure functions with unit tests (benchmark, best-fit, classification, scorecard, BML normalization)
3. **Services + Hooks** — API service layer + React Query hooks
4. **Shared components** — ScoreBar, DimensionBadge, RadarChart, ClassificationBadge
5. **RankRateInput** — the core rank-and-rate interaction component
6. **Job DNA wizard** — 6-step creation flow with radar chart preview
7. **BML Survey** — 48-question Likert assessment with scoring
8. **Pipeline dashboard** — candidate listing, status tracking, fit analysis
9. **Scorecard + Interview Guide** — interview prep and scoring
10. **Analytics** — funnel, accuracy, time-to-fill charts
11. **MSW mock server** — handlers for all endpoints with seed data
12. **Test harness** — standalone dev page with all components
13. **Tests** — unit tests for scoring, component tests for forms and charts

---

## 10. Pricing Reference (for UI labels)

| Service | Front Line (<$75k) | Professional ($75k–$150k) | Executive ($150k+) |
|---------|---------------------|---------------------------|---------------------|
| Job DNA Creation | $5,000 | $5,000 | $5,000 |
| Best-Fit Screening | $50/candidate | $125/candidate | $500/candidate |
| Interview Guide | $100/candidate | $100/candidate | $250/candidate |
| Onboarding | $100/hire | $100/hire | $1,700/hire |
| **Cost per Hire** | **$250** | **$325** | **$7,450** |

### AI Agent Subscriptions
| Package | Price | Includes |
|---------|-------|----------|
| Employee A | $30/mo | PRISM Coach + basic career insights |
| Employee B | $50/mo | + Job Agent, Career Agent, Leadership Agent |
| Employee C | $70/mo | + L&D & Training Agent |
| Manager M-A | $80/mo | Team dashboard + hiring triage + basic analytics |
| Manager M-B | $100/mo | + advanced analytics + multi-role benchmarking |
| HR Team | $200/team/mo | Full platform access, unlimited blueprints |

---

## 11. Sample Job Blueprint Report Structure

A completed Job Blueprint report contains:

1. **Data Summary** — Top 4 Behavior scores, counter-productive behavior, Top 3 Aptitude scores, Top 3 Core Trait scores
2. **Behavioral Analysis** — Each top behavior explained in job-role context
3. **High vs Average Performer Comparison** — Key differentiators between top and average performers
4. **Work Aptitude Analysis** — How aptitudes map to role requirements
5. **Core Trait Analysis** — Trait alignment validation
6. **Counter-Productive Validation** — Confirms lowest-ranked behavior would undermine performance
7. **Stakeholder Approval** — Sign-off section

This structure should inform the `JobDnaDetail` page layout and the PDF export format.
