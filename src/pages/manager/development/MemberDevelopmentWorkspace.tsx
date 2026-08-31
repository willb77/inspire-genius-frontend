/**
 * Member Development Workspace (route: /manager/development/:memberId).
 *
 * Persistent header (identity, reconciled headline, confidence, coverage strip
 * with inline invite, actions), six tabs synced to the `?tab=` query param and
 * lazy-loaded, plus the member-scoped Meridian assistant panel. Loading /
 * degraded / error handled at the shell.
 */
import { Suspense, lazy, useMemo, type ReactNode } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Download, MessageSquare, RefreshCw, Share2 } from "lucide-react"
import ManagerLayout from "@/layouts/ManagerLayout"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { exportDossierPdf } from "@/lib/dossierPdf"
import { ROUTES } from "@/constants/routes"
import {
  CONFIDENCE_BADGE_VARIANT,
  CONFIDENCE_LABEL,
} from "@/constants/development"
import type { CareerMatch } from "@/types/development"
import {
  useMemberDossier,
  useRefreshDossier,
  useGoalSession,
  useSharePlan,
  useDevelopmentText,
} from "@/hooks/manager/development"
import { CoverageChips } from "@/components/manager/development/CoverageChips"
import { ConfidenceDot } from "@/components/manager/development/ConfidenceDot"
import { MeridianDevelopmentPanel } from "@/components/manager/development/MeridianDevelopmentPanel"
import {
  DevSkinProvider,
  DevPageFrame,
  getDevSkin,
  resolveDevV2,
  type DevVariant,
} from "@/components/manager/development/skin"

// Lazy-loaded tab panels
const BehavioralProfilePanel = lazy(() =>
  import("@/components/manager/development/tabs/BehavioralProfilePanel").then((m) => ({ default: m.BehavioralProfilePanel })),
)
const GoalsPanel = lazy(() =>
  import("@/components/manager/development/tabs/GoalsPanel").then((m) => ({ default: m.GoalsPanel })),
)
const GapAnalysisPanel = lazy(() =>
  import("@/components/manager/development/tabs/GapAnalysisPanel").then((m) => ({ default: m.GapAnalysisPanel })),
)
const LearningPlanPanel = lazy(() =>
  import("@/components/manager/development/tabs/LearningPlanPanel").then((m) => ({ default: m.LearningPlanPanel })),
)
const CareerMatchPanel = lazy(() =>
  import("@/components/manager/development/tabs/CareerMatchPanel").then((m) => ({ default: m.CareerMatchPanel })),
)
const RoadmapTimeline = lazy(() =>
  import("@/components/manager/development/tabs/RoadmapTimeline").then((m) => ({ default: m.RoadmapTimeline })),
)

const TABS = [
  { value: "profile", labelKey: "dev.tab.profile" },
  { value: "goals", labelKey: "dev.tab.goals" },
  { value: "gaps", labelKey: "dev.tab.gaps" },
  { value: "learning", labelKey: "dev.tab.learning" },
  { value: "careers", labelKey: "dev.tab.careers" },
  { value: "roadmap", labelKey: "dev.tab.roadmap" },
] as const

type DevTab = (typeof TABS)[number]["value"]

function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

function TabFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

/** See {@link DevelopmentStudio} for why `audience` exists — the back-link must
 *  not point a practitioner at a /manager path they cannot reach. */
