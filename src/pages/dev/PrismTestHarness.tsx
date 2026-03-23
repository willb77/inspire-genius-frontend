import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import PrismStatusBadge from '@/components/prism/PrismStatusBadge'
import PrismQuadrantChart from '@/components/prism/PrismQuadrantChart'
import PrismBehaviourChart from '@/components/prism/PrismBehaviourChart'
import PrismWorkEnvironment from '@/components/prism/PrismWorkEnvironment'
import PrismWorkAptitude from '@/components/prism/PrismWorkAptitude'
import PrismBigFiveChart from '@/components/prism/PrismBigFiveChart'
import PrismEQChart from '@/components/prism/PrismEQChart'
import PrismMentalToughness from '@/components/prism/PrismMentalToughness'
import PrismAssessmentCard from '@/components/prism/PrismAssessmentCard'
import PrismInitiateForm from '@/components/prism/PrismInitiateForm'
import {
  STATUS_CONFIG,
  QUEST_TYPE_NAMES,
  QUEST_TYPE,
  QUADRANT_CONFIG,
  BEHAVIOUR_CONFIG,
} from '@/constants/prism'
import type { AssessmentStatus, PrismAssessment } from '@/types/prism/assessment-types'
import type {
  PRISMQuadrant,
  PRISMBehaviourDimension,
  WorkAptitude,
  BigFiveItem,
  EQItem,
  MentalToughnessItem,
} from '@/types/prism/api-types'

// ── Mock Data ──────────────────────────────────────────────────────

const MOCK_QUADRANTS: PRISMQuadrant[] = [
  { QuadID: 1, Name: 'Green', Value: 72 },
  { QuadID: 2, Name: 'Blue', Value: 58 },
  { QuadID: 3, Name: 'Red', Value: 45 },
  { QuadID: 4, Name: 'Gold', Value: 85 },
]

const MOCK_BEHAVIOURS: PRISMBehaviourDimension[] = [
  { BehaviourID: 1, Name: 'Innovating', Value: 45 },
  { BehaviourID: 2, Name: 'Initiating', Value: 88 },
  { BehaviourID: 3, Name: 'Supporting', Value: 62 },
  { BehaviourID: 4, Name: 'Coordinating', Value: 55 },
  { BehaviourID: 5, Name: 'Focusing', Value: 70 },
  { BehaviourID: 6, Name: 'Delivering', Value: 78 },
  { BehaviourID: 7, Name: 'Finishing', Value: 50 },
  { BehaviourID: 8, Name: 'Evaluating', Value: 88 },
]

const MOCK_WORK_ENV: Record<string, string> = {
  '82': 'Collaborative teamwork',
  '75': 'Creative problem solving',
  '68': 'Open communication',
  '55': 'Structured processes',
  '48': 'Competitive environment',
  '42': 'Routine tasks',
  '28': 'High-pressure deadlines',
  '15': 'Isolated work',
}

const MOCK_WORK_APT: WorkAptitude[] = [
  { apt_id: 1, apt_title: 'Analytical Thinking', apt_desc: 'Ability to analyze complex information', apt_desc_short: 'Breaks down complex problems', score: 78, occupation_score: 65 },
  { apt_id: 2, apt_title: 'Communication', apt_desc: 'Verbal and written communication', apt_desc_short: 'Effective communicator', score: 85, occupation_score: 70 },
  { apt_id: 3, apt_title: 'Leadership', apt_desc: 'Ability to lead and influence others', apt_desc_short: 'Natural leader', score: 62, occupation_score: 80 },
  { apt_id: 4, apt_title: 'Adaptability', apt_desc: 'Flexibility in changing situations', apt_desc_short: 'Adapts to change', score: 90, occupation_score: 55 },
  { apt_id: 5, apt_title: 'Detail Orientation', apt_desc: 'Attention to detail and accuracy', apt_desc_short: 'Detail focused', score: 45, occupation_score: 75 },
]

const MOCK_BIG_FIVE: BigFiveItem[] = [
  { item_id: 1, item_title: 'Openness', item_score: 78 },
  { item_id: 2, item_title: 'Conscientiousness', item_score: 65 },
  { item_id: 3, item_title: 'Extraversion', item_score: 82 },
  { item_id: 4, item_title: 'Agreeableness', item_score: 58 },
  { item_id: 5, item_title: 'Neuroticism', item_score: 35 },
]

