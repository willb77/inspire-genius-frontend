import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Job DNA components
import { JobDnaWizard } from '@/components/job-blueprint/job-dna/JobDnaWizard'
import { JobDnaCard } from '@/components/job-blueprint/job-dna/JobDnaCard'
import { BenchmarkRadarChart } from '@/components/job-blueprint/job-dna/BenchmarkRadarChart'
import { BenchmarkBarChart } from '@/components/job-blueprint/job-dna/BenchmarkBarChart'

// Shared
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import { DimensionBadge } from '@/components/job-blueprint/shared/DimensionBadge'
import { ClassificationBadge } from '@/components/job-blueprint/shared/ClassificationBadge'
import { PipelineStepBadge } from '@/components/job-blueprint/shared/PipelineStepBadge'

// Assessment
import { BMLSurvey } from '@/components/job-blueprint/assessment/BMLSurvey'
import { BMLResultsView } from '@/components/job-blueprint/assessment/BMLResultsView'

// Triage
import { PipelineDashboard } from '@/components/job-blueprint/triage/PipelineDashboard'
import { CandidateCard } from '@/components/job-blueprint/triage/CandidateCard'
import { FitAnalysisView } from '@/components/job-blueprint/triage/FitAnalysisView'
import { CandidateComparison } from '@/components/job-blueprint/triage/CandidateComparison'
import { InsightPackageView } from '@/components/job-blueprint/triage/InsightPackageView'

// Scorecard
import { ScorecardForm } from '@/components/job-blueprint/scorecard/ScorecardForm'
import { ScorecardSummary } from '@/components/job-blueprint/scorecard/ScorecardSummary'
import { InterviewGuideView } from '@/components/job-blueprint/scorecard/InterviewGuideView'

// Analytics
import { StatsGrid } from '@/components/job-blueprint/analytics/StatsGrid'
import { HiringFunnel } from '@/components/job-blueprint/analytics/HiringFunnel'
import { AccuracyChart } from '@/components/job-blueprint/analytics/AccuracyChart'
import { TimeToFillChart } from '@/components/job-blueprint/analytics/TimeToFillChart'

// Constants & types
import { BML_QUESTIONS } from '@/constants/job-blueprint/bml-questions'
import type {
  JobDNA, DimensionBenchmark, Candidate, DimensionScore,
  VariationResult, InsightPackage, InterviewGuide, BlueprintStats,
  FunnelStage, AccuracyDataPoint, TimeToFillDataPoint,
  ClassificationTier, PipelineStep,
} from '@/types/job-blueprint'

// ── Mock Data ────────────────────────────────────────────────────────

const MOCK_BEHAVIORS: DimensionBenchmark[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 98, interpretation: 'very-high' },
  { dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', rankPosition: 2, rankPercent: 84, rateValue: 7, finalBenchmarkPercent: 86, interpretation: 'very-high' },
  { dimensionId: 5, dimensionName: 'Focusing', category: 'behavior', rankPosition: 3, rankPercent: 72, rateValue: 6, finalBenchmarkPercent: 73, interpretation: 'natural' },
  { dimensionId: 6, dimensionName: 'Delivering', category: 'behavior', rankPosition: 4, rankPercent: 60, rateValue: 5, finalBenchmarkPercent: 61, interpretation: 'moderate' },
  { dimensionId: 4, dimensionName: 'Coordinating', category: 'behavior', rankPosition: 5, rankPercent: 48, rateValue: 4, finalBenchmarkPercent: 49, interpretation: 'moderate' },
  { dimensionId: 8, dimensionName: 'Evaluating', category: 'behavior', rankPosition: 6, rankPercent: 36, rateValue: 3, finalBenchmarkPercent: 37, interpretation: 'low' },
  { dimensionId: 3, dimensionName: 'Supporting', category: 'behavior', rankPosition: 7, rankPercent: 24, rateValue: 2, finalBenchmarkPercent: 25, interpretation: 'low' },
  { dimensionId: 7, dimensionName: 'Finishing', category: 'behavior', rankPosition: 8, rankPercent: 12, rateValue: 1, finalBenchmarkPercent: 12, interpretation: 'avoidance' },
]