export default function MemberDevelopmentWorkspace({
  variant,
  audience = "manager",
}: {
  variant?: DevVariant
  audience?: "manager" | "practitioner"
}) {
  const Layout = audience === "practitioner" ? PractitionerLayout : ManagerLayout
  const studioRoute =
    audience === "practitioner"
      ? ROUTES.PRACTITIONER.DEVELOPMENT
      : ROUTES.MANAGER.DEVELOPMENT
  const v2 = resolveDevV2(variant)
  const sk = getDevSkin(v2)
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()
  const { t } = useDevelopmentText()
  const [searchParams, setSearchParams] = useSearchParams()

  // Standard manager chrome + (flag-gated) HomeV2 cream frame around whichever
  // shell state we return below.
  const frame = (node: ReactNode) => (
    <Layout>
      <DevSkinProvider v2={v2}>
        <DevPageFrame>{node}</DevPageFrame>
      </DevSkinProvider>
    </Layout>
  )

  const tabParam = (searchParams.get("tab") as DevTab | null) ?? "profile"
  const activeTab: DevTab = TABS.some((x) => x.value === tabParam) ? tabParam : "profile"

  const { data: dossier, isLoading, isError } = useMemberDossier(memberId)
  const refresh = useRefreshDossier(memberId)
  const share = useSharePlan(memberId)
  const session = useGoalSession(memberId)

  const { internal, external } = useMemo(() => {
    const matches = dossier?.matches ?? []
    return {
      internal: matches.filter((m) => m.kind === "internal"),
      external: matches.filter((m) => m.kind === "external"),
    }
  }, [dossier?.matches])

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  const goToGapsFor = (match: CareerMatch) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", "gaps")
    if (match.blueprintId) next.set("target", match.blueprintId)
    setSearchParams(next, { replace: true })
  }

  const targetFromQuery = searchParams.get("target") ?? undefined

  // --- Shell states ---
  if (isLoading) {
    return frame(
      <div className="space-y-4">
        <Skeleton className={cn("h-24 w-full", sk.radius)} />
        <Skeleton className={cn("h-96 w-full", sk.radius)} />
      </div>,
    )
  }

  // Async compute in flight: the dossier orchestrates ~6 agents (~60s), so the
  // backend returns 202 while the job runs and useMemberDossier polls. `null`
  // = computing (distinct from `undefined`/error below).
  if (dossier === null) {
    return frame(
      <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
        <RefreshCw className={cn("h-6 w-6 animate-spin", sk.text400)} aria-hidden="true" />
        <p className={cn("text-sm", sk.text500)}>
          Generating the development dossier — this can take up to a minute…
        </p>
      </div>,
    )
  }

  if (isError || !dossier) {
    return frame(
      <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
        <p className={cn("text-sm", sk.text500)}>{isError ? t("dev.workspace.error") : t("dev.workspace.notFound")}</p>
        <Button variant="outline" onClick={() => navigate(studioRoute)}>
          Back to roster
        </Button>
      </div>,
    )
  }

  const { member, reconciledHeadline, overallConfidence, coverage } = {
    member: dossier.member,
    reconciledHeadline: dossier.reconciledHeadline,
    overallConfidence: dossier.overallConfidence,
    coverage: dossier.profile.coverage,
  }

  const handleInvite = () => session.mutate("invite")

  return frame(
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(studioRoute)}
        className={cn("inline-flex items-center gap-1 text-xs hover:text-slate-800", sk.text500)}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to roster
      </button>

      {/* Persistent header */}
      <header className={cn("border bg-white p-4", sk.radius, sk.border200)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
              <AvatarFallback className={cn("bg-gradient-to-br font-bold text-white", sk.avatarGradient)}>
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className={cn("text-lg font-semibold", sk.heading)}>{member.name}</h1>
                <Badge variant={CONFIDENCE_BADGE_VARIANT[overallConfidence]}>
                  {CONFIDENCE_LABEL[overallConfidence]}
                </Badge>
              </div>
              <p className={cn("text-xs", sk.text500)}>
                {member.title ?? "—"}
                {member.department ? ` · ${member.department}` : ""}
              </p>
              <div className="mt-1.5 flex items-start gap-1.5">
                <ConfidenceDot level={overallConfidence} className="mt-1" />
                <p className={cn("text-sm", sk.text700)}>{reconciledHeadline}</p>
              </div>
              <div className="mt-2">
                <CoverageChips coverage={coverage} showDates onInvite={handleInvite} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dossier.events && dossier.events.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Provenance
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className={cn("text-xs font-semibold", sk.text700)}>Interpretation provenance</div>
                  <p className={cn("mt-0.5 text-[11px]", sk.text400)}>Which agent produced what, confidence, and any discrepancies.</p>
                  <ul className="mt-2 space-y-2">
                    {dossier.events.map((ev, i) => (
                      <li key={i} className={cn("rounded-md border p-2 text-xs", sk.border100)}>
                        <div className="flex items-center justify-between">
                          <span className={cn("font-medium", sk.text700)}>{ev.agent}</span>
                          {ev.confidence ? (
                            <Badge variant={CONFIDENCE_BADGE_VARIANT[ev.confidence]} className="text-[10px]">
                              {CONFIDENCE_LABEL[ev.confidence]}
                            </Badge>
                          ) : null}
                        </div>
                        <div className={sk.text500}>{ev.eventType}</div>
                        {ev.discrepancies && ev.discrepancies.length > 0 ? (
                          <ul className="mt-1 list-inside list-disc text-[11px] text-amber-600">
                            {ev.discrepancies.map((d, j) => (
                              <li key={j}>{d}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw className={refresh.isPending ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"} aria-hidden="true" />
              {t("dev.workspace.refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                share.mutate(
                  {},
                  {
                    onSuccess: () =>
                      toast.success(`Development plan shared with ${member.name || "the member"}.`),
                    onError: () => toast.error("Couldn't share the plan. Try again."),
                  },
                )
              }
              disabled={share.isPending}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("dev.workspace.share")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  exportDossierPdf(dossier)
                  toast.success("Dossier exported as PDF.")
                } catch {
                  toast.error("Couldn't generate the PDF.")
                }
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("dev.workspace.export")}
            </Button>
            <Button size="sm" onClick={() => setTab("goals")}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("dev.workspace.startConversation")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main + assistant */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="flex w-full flex-wrap justify-start">
            {TABS.map((tabDef) => (
              <TabsTrigger key={tabDef.value} value={tabDef.value}>
                {t(tabDef.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <TabsContent value="profile">
                <BehavioralProfilePanel profile={dossier.profile} onInvite={() => handleInvite()} />
              </TabsContent>
              <TabsContent value="goals">
                <GoalsPanel memberId={dossier.memberId} />
              </TabsContent>
              <TabsContent value="gaps">
                <GapAnalysisPanel memberId={dossier.memberId} matches={dossier.matches} initialTargetId={targetFromQuery} />
              </TabsContent>
              <TabsContent value="learning">
                <LearningPlanPanel learning={dossier.learning} gaps={dossier.gaps} goals={dossier.goals} />
              </TabsContent>
              <TabsContent value="careers">
                <CareerMatchPanel
                  internal={internal}
                  external={external}
                  onSetTarget={goToGapsFor}
                  onViewGaps={goToGapsFor}
                />
              </TabsContent>
              <TabsContent value="roadmap">
                <RoadmapTimeline
                  memberId={dossier.memberId}
                  milestones={dossier.milestones}
                  goals={dossier.goals}
                  trajectory={dossier.trajectory}
                />
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>

        {/* Member-scoped Meridian assistant (in-page right rail; AppShell's own
            RightPanel is fixed and not prop-injectable). */}
        <aside className="hidden xl:block">
          <div className="sticky top-[calc(var(--spacing-header-h)+1rem)] h-[calc(100vh-var(--spacing-header-h)-2rem)]">
            <MeridianDevelopmentPanel
              memberId={dossier.memberId}
              memberName={member.name}
              tab={activeTab}
              goals={dossier.goals}
              gaps={dossier.gaps}
            />
          </div>
        </aside>
      </div>
    </div>,
  )
}