const MOCK_EQ: EQItem[] = [
  { item_id: 1, item_title: 'Self-Awareness', item_score: 72 },
  { item_id: 2, item_title: 'Self-Regulation', item_score: 65 },
  { item_id: 3, item_title: 'Motivation', item_score: 88 },
  { item_id: 4, item_title: 'Empathy', item_score: 70 },
  { item_id: 5, item_title: 'Social Skills', item_score: 78 },
]

const MOCK_MT: MentalToughnessItem[] = [
  { item_id: 1, item_title: 'Challenge', item_desc: 'Sees challenges as opportunities for growth', item_score: 82 },
  { item_id: 2, item_title: 'Commitment', item_desc: 'Deeply involved and persistent in goal pursuit', item_score: 75 },
  { item_id: 3, item_title: 'Control', item_desc: 'Believes in ability to influence outcomes', item_score: 68 },
  { item_id: 4, item_title: 'Confidence', item_desc: 'Self-belief and ability to handle setbacks', item_score: 70 },
]

const MOCK_KEYWORDS_MOST = [
  'Creative', 'Energetic', 'Collaborative', 'Strategic', 'Empathetic',
  'Resilient', 'Visionary', 'Adaptable',
]

const MOCK_KEYWORDS_LEAST = [
  'Rigid', 'Cautious', 'Detail-obsessed', 'Reserved',
]

const MOCK_TOP_BEHAVIOURS: Record<string, string> = {
  '88': 'Initiating — Takes decisive action and drives momentum',
  '85': 'Evaluating — Critically assesses information for quality',
  '78': 'Delivering — Ensures consistent, reliable output',
}