const MOCK_APTITUDES: DimensionBenchmark[] = [
  { dimensionId: 5, dimensionName: 'Competitive & Entrepreneurial', category: 'aptitude', rankPosition: 1, rankPercent: 100, rateValue: 8, finalBenchmarkPercent: 100, interpretation: 'very-high' },
  { dimensionId: 2, dimensionName: 'Investigative & Analytical', category: 'aptitude', rankPosition: 2, rankPercent: 88, rateValue: 7, finalBenchmarkPercent: 88, interpretation: 'very-high' },
  { dimensionId: 8, dimensionName: 'Outgoing & Expressive', category: 'aptitude', rankPosition: 3, rankPercent: 75, rateValue: 6, finalBenchmarkPercent: 75, interpretation: 'natural' },
  { dimensionId: 4, dimensionName: 'Social & Empathetic', category: 'aptitude', rankPosition: 4, rankPercent: 62, rateValue: 5, finalBenchmarkPercent: 62, interpretation: 'moderate' },
  { dimensionId: 7, dimensionName: 'Mathematical & Logical', category: 'aptitude', rankPosition: 5, rankPercent: 50, rateValue: 4, finalBenchmarkPercent: 50, interpretation: 'moderate' },
  { dimensionId: 1, dimensionName: 'Practical & Mechanical', category: 'aptitude', rankPosition: 6, rankPercent: 37, rateValue: 3, finalBenchmarkPercent: 37, interpretation: 'low' },
  { dimensionId: 6, dimensionName: 'Orderly & Efficient', category: 'aptitude', rankPosition: 7, rankPercent: 25, rateValue: 2, finalBenchmarkPercent: 25, interpretation: 'low' },
  { dimensionId: 3, dimensionName: 'Creative & Artistic', category: 'aptitude', rankPosition: 8, rankPercent: 13, rateValue: 1, finalBenchmarkPercent: 13, interpretation: 'avoidance' },
]

const MOCK_CORE_TRAITS: DimensionBenchmark[] = [
  { dimensionId: 4, dimensionName: 'Self-Motivation', category: 'core-trait', rankPosition: 1, rankPercent: 100, rateValue: 6, finalBenchmarkPercent: 100, interpretation: 'very-high' },
  { dimensionId: 3, dimensionName: 'Decisiveness', category: 'core-trait', rankPosition: 2, rankPercent: 83, rateValue: 5, finalBenchmarkPercent: 83, interpretation: 'natural' },
  { dimensionId: 1, dimensionName: 'Relationship Management', category: 'core-trait', rankPosition: 3, rankPercent: 67, rateValue: 4, finalBenchmarkPercent: 67, interpretation: 'natural' },
  { dimensionId: 2, dimensionName: 'Emotional Stability', category: 'core-trait', rankPosition: 4, rankPercent: 50, rateValue: 3, finalBenchmarkPercent: 50, interpretation: 'moderate' },
  { dimensionId: 5, dimensionName: 'Conscientiousness', category: 'core-trait', rankPosition: 5, rankPercent: 33, rateValue: 2, finalBenchmarkPercent: 33, interpretation: 'low' },
  { dimensionId: 6, dimensionName: 'Flexibility', category: 'core-trait', rankPosition: 6, rankPercent: 17, rateValue: 1, finalBenchmarkPercent: 17, interpretation: 'avoidance' },
]

const MOCK_JOB_DNA: JobDNA = {
  id: 'jd-001',
  orgId: 'org-001',
  roleTitle: 'Senior Account Manager',
  department: 'Sales',
  tier: 'professional',
  status: 'active',
  behaviors: MOCK_BEHAVIORS,
  aptitudes: MOCK_APTITUDES,
  coreTraits: MOCK_CORE_TRAITS,
  counterProductiveBehaviors: ['7', '3'],
  roleContext: {
    workPressures: ['Tight quarterly targets', 'Multi-stakeholder management', 'Fast-paced market'],
    requiredWorkStyles: ['Collaborative selling', 'Independent territory management'],
    environmentalFactors: ['Remote/hybrid working', 'Regular client site visits'],
    culturalFactors: ['Innovation-driven culture', 'Customer-first mentality'],
  },
  deliverables: {
    jobDescription: 'Manage key client accounts and drive revenue growth',
    kpis: ['Revenue target achievement', 'Client retention rate', 'Pipeline velocity'],
    criticalActivities: ['Client relationship management', 'New business development', 'Cross-selling'],
    keyInteractions: ['C-suite executives', 'Marketing team', 'Product managers'],
  },
  createdBy: 'user-001',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-03-10T14:30:00Z',
  version: 2,
}