function createMockAssessment(status: AssessmentStatus): PrismAssessment {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 86400000)
  const twoDaysAgo = new Date(now.getTime() - 172800000)

  return {
    id: `mock-${status}-${Math.random().toString(36).slice(2, 8)}`,
    userId: 'user-123',
    externalIdent: 'IG-USR-001',
    parentExternalIdent: 'IG-ORG-001',
    questionnaireType: QUEST_TYPE.PROFESSIONAL,
    questionnaireTypeName: 'Professional',
    status,
    questionnaireUrl: status === 'initiated' || status === 'sent'
      ? 'https://staging.prismbrainmapping.com/questionnaire/example'
      : null,
    reportUrl: status === 'report_ready' || status === 'ingested'
      ? 'https://example.com/report.pdf'
      : null,
    s3ReportKey: status === 'report_ready' || status === 'ingested'
      ? 'user-123/assessment-456/report.pdf'
      : null,
    s3DataKey: null,
    initiatedAt: twoDaysAgo.toISOString(),
    questionnaireSentAt: twoDaysAgo.toISOString(),
    questionnaireStartedAt: status !== 'initiated' && status !== 'sent'
      ? dayAgo.toISOString()
      : null,
    questionnaireCompletedAt:
      status === 'completed' || status === 'unlocked' || status === 'report_ready' || status === 'ingested'
        ? dayAgo.toISOString()
        : null,
    unlockedAt:
      status === 'unlocked' || status === 'report_ready' || status === 'ingested'
        ? now.toISOString()
        : null,
    reportFetchedAt:
      status === 'report_ready' || status === 'ingested'
        ? now.toISOString()
        : null,
    ingestedAt: status === 'ingested' ? now.toISOString() : null,
    createdAt: twoDaysAgo.toISOString(),
    updatedAt: now.toISOString(),
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function PrismTestHarness() {
  const [selectedStatus, setSelectedStatus] = useState<AssessmentStatus>('initiated')

  const allStatuses = Object.keys(STATUS_CONFIG) as AssessmentStatus[]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-start">
                <img
                  src="/images/logo-dark.png"
                  alt="Inspire Genius"
                  className="h-10 dark:invert"
                />
                <span className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">
                  Powered by PRISM Brain Mapping
                </span>
              </div>
              <div className="hidden sm:block h-10 w-px bg-border" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">PRISM Integration — Test Harness</h1>
                <p className="text-xs text-muted-foreground">
                  Visual testing of all PRISM components with mock data
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              DEV ONLY
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <Tabs defaultValue="request-form">
          <TabsList className="mb-6">
            <TabsTrigger value="request-form">Request Form</TabsTrigger>
            <TabsTrigger value="charts">Charts &amp; Visualizations</TabsTrigger>
            <TabsTrigger value="cards">Assessment Cards</TabsTrigger>
            <TabsTrigger value="badges">Status Badges</TabsTrigger>
            <TabsTrigger value="report">Full Report View</TabsTrigger>
          </TabsList>

          {/* ── Request Form ── */}
          <TabsContent value="request-form" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PrismInitiateForm
                  showPayloadPreview
                  onSubmit={(values, payload) => {
                    console.log('Form submitted:', values)
                    console.log('API payload:', payload)
                  }}
                />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      How This Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      This form collects all fields needed to call the PRISM{' '}
                      <code className="rounded bg-muted px-1 text-xs">
                        CreateCandidate
                      </code>{' '}
                      API endpoint.
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        Flow:
                      </p>
                      <ol className="list-inside list-decimal space-y-1 text-xs">
                        <li>User fills in this form</li>
                        <li>
                          IG backend calls PRISM{' '}
                          <code className="rounded bg-muted px-1">
                            CreateCandidate
                          </code>
                        </li>
                        <li>PRISM returns a questionnaire URL</li>
                        <li>User opens the URL to complete the questionnaire</li>
                        <li>
                          IG backend polls{' '}
                          <code className="rounded bg-muted px-1">
                            FetchCandidateHistory
                          </code>{' '}
                          for completion
                        </li>
                        <li>
                          On completion, calls{' '}
                          <code className="rounded bg-muted px-1">
                            UnlockReport
                          </code>{' '}
                          to pay &amp; retrieve
                        </li>
                        <li>Report stored in S3, ingested into IG</li>
                      </ol>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        PRISM API Fields:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        <li>
                          <strong>SiteID / ClientID</strong> — injected by
                          backend (never exposed to frontend)
                        </li>
                        <li>
                          <strong>ExternalIdent</strong> — auto-generated from
                          IG user ID
                        </li>
                        <li>
                          <strong>ParentExternalIdent</strong> — from user's
                          organisation ID
                        </li>
                        <li>
                          <strong>CreateUser</strong> — creates a PRISM login
                          (first time only)
                        </li>
                        <li>
                          <strong>IsGift</strong> — skips payment step, report
                          available immediately
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Questionnaire Tiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                        <div>
                          <p className="font-medium">Foundation</p>
                          <p className="text-xs text-muted-foreground">
                            4D quadrant profile
                          </p>
                        </div>
                        <Badge variant="outline">ID: 4</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                        <div>
                          <p className="font-medium">Personal</p>
                          <p className="text-xs text-muted-foreground">
                            + 8D behaviours, work environment
                          </p>
                        </div>
                        <Badge variant="outline">ID: 21</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                        <div>
                          <p className="font-medium">Professional</p>
                          <p className="text-xs text-muted-foreground">
                            + Big 5, EQ, Mental Toughness, Career
                          </p>
                        </div>
                        <Badge variant="outline">ID: 1</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Reports can be upgraded from lower to higher tiers
                      via the UpgradeReport API
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Charts & Visualizations ── */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 4D Quadrants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">4D Quadrant Chart</CardTitle>
                  <CardDescription>
                    Green, Blue, Red, Gold colour dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismQuadrantChart quadrants={MOCK_QUADRANTS} />
                </CardContent>
              </Card>

              {/* 8D Behaviours */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">8D Behaviour Chart</CardTitle>
                  <CardDescription>
                    Innovating through Evaluating
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismBehaviourChart behaviours={MOCK_BEHAVIOURS} />
                </CardContent>
              </Card>

              {/* Work Environment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Environment</CardTitle>
                  <CardDescription>
                    Enhanced / Neutral / Inhibited grouping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismWorkEnvironment data={MOCK_WORK_ENV} />
                </CardContent>
              </Card>

              {/* Work Aptitude */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Aptitude</CardTitle>
                  <CardDescription>
                    Personal vs. occupation comparison bars
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismWorkAptitude data={MOCK_WORK_APT} />
                </CardContent>
              </Card>

              {/* Big Five */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Big Five Personality</CardTitle>
                  <CardDescription>OCEAN model scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismBigFiveChart data={MOCK_BIG_FIVE} />
                </CardContent>
              </Card>

              {/* Emotional Intelligence */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emotional Intelligence</CardTitle>
                  <CardDescription>EQ dimension scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismEQChart data={MOCK_EQ} />
                </CardContent>
              </Card>

              {/* Mental Toughness */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Mental Toughness</CardTitle>
                  <CardDescription>4C model with descriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrismMentalToughness data={MOCK_MT} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Assessment Cards ── */}
          <TabsContent value="cards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Assessment Card — Status Selector
                </CardTitle>
                <CardDescription>
                  Pick a status to see how the card looks at each lifecycle stage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as AssessmentStatus)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <PrismAssessmentCard
                  assessment={createMockAssessment(selectedStatus)}
                  onViewReport={(id) => alert(`View report: ${id}`)}
                  onUpgrade={(id) => alert(`Upgrade: ${id}`)}
                />
              </CardContent>
            </Card>

            {/* All statuses side by side */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Statuses</CardTitle>
                <CardDescription>
                  Every lifecycle stage rendered simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {allStatuses.map((status) => (
                    <PrismAssessmentCard
                      key={status}
                      assessment={createMockAssessment(status)}
                      onViewReport={(id) => alert(`View report: ${id}`)}
                      onUpgrade={(id) => alert(`Upgrade: ${id}`)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Status Badges ── */}
          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Status Badges</CardTitle>
                <CardDescription>
                  Badge variants for each assessment lifecycle status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {allStatuses.map((status) => (
                    <div
                      key={status}
                      className="flex flex-col items-center gap-1"
                    >
                      <PrismStatusBadge status={status} />
                      <span className="text-xs text-muted-foreground">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  <h3 className="text-sm font-medium">Questionnaire Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(QUEST_TYPE_NAMES).map(([id, name]) => (
                      <Badge key={id} variant="secondary">
                        {name} (ID: {id})
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <h3 className="text-sm font-medium">Quadrant Colours</h3>
                  <div className="flex gap-3">
                    {Object.entries(QUADRANT_CONFIG).map(([id, config]) => (
                      <div key={id} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <h3 className="text-sm font-medium">Behaviour Colours</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(BEHAVIOUR_CONFIG).map(([id, config]) => (
                      <div key={id} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Full Report View ── */}
          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PRISM Report — Mock Preview</CardTitle>
                <CardDescription>
                  Simulates the full report viewer with all tabs populated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="behaviours">Behaviours</TabsTrigger>
                    <TabsTrigger value="work">Work Profile</TabsTrigger>
                    <TabsTrigger value="personality">Personality</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <PrismQuadrantChart quadrants={MOCK_QUADRANTS} />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Analysis
                      </h3>
                      <p className="text-sm leading-relaxed">
                        This individual demonstrates a strong Gold preference,
                        indicating a natural inclination towards structure,
                        reliability, and systematic thinking. The secondary Green
                        dimension suggests strong people-orientation and
                        collaborative tendencies. The balanced Red and Blue
                        scores indicate comfort with both analytical and
                        action-oriented tasks, though neither dominates the
                        profile. This combination creates a versatile individual
                        who can bridge strategic thinking with practical
                        execution.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-700">
                          Strengths
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {MOCK_KEYWORDS_MOST.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-amber-700">
                          Areas to Develop
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {MOCK_KEYWORDS_LEAST.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="behaviours" className="space-y-6">
                    <PrismBehaviourChart behaviours={MOCK_BEHAVIOURS} />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Top Behaviours
                      </h3>
                      <div className="space-y-1">
                        {Object.entries(MOCK_TOP_BEHAVIOURS).map(
                          ([score, desc], i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
                            >
                              <span>{desc}</span>
                              <span className="font-medium">{score}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="work" className="space-y-6">
                    <PrismWorkAptitude data={MOCK_WORK_APT} />
                    <PrismWorkEnvironment data={MOCK_WORK_ENV} />
                  </TabsContent>

                  <TabsContent value="personality" className="space-y-6">
                    <PrismBigFiveChart data={MOCK_BIG_FIVE} />
                    <PrismEQChart data={MOCK_EQ} />
                    <PrismMentalToughness data={MOCK_MT} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