function makeCandidateScores(offset: number): DimensionScore[] {
  return [
    ...MOCK_BEHAVIORS.map(b => ({ dimensionId: b.dimensionId, dimensionName: b.dimensionName, category: b.category, score: Math.max(0, Math.min(100, b.finalBenchmarkPercent + offset + Math.round((Math.random() - 0.5) * 20))) })),
    ...MOCK_APTITUDES.map(a => ({ dimensionId: a.dimensionId, dimensionName: a.dimensionName, category: a.category, score: Math.max(0, Math.min(100, a.finalBenchmarkPercent + offset + Math.round((Math.random() - 0.5) * 20))) })),
    ...MOCK_CORE_TRAITS.map(t => ({ dimensionId: t.dimensionId, dimensionName: t.dimensionName, category: t.category, score: Math.max(0, Math.min(100, t.finalBenchmarkPercent + offset + Math.round((Math.random() - 0.5) * 20))) })),
  ]
}

function makeVariation(offset: number): VariationResult {
  const base = Math.abs(offset) * 5
  return {
    behaviorVariation: base + 20,
    aptitudeVariation: base + 15,
    coreTraitVariation: base + 10,
    totalVariation: base * 3 + 45,
    standardDeviation: 8.5 + Math.abs(offset),
    skew: -offset * 0.5,
    perDimension: [],
  }
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c-001', jobId: 'jd-001', name: 'Sarah Chen', email: 'sarah.chen@email.com', code: 'SC-2026',
    status: 'classified' as PipelineStep, assessmentId: 'a-001',
    prismScores: makeCandidateScores(2), variationScores: makeVariation(2),
    classificationTier: 'strong-fit' as ClassificationTier, scorecardId: null,
    insightPackage: null, createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-03-15T11:00:00Z',
  },
  {
    id: 'c-002', jobId: 'jd-001', name: 'Marcus Johnson', email: 'marcus.j@email.com', code: 'MJ-2026',
    status: 'fit-scored' as PipelineStep, assessmentId: 'a-002',
    prismScores: makeCandidateScores(-5), variationScores: makeVariation(-5),
    classificationTier: 'potential-fit' as ClassificationTier, scorecardId: null,
    insightPackage: null, createdAt: '2026-02-05T09:00:00Z', updatedAt: '2026-03-14T15:00:00Z',
  },
  {
    id: 'c-003', jobId: 'jd-001', name: 'Emma Wilson', email: 'emma.w@email.com',
    status: 'assessment-invited' as PipelineStep, assessmentId: 'a-003',
    prismScores: null, variationScores: null,
    classificationTier: null, scorecardId: null,
    insightPackage: null, createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'c-004', jobId: 'jd-001', name: 'James Park', email: 'james.p@email.com', code: 'JP-2026',
    status: 'interview-completed' as PipelineStep, assessmentId: 'a-004',
    prismScores: makeCandidateScores(0), variationScores: makeVariation(0),
    classificationTier: 'strong-fit' as ClassificationTier, scorecardId: 'sc-001',
    insightPackage: null, createdAt: '2026-01-25T09:00:00Z', updatedAt: '2026-03-18T16:00:00Z',
  },
  {
    id: 'c-005', jobId: 'jd-001', name: 'Lisa Fernandez', email: 'lisa.f@email.com',
    status: 'intake' as PipelineStep, assessmentId: null,
    prismScores: null, variationScores: null,
    classificationTier: null, scorecardId: null,
    insightPackage: null, createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'c-006', jobId: 'jd-001', name: 'David Kim', email: 'david.k@email.com', code: 'DK-2026',
    status: 'hired' as PipelineStep, assessmentId: 'a-005',
    prismScores: makeCandidateScores(5), variationScores: makeVariation(5),
    classificationTier: 'strong-fit' as ClassificationTier, scorecardId: 'sc-002',
    insightPackage: null, createdAt: '2026-01-10T09:00:00Z', updatedAt: '2026-03-20T10:00:00Z',
  },
]

const MOCK_INSIGHT: InsightPackage = {
  candidateId: 'c-001',
  jobId: 'jd-001',
  fitScore: 82,
  tier: 'strong-fit',
  gapAnalysis: [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', candidateScore: 92, benchmarkScore: 98, gap: -6, recommendation: 'Minor gap - candidate shows strong innovation but slightly below benchmark' },
    { dimensionId: 5, dimensionName: 'Focusing', category: 'behavior', candidateScore: 65, benchmarkScore: 73, gap: -8, recommendation: 'Moderate gap - may need coaching on assertiveness in high-pressure situations' },
    { dimensionId: 4, dimensionName: 'Self-Motivation', category: 'core-trait', candidateScore: 95, benchmarkScore: 100, gap: -5, recommendation: 'Strong alignment - highly self-motivated' },
  ],
  interviewFocusAreas: [
    'Probe for evidence of assertive negotiation in complex deals',
    'Explore creative problem-solving examples in client management',
    'Assess comfort with autonomous territory management',
  ],
  probeQuestions: [
    { area: 'Assertiveness', question: 'Tell me about a time you had to push back on a client demand that was unreasonable.' },
    { area: 'Innovation', question: 'Describe a situation where you created a novel solution for a client challenge.' },
    { area: 'Resilience', question: 'How do you handle a quarter where you are significantly behind target?' },
  ],
  riskFactors: [
    'Slightly below benchmark on Focusing - may struggle with high-pressure negotiation',
    'Counter-productive behavior (Finishing) score higher than ideal',
  ],
  opportunityFactors: [
    'Exceptional innovation scores suggest strong creative selling ability',
    'High self-motivation indicates reliable autonomous performance',
    'Strong relationship management for key account retention',
  ],
  generatedAt: '2026-03-15T14:30:00Z',
}

const MOCK_INTERVIEW_GUIDE: InterviewGuide = {
  jobId: 'jd-001',
  candidateId: 'c-001',
  roleTitle: 'Senior Account Manager',
  focusDimensions: [
    {
      dimensionId: 1, dimensionName: 'Innovating', category: 'behavior',
      benchmarkScore: 98, candidateScore: 92, gap: -6,
      questions: [
        'Describe a time you developed a completely new approach to solving a client problem.',
        'How do you stay current with industry trends and incorporate new ideas into your work?',
        'Tell me about an innovative sales strategy you implemented.',
      ],
    },
    {
      dimensionId: 5, dimensionName: 'Focusing', category: 'behavior',
      benchmarkScore: 73, candidateScore: 65, gap: -8,
      questions: [
        'Tell me about a high-stakes negotiation where you had to hold firm on your position.',
        'How do you handle pushback from stakeholders when you believe in your approach?',
      ],
    },
  ],
  counterProductiveQuestions: [
    {
      dimensionName: 'Finishing',
      questions: [
        'How do you prioritize when you have multiple urgent deliverables?',
        'Tell me about a time you had to sacrifice perfection for speed.',
      ],
    },
  ],
  generalQuestions: [
    'What attracted you to this role and our organisation?',
    'Where do you see yourself in 3-5 years?',
    'How would your current team describe your leadership style?',
  ],
  generatedAt: '2026-03-15T14:30:00Z',
}

const MOCK_STATS: BlueprintStats = {
  totalJobDnas: 12,
  activeJobs: 5,
  totalCandidates: 47,
  avgTimeToFill: 28,
  strongFitRate: 34,
  hiresThisMonth: 3,
}

const MOCK_FUNNEL: FunnelStage[] = [
  { stage: 'Applied', count: 120, percentage: 100 },
  { stage: 'Screened', count: 85, percentage: 71 },
  { stage: 'Assessed', count: 47, percentage: 39 },
  { stage: 'Interviewed', count: 22, percentage: 18 },
  { stage: 'Offered', count: 8, percentage: 7 },
  { stage: 'Hired', count: 5, percentage: 4 },
]

const MOCK_ACCURACY: AccuracyDataPoint[] = [
  { month: 'Oct', predicted: 78, actual: 72 },
  { month: 'Nov', predicted: 82, actual: 80 },
  { month: 'Dec', predicted: 75, actual: 78 },
  { month: 'Jan', predicted: 88, actual: 85 },
  { month: 'Feb', predicted: 85, actual: 82 },
  { month: 'Mar', predicted: 90, actual: 88 },
]

const MOCK_TIME_TO_FILL: TimeToFillDataPoint[] = [
  { month: 'Oct', days: 35, tier: 'professional' },
  { month: 'Nov', days: 28, tier: 'professional' },
  { month: 'Dec', days: 42, tier: 'executive' },
  { month: 'Jan', days: 22, tier: 'front-line' },
  { month: 'Feb', days: 30, tier: 'professional' },
  { month: 'Mar', days: 25, tier: 'professional' },
]

// ── Test Harness Component ───────────────────────────────────────────

export default function JobBlueprintTestHarness() {
  const [bmlResults, setBmlResults] = useState<{ scores: DimensionScore[]; confidence: number } | null>(null)

  const allBenchmarks = [...MOCK_BEHAVIORS, ...MOCK_APTITUDES, ...MOCK_CORE_TRAITS]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo-dark.png" alt="Inspire Genius" className="h-8" />
            <div className="border-l pl-3 ml-1">
              <h1 className="text-lg font-bold text-slate-800">Job Blueprint</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">Powered by PRISM Brain Mapping</p>
            </div>
          </div>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
            Test Harness
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="wizard" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="wizard">Job DNA Wizard</TabsTrigger>
            <TabsTrigger value="shared">Shared Components</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="bml">BML Survey</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="fit">Fit Analysis</TabsTrigger>
            <TabsTrigger value="insight">Insights</TabsTrigger>
            <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="interview">Interview Guide</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ── Wizard Tab ─────────────────────────────────────────── */}
          <TabsContent value="wizard">
            <Card>
              <CardHeader>
                <CardTitle>Job DNA Creation Wizard</CardTitle>
              </CardHeader>
              <CardContent>
                <JobDnaWizard
                  onSubmit={data => {
                    toast.success('Job DNA created successfully!')
                    console.log('Wizard submitted:', data)
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Shared Components Tab ──────────────────────────────── */}
          <TabsContent value="shared">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">ScoreBar</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ScoreBar score={92} label="Very High" />
                  <ScoreBar score={72} label="Natural" />
                  <ScoreBar score={50} label="Moderate" />
                  <ScoreBar score={30} label="Low" />
                  <ScoreBar score={15} label="Avoidance" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">DimensionBadge</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <DimensionBadge name="Innovating" category="behavior" score={98} />
                  <DimensionBadge name="Investigative" category="aptitude" score={88} />
                  <DimensionBadge name="Self-Motivation" category="core-trait" score={100} />
                  <DimensionBadge name="Finishing" category="behavior" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">ClassificationBadge</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <ClassificationBadge tier="strong-fit" />
                  <ClassificationBadge tier="potential-fit" />
                  <ClassificationBadge tier="moderate-fit" />
                  <ClassificationBadge tier="misalignment" />
                  <ClassificationBadge tier="strong-fit" size="sm" />
                  <ClassificationBadge tier="strong-fit" size="lg" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">PipelineStepBadge</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(['intake', 'assessment-invited', 'assessment-completed', 'fit-scored', 'classified', 'insights-delivered', 'interview-scheduled', 'interview-completed', 'hired', 'rejected'] as const).map(step => (
                    <PipelineStepBadge key={step} step={step} />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">JobDnaCard</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-w-md">
                    <JobDnaCard jobDna={MOCK_JOB_DNA} onClick={() => toast.info('Job DNA clicked')} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">CandidateCard</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-w-md">
                  {MOCK_CANDIDATES.slice(0, 3).map(c => (
                    <CandidateCard key={c.id} candidate={c} onClick={() => toast.info(`Clicked: ${c.name}`)} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Charts Tab ─────────────────────────────────────────── */}
          <TabsContent value="charts">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Benchmark Radar Chart</CardTitle></CardHeader>
                <CardContent>
                  <BenchmarkRadarChart
                    behaviors={MOCK_BEHAVIORS}
                    aptitudes={MOCK_APTITUDES}
                    coreTraits={MOCK_CORE_TRAITS}
                    candidateScores={MOCK_CANDIDATES[0].prismScores ?? undefined}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Behavior Scores</CardTitle></CardHeader>
                  <CardContent>
                    <BenchmarkBarChart benchmarks={MOCK_BEHAVIORS} height={250} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Aptitude Scores</CardTitle></CardHeader>
                  <CardContent>
                    <BenchmarkBarChart benchmarks={MOCK_APTITUDES} height={250} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Core Trait Scores</CardTitle></CardHeader>
                  <CardContent>
                    <BenchmarkBarChart benchmarks={MOCK_CORE_TRAITS} height={200} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── BML Survey Tab ─────────────────────────────────────── */}
          <TabsContent value="bml">
            <div className="space-y-6">
              {!bmlResults ? (
                <BMLSurvey
                  questions={BML_QUESTIONS}
                  onSubmit={(_responses, scores, confidence) => {
                    setBmlResults({ scores, confidence })
                    toast.success(`Assessment complete! Confidence: ${confidence}%`)
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setBmlResults(null)}>
                    Retake Survey
                  </Button>
                  <BMLResultsView scores={bmlResults.scores} confidence={bmlResults.confidence} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Pipeline Tab ───────────────────────────────────────── */}
          <TabsContent value="pipeline">
            <PipelineDashboard
              candidates={MOCK_CANDIDATES}
              onCandidateClick={c => toast.info(`Selected: ${c.name}`)}
              onAdvance={id => toast.success(`Advanced candidate ${id}`)}
            />
          </TabsContent>

          {/* ── Fit Analysis Tab ───────────────────────────────────── */}
          <TabsContent value="fit">
            <div className="space-y-6">
              <FitAnalysisView
                candidateName="Sarah Chen"
                candidateScores={MOCK_CANDIDATES[0].prismScores!}
                benchmark={allBenchmarks}
                variation={MOCK_CANDIDATES[0].variationScores!}
                tier="strong-fit"
              />

              <CandidateComparison
                candidates={MOCK_CANDIDATES.filter(c => c.prismScores)}
                benchmark={allBenchmarks}
              />
            </div>
          </TabsContent>

          {/* ── Insight Package Tab ────────────────────────────────── */}
          <TabsContent value="insight">
            <InsightPackageView insight={MOCK_INSIGHT} />
          </TabsContent>

          {/* ── Scorecard Tab ──────────────────────────────────────── */}
          <TabsContent value="scorecard">
            <div className="space-y-6">
              <ScorecardForm
                sections={[
                  {
                    title: 'Top 3 Behaviors (max 15)',
                    entries: MOCK_BEHAVIORS.slice(0, 3).map(b => ({
                      dimensionId: b.dimensionId,
                      dimensionName: b.dimensionName,
                      score: 0 as const,
                      evidence: '',
                    })),
                  },
                  {
                    title: 'Counter-Productive Behaviors (max 10)',
                    isCounterProductive: true,
                    entries: MOCK_BEHAVIORS.slice(6, 8).map(b => ({
                      dimensionId: b.dimensionId,
                      dimensionName: b.dimensionName,
                      score: 0 as const,
                      evidence: '',
                    })),
                  },
                  {
                    title: 'Top 3 Work Aptitudes (max 15)',
                    entries: MOCK_APTITUDES.slice(0, 3).map(a => ({
                      dimensionId: a.dimensionId + 100,
                      dimensionName: a.dimensionName,
                      score: 0 as const,
                      evidence: '',
                    })),
                  },
                  {
                    title: 'Top 3 Core Traits (max 15)',
                    entries: MOCK_CORE_TRAITS.slice(0, 3).map(t => ({
                      dimensionId: t.dimensionId + 200,
                      dimensionName: t.dimensionName,
                      score: 0 as const,
                      evidence: '',
                    })),
                  },
                ]}
                onSubmit={(entries, notes) => {
                  toast.success('Scorecard submitted!')
                  console.log('Scorecard:', entries, notes)
                }}
              />

              <ScorecardSummary grandTotal={43} recommendation="hire-with-plan" />
            </div>
          </TabsContent>

          {/* ── Interview Guide Tab ────────────────────────────────── */}
          <TabsContent value="interview">
            <InterviewGuideView guide={MOCK_INTERVIEW_GUIDE} />
          </TabsContent>

          {/* ── Analytics Tab ──────────────────────────────────────── */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <StatsGrid stats={MOCK_STATS} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HiringFunnel data={MOCK_FUNNEL} />
                <AccuracyChart data={MOCK_ACCURACY} />
              </div>
              <TimeToFillChart data={MOCK_TIME_TO_FILL} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
