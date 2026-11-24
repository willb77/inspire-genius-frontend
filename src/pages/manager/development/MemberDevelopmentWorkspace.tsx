/**
 * Member Development Workspace (route: /manager/development/:memberId).
 *
 * Persistent header (identity, reconciled headline, confidence, coverage strip,
 * actions), then five GROUPS of sections (seven with the Studio flag on, until
 * U5 moves Compare and Scenarios), plus the member-scoped Meridian assistant
 * panel. `?tab=` still carries one of the eleven SECTION values it always did;
 * the group shown is derived from it (see SECTIONS). Panels are lazy-loaded.
 * Loading / degraded / error handled at the shell.
 */
import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react"
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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { requestStudentAccess } from "@/services/manager/studentRoster.service"
import { cn } from "@/lib/utils"
import { exportDossierPdf } from "@/lib/dossierPdf"
import { ROUTES } from "@/constants/routes"
import {
  CONFIDENCE_BADGE_VARIANT,
  CONFIDENCE_LABEL,
  DEV_TEXT,
  FIT_ENGINE_MATCHES_ENABLED,
  TDS_STUDIO_ENABLED,
} from "@/constants/development"
import type { CareerMatch, RosterMember } from "@/types/development"
import { developmentKeys } from "@/hooks/manager/development/queryKeys"
import { DossierJobFailedError } from "@/hooks/manager/development/useMemberDossier"
import {
  useMemberDossier,
  useMemberFitMatches,
  useRefreshDossier,
  useSharePlan,
  useDevelopmentText,
} from "@/hooks/manager/development"
import { CoverageChips } from "@/components/manager/development/CoverageChips"
import { sharePlanToast, SHARE_PLAN_ERROR } from "@/components/manager/development/sharePlanToast"
import { ConfidenceDot } from "@/components/manager/development/ConfidenceDot"
import { MeridianDevelopmentPanel } from "@/components/manager/development/MeridianDevelopmentPanel"
import {
  DevSkinProvider,
  DevPageFrame,
  getDevSkin,
  resolveDevV2,
  type DevVariant,
} from "@/components/manager/development/skin"
import { useTranslation } from "react-i18next"

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
const FitEngineMatchPanel = lazy(() =>
  import("@/components/manager/development/tabs/FitEngineMatchPanel").then((m) => ({ default: m.FitEngineMatchPanel })),
)
const CareerMatchPanel = lazy(() =>
  import("@/components/manager/development/tabs/CareerMatchPanel").then((m) => ({ default: m.CareerMatchPanel })),
)
const RoadmapTimeline = lazy(() =>
  import("@/components/manager/development/tabs/RoadmapTimeline").then((m) => ({ default: m.RoadmapTimeline })),
)
const NotesPanel = lazy(() =>
  import("@/components/manager/development/tabs/NotesPanel").then((m) => ({ default: m.NotesPanel })),
)

// TDS Studio tabs — the PRISM narrative surfaces shared with the super-admin
// Character Lab. Lazy like the rest: each pulls in the shared studio panels,
// and a manager who never opens them should not download them.
const ProfileStudioPanel = lazy(() =>
  import("@/components/manager/development/tabs/ProfileStudioPanel").then((m) => ({ default: m.ProfileStudioPanel })),
)
const TeamComparePanel = lazy(() =>
  import("@/components/manager/development/tabs/TeamComparePanel").then((m) => ({ default: m.TeamComparePanel })),
)
const InterviewsPanel = lazy(() =>
  import("@/components/manager/development/tabs/InterviewsPanel").then((m) => ({ default: m.InterviewsPanel })),
)
const TeamScenarioPanel = lazy(() =>
  import("@/components/manager/development/tabs/TeamScenarioPanel").then((m) => ({ default: m.TeamScenarioPanel })),
)

/**
 * The eleven values `?tab=` can carry. Each names one SECTION of the page.
 *
 * Spelled out rather than derived from the table below, because this is also
 * the union the Meridian rail accepts as `tab`: its prompt table is indexed by
 * these eleven and is not defaulted, so any other value throws on render.
 * Group ids (`DevGroup`) share no member with it, which is what lets the
 * compiler refuse a group id handed to the rail.
 */
type DevSection =
  | "profile"
  | "profile-studio"
  | "goals"
  | "roadmap"
  | "gaps"
  | "learning"
  | "careers"
  | "notes"
  | "interviews"
  | "compare"
  | "scenarios"

/** What the tab bar shows. Never written to `?tab=`, never sent to the rail. */
type DevGroup =
  | "group-profile"
  | "group-goals-roadmap"
  | "group-gaps-learning"
  | "group-careers"
  | "group-conversations"
  | "group-compare"
  | "group-scenarios"

type SectionDef = {
  value: DevSection
  group: DevGroup
  /** The section heading: the `dev.tab.*` label this section had as a tab. */
  labelKey: string
  /** Behind `VITE_FEATURE_TDS_STUDIO` (default OFF). */
  studioOnly?: true
  /** Makes its own call and needs only the member's id and name. */
  worksWhileComputing?: true
}

/**
 * U4 — section → group. THE table: the tab bar, the order of sections inside
 * a group, what a group's tab writes to `?tab=`, the `?tab=` fallback and the
 * computing view are all derived from it. Nothing else lists the sections.
 *
 * Row order is render order inside a group, and a group's first row is what
 * its tab opens. Profile's first row is the Behavioral Profile — the PRISM
 * radar and its score table — so the Profile group opens with them, above the
 * write-up. The first row of the whole table is the fallback section.
 *
 * `studioOnly` rows are the three TDS Studio surfaces. The flag only decides
 * what the browser offers, and a `?tab=` value not on offer falls back to the
 * profile. That is a UI gate, NOT a security boundary: `ProtectedRoute` admits
 * anyone with the manager role to `/manager/development/:memberId` by path
 * prefix regardless of this constant, and `/v1/agents/team-studio/*` answers
 * any request with a valid token no matter what the browser was built with.
 * The server-side authorization on those routes is the real gate. See
 * TDS_STUDIO_ENABLED.
 *
 * `worksWhileComputing` (TDS-P1 c): Goals (`/members/{id}/goals`), Notes
 * (`/members/{id}/notes`; its "link to" pickers are empty until the dossier
 * arrives) and the two Studio runs. Every other section, and the Meridian
 * rail, reads dossier fields and waits.
 */
const SECTIONS: readonly SectionDef[] = [
  { value: "profile", group: "group-profile", labelKey: "dev.tab.profile" },
  { value: "profile-studio", group: "group-profile", labelKey: "dev.tab.profileStudio", studioOnly: true },
  { value: "goals", group: "group-goals-roadmap", labelKey: "dev.tab.goals", worksWhileComputing: true },
  { value: "roadmap", group: "group-goals-roadmap", labelKey: "dev.tab.roadmap" },
  { value: "gaps", group: "group-gaps-learning", labelKey: "dev.tab.gaps" },
  { value: "learning", group: "group-gaps-learning", labelKey: "dev.tab.learning" },
  { value: "careers", group: "group-careers", labelKey: "dev.tab.careers" },
  // TDS-2. Its store (growth-service `/members/{id}/notes`) is built and
  // merged, so Notes is not behind TDS_STUDIO_ENABLED — which is off by
  // default and would ship it hidden.
  { value: "notes", group: "group-conversations", labelKey: "dev.tab.notes", worksWhileComputing: true },
  { value: "interviews", group: "group-conversations", labelKey: "dev.tab.interviews" },
  // Their own tabs until U5 moves them to the Team view.
  { value: "compare", group: "group-compare", labelKey: "dev.tab.compare", studioOnly: true, worksWhileComputing: true },
  { value: "scenarios", group: "group-scenarios", labelKey: "dev.tab.scenarios", studioOnly: true, worksWhileComputing: true },
]

type GroupDef = {
  value: DevGroup
  /** `dev.group.*` for the five groups; the section's own label for the two
   *  that are still a single Studio tab. */
  labelKey: string
  /** One section and no heading: the tab's label already names it. */
  standalone?: true
}

/** Tab-bar order. A group with no section on offer is not shown. */
const GROUPS: readonly GroupDef[] = [
  { value: "group-profile", labelKey: "dev.group.profile" },
  { value: "group-goals-roadmap", labelKey: "dev.group.goalsRoadmap" },
  { value: "group-gaps-learning", labelKey: "dev.group.gapsLearning" },
  { value: "group-careers", labelKey: "dev.group.careers" },
  { value: "group-conversations", labelKey: "dev.group.conversations" },
  { value: "group-compare", labelKey: "dev.tab.compare", standalone: true },
  { value: "group-scenarios", labelKey: "dev.tab.scenarios", standalone: true },
]

const OFFERED_SECTIONS = SECTIONS.filter((s) => !s.studioOnly || TDS_STUDIO_ENABLED)
const OFFERED_GROUPS = GROUPS.filter((g) => OFFERED_SECTIONS.some((s) => s.group === g.value))
/** While the dossier computes: the groups with at least one section that works now. */
const COMPUTING_GROUPS = OFFERED_GROUPS.filter((g) =>
  OFFERED_SECTIONS.some((s) => s.group === g.value && s.worksWhileComputing),
)
const FALLBACK_SECTION = SECTIONS[0]

function sectionsOf(group: DevGroup): readonly SectionDef[] {
  return OFFERED_SECTIONS.filter((s) => s.group === group)
}

/** Stable element id for a section: what a legacy `?tab=` value scrolls to. */
function sectionDomId(value: DevSection): string {
  return `dev-section-${value}`
}

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
  const { t: tm } = useTranslation("managerPages")
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

  const tabParam = searchParams.get("tab")
  // `?tab=` names a SECTION. A value that is not on offer — including a Studio
  // section while the flag is off — falls back to the profile rather than
  // rendering an empty panel that reads like a tab with nothing in it.
  const activeDef = OFFERED_SECTIONS.find((x) => x.value === tabParam) ?? FALLBACK_SECTION
  const activeSection: DevSection = activeDef.value
  const activeGroup: DevGroup = activeDef.group
  // A group's first section sits at the top of the group, so opening it needs
  // no scroll; any other section is scrolled to (below).
  const opensAtTop = sectionsOf(activeGroup)[0]?.value === activeSection

  const { data: dossier, isLoading, isError, error: dossierError, refetch: refetchDossier } = useMemberDossier(memberId)
  // TDS-P1 (c): the name for the computing header, from the roster the manager
  // came from. Read from the cache only — never a fetch of its own.
  const queryClient = useQueryClient()
  const cachedName = queryClient
    .getQueryData<RosterMember[]>(developmentKeys.roster())
    ?.find((m) => m.memberId === memberId)?.name
  const refresh = useRefreshDossier(memberId)
  const share = useSharePlan(memberId)
  // 3.3a. Fires only when FIT_ENGINE_MATCHES_ENABLED — off by default, so a
  // tier whose growth-service has no /fit-matches route is never asked.
  const fitMatches = useMemberFitMatches(memberId, FIT_ENGINE_MATCHES_ENABLED)
  // TDS-1b. Reuses Member Oversight's existing ask — POST
  // /v1/agents/consent/visibility/request — rather than inventing a second
  // way to request the same grant. Asking grants nothing; the member decides.
  const requestPrism = useMutation({
    mutationFn: () =>
      requestStudentAccess({
        studentUserId: memberId ?? "",
        categories: { prism: true },
        reason: "Requested from the Team Development Studio.",
      }),
    onSuccess: () => toast.success(tm("memberDevelopmentWorkspace.askedTheyDecideAndDeclining", { defaultValue: "Asked. They decide, and declining costs them nothing." })),
    // TDS-1c part B. This mutation shipped with onSuccess ALONE, so a failed ask
    // was silent: the manager clicked, the request never opened, and nothing on
    // screen changed. That is not a hypothetical path — `ux_svg_live_pair` is
    // UNIQUE (student, grantee) WHERE status IN ('pending','granted'), and
    // request_access INSERTs a new pending row, so ANY live grant for the pair
    // rejects the ask. Measured 2026-09-16: 8 of 8 live grants on staging-b and
    // 7 of 7 on dev are goals-without-prism, i.e. every existing pair fails.
    // The 409 is the normal path here, not the exception.
    //
    // The server owns the words: its `detail` is written as primary copy, so
    // this renders it verbatim rather than paraphrasing a reason it cannot see.
    // Depending on `detail` ALONE — not on `code`/`live`/`asked` — keeps this
    // half working if the rest of that body changes.
    //
    // apiErrorMessage, not `err.response.data.detail`: FastAPI sends `detail` as
    // a STRING for a raised HTTPException and an ARRAY of objects for a 422.
    // Four call sites once passed that array straight to a toast, which handed
    // React an object as a child and took the page down (see the file's header).
    onError: (err) =>
      toast.error(
        apiErrorMessage(err, tm("memberDevelopmentWorkspace.thatDidnTSendNothing", { defaultValue: "That didn't send — nothing was asked. Try again in a moment." })),
      ),
  })

  const { internal, external } = useMemo(() => {
    const matches = dossier?.matches ?? []
    return {
      internal: matches.filter((m) => m.kind === "internal"),
      external: matches.filter((m) => m.kind === "external"),
    }
  }, [dossier?.matches])

  const setTab = (value: DevSection) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  // The tab bar shows groups, but the URL keeps naming a section: clicking a
  // group writes that group's FIRST section, so every link the page produces
  // is still one of the eleven values an older build reads.
  const openGroup = (group: string) => {
    const first = OFFERED_SECTIONS.find((x) => x.group === group)
    if (first) setTab(first.value)
  }

  const goToGapsFor = (match: CareerMatch) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", "gaps")
    if (match.blueprintId) next.set("target", match.blueprintId)
    setSearchParams(next, { replace: true })
  }

  const targetFromQuery = searchParams.get("target") ?? undefined

  // TDS-4b. Bumped by "Start growth conversation"; the Meridian rail sends ONE
  // opening turn per new value. A counter, not a boolean: a manager may start a
  // second conversation in the same session, and a boolean already true cannot
  // say "again".
  const [conversationSeed, setConversationSeed] = useState(0)

  // A legacy link (`?tab=roadmap`, `?tab=interviews`, …) opens its group and
  // lands on its section. Keyed on the view as well as the section, so a link
  // followed while the dossier computes is honoured again when it lands. No
  // scroll tracking the other way: `?tab=` is the section last opened or
  // clicked, and the rail's prompts must not change under a reader who scrolls.
  const view = isLoading ? "loading" : dossier === null ? "computing" : dossier ? "ready" : "none"
  useEffect(() => {
    if (opensAtTop || (view !== "ready" && view !== "computing")) return
    const el = document.getElementById(sectionDomId(activeSection))
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" })
  }, [activeSection, opensAtTop, view])

  // Group labels. A server `/v1/frontend-text` override of the `dev.group.*`
  // key wins, as for every `dev.*` string; otherwise the locale file; the
  // DEV_TEXT English is what both fall back to. Static keys on purpose.
  const groupLocal: Partial<Record<DevGroup, string>> = {
    "group-profile": tm("memberDevelopmentWorkspace.groupProfile", { defaultValue: "Profile" }),
    "group-goals-roadmap": tm("memberDevelopmentWorkspace.groupGoalsRoadmap", { defaultValue: "Goals & Roadmap" }),
    "group-gaps-learning": tm("memberDevelopmentWorkspace.groupGapsLearning", { defaultValue: "Gaps & Learning" }),
    "group-careers": tm("memberDevelopmentWorkspace.groupCareers", { defaultValue: "Career matches" }),
    "group-conversations": tm("memberDevelopmentWorkspace.groupConversations", { defaultValue: "Conversations" }),
  }
  const groupLabel = (group: GroupDef): string => {
    const resolved = t(group.labelKey)
    const local = groupLocal[group.value]
    return local !== undefined && resolved === DEV_TEXT[group.labelKey] ? local : resolved
  }

  const groupTabs = (groups: readonly GroupDef[]) => (
    <TabsList className="flex w-full flex-wrap justify-start">
      {groups.map((group) => (
        <TabsTrigger key={group.value} value={group.value}>
          {groupLabel(group)}
        </TabsTrigger>
      ))}
    </TabsList>
  )

  // One group's content: its sections in table order, each under its old tab
  // name with a stable element id. `panelFor` returning nothing means the
  // section cannot render yet (the computing view) and says so in place.
  const groupContent = (group: GroupDef, panelFor: (def: SectionDef) => ReactNode) => (
    <TabsContent key={group.value} value={group.value} className="space-y-8">
      {sectionsOf(group.value).map((def) => {
        const panel = panelFor(def)
        const body = panel ? (
          <Suspense fallback={<TabFallback />}>{panel}</Suspense>
        ) : (
          <p data-testid={`${sectionDomId(def.value)}-waiting`} className={cn("text-sm", sk.text500)}>
            {tm("memberDevelopmentWorkspace.thisTabNeedsTheDossier", { defaultValue: "This tab needs the dossier. Open Goals or Notes while it's generated." })}
          </p>
        )
        if (group.standalone) {
          return (
            <div key={def.value} id={sectionDomId(def.value)} data-testid={sectionDomId(def.value)}>
              {body}
            </div>
          )
        }
        const headingId = `${sectionDomId(def.value)}-heading`
        return (
          <section
            key={def.value}
            id={sectionDomId(def.value)}
            data-testid={sectionDomId(def.value)}
            aria-labelledby={headingId}
            className="scroll-mt-[calc(var(--spacing-header-h)+1rem)]"
          >
            <h2 id={headingId} className={cn("mb-3 text-base font-semibold", sk.heading)}>
              {t(def.labelKey)}
            </h2>
            {body}
          </section>
        )
      })}
    </TabsContent>
  )

  // --- Shell states ---
  if (isLoading) {
    return frame(
      <div className="space-y-4">
        <Skeleton className={cn("h-24 w-full", sk.radius)} />
        <Skeleton className={cn("h-96 w-full", sk.radius)} />
      </div>,
    )
  }

  // Checked before the computing branch: a failed job leaves `dossier` null,
  // which would otherwise render the computing view with nothing polling.
  if (isError && dossierError instanceof DossierJobFailedError) {
    return frame(
      <div
        role="alert"
        className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}
      >
        <p className={cn("text-sm", sk.text700)}>{dossierError.message}</p>
        <div className="flex gap-2">
          <Button onClick={() => void refetchDossier()}>{tm("memberDevelopmentWorkspace.tryAgain", { defaultValue: "Try again" })}</Button>
          <Button variant="outline" onClick={() => navigate(studioRoute)}>{tm("memberDevelopmentWorkspace.backToRoster", { defaultValue: "Back to roster" })}</Button>
        </div>
      </div>,
    )
  }

  // Async compute in flight: the dossier orchestrates ~6 agents (~60s), so the
  // backend returns 202 while the job runs and useMemberDossier polls. `null`
  // = computing (distinct from `undefined`/error below).
  if (dossier === null) {
    // TDS-P1 (c). This was the spinner and nothing else for the whole compute.
    // The tabs that need no dossier work now; the rest appear when it lands.
    // U4: the bar offers the groups that hold one; inside a group the section
    // that needs the dossier says so under its own heading.
    const computingGroup = COMPUTING_GROUPS.some((g) => g.value === activeGroup) ? activeGroup : undefined
    const name = cachedName || tm("memberDevelopmentWorkspace.thisMember", { defaultValue: "This member" })
    return frame(
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(studioRoute)}
          className={cn("inline-flex items-center gap-1 text-xs hover:text-slate-800", sk.text500)}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{tm("memberDevelopmentWorkspace.backToRoster", { defaultValue: "Back to roster" })}</button>
        <header className={cn("border bg-white p-4", sk.radius, sk.border200)}>
          <h1 className={cn("text-lg font-semibold", sk.heading)}>{name}</h1>
          <p role="status" className={cn("mt-1 flex items-center gap-2 text-sm", sk.text500)}>
            <RefreshCw className={cn("h-4 w-4 animate-spin", sk.text400)} aria-hidden="true" />{tm("memberDevelopmentWorkspace.generatingTheDevelopmentDossierThis", { defaultValue: "Generating the development dossier — this can take up to a minute…" })}</p>
          <p className={cn("mt-1 text-xs", sk.text400)}>{tm("memberDevelopmentWorkspace.goalsAndNotesWorkNow", { defaultValue: "Goals and Notes work now; the other tabs appear when it's ready." })}</p>
        </header>
        <Tabs value={computingGroup ?? ""} onValueChange={openGroup}>
          {groupTabs(COMPUTING_GROUPS)}
          <div className="mt-4">
            {computingGroup && memberId ? (
              COMPUTING_GROUPS.map((group) =>
                groupContent(group, (def) => {
                  if (!def.worksWhileComputing) return null
                  switch (def.value) {
                    case "goals":
                      return <GoalsPanel memberId={memberId} memberName={name} />
                    case "notes":
                      return <NotesPanel memberId={memberId} memberName={name} />
                    case "compare":
                      return <TeamComparePanel memberId={memberId} memberName={name} />
                    case "scenarios":
                      return <TeamScenarioPanel memberId={memberId} />
                    default:
                      return null
                  }
                }),
              )
            ) : (
              <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
                <RefreshCw className={cn("h-6 w-6 animate-spin", sk.text400)} aria-hidden="true" />
                <p className={cn("text-sm", sk.text500)}>{tm("memberDevelopmentWorkspace.thisTabNeedsTheDossier", { defaultValue: "This tab needs the dossier. Open Goals or Notes while it's generated." })}</p>
              </div>
            )}
          </div>
        </Tabs>
      </div>,
    )
  }

  if (isError || !dossier) {
    return frame(
      <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
        <p className={cn("text-sm", sk.text500)}>{isError ? t("dev.workspace.error") : t("dev.workspace.notFound")}</p>
        <Button variant="outline" onClick={() => navigate(studioRoute)}>{tm("memberDevelopmentWorkspace.backToRoster", { defaultValue: "Back to roster" })}</Button>
      </div>,
    )
  }

  const { member, reconciledHeadline, overallConfidence, coverage } = {
    member: dossier.member,
    reconciledHeadline: dossier.reconciledHeadline,
    overallConfidence: dossier.overallConfidence,
    coverage: dossier.profile.coverage,
  }

  // One panel per section, with the props each had as a tab. Exhaustive over
  // DevSection, so a section added to the union cannot ship without a panel.
  // Which of them mount, and in what order, is the SECTIONS table's business:
  // only the open group's sections render, and a section not on offer never does.
  const panels: Record<DevSection, ReactNode> = {
    profile: (
      <BehavioralProfilePanel
        profile={dossier.profile}
        notShared={dossier.prismNotShared}
        noAccount={dossier.prismNoAccount}
        memberName={member.name}
        onRequestAccess={() => requestPrism.mutate()}
        requestPending={requestPrism.isPending}
        requestSent={requestPrism.isSuccess}
      />
    ),
    // Shares the Profile group with the radar, below it. It reads the member's
    // full PRISM as it mounts (flag-on builds only).
    "profile-studio": (
      <ProfileStudioPanel
        memberId={dossier.memberId}
        memberName={member.name}
        profile={dossier.profile}
        notShared={dossier.prismNotShared}
      />
    ),
    goals: <GoalsPanel memberId={dossier.memberId} memberName={member.name} />,
    roadmap: (
      <RoadmapTimeline
        memberId={dossier.memberId}
        memberName={member.name}
        milestones={dossier.milestones}
        goals={dossier.goals}
        trajectory={dossier.trajectory}
        notShared={dossier.developmentNotShared}
      />
    ),
    gaps: (
      <GapAnalysisPanel
        memberId={dossier.memberId}
        matches={dossier.matches}
        initialTargetId={targetFromQuery}
        notShared={dossier.developmentNotShared}
        gapsState={dossier.gapsState}
        gapsTargetRole={dossier.gapsTargetRole}
      />
    ),
    learning: (
      <LearningPlanPanel
        memberId={dossier.memberId}
        learning={dossier.learning}
        gaps={dossier.gaps}
        goals={dossier.goals}
        notShared={dossier.developmentNotShared}
        audience={audience}
      />
    ),
    careers: FIT_ENGINE_MATCHES_ENABLED ? (
      <FitEngineMatchPanel
        memberName={member.name}
        result={fitMatches.data}
        loading={fitMatches.isLoading}
        error={fitMatches.isError}
      />
    ) : (
      <CareerMatchPanel
        internal={internal}
        external={external}
        onSetTarget={goToGapsFor}
        onViewGaps={goToGapsFor}
        notShared={dossier.developmentNotShared}
      />
    ),
    notes: (
      <NotesPanel
        memberId={dossier.memberId}
        memberName={member.name}
        goals={dossier.goals}
        milestones={dossier.milestones}
      />
    ),
    interviews: <InterviewsPanel interviews={dossier.interviews} memberName={member.name} />,
    // TDS-3 — both panels keep their runs, and a kept run belongs to the
    // workspace it was taken in (D-TDS3, "analyses follow the member"). So the
    // member is passed explicitly rather than inferred inside the panel: a
    // comparison naming three colleagues is stored under THIS member, and the
    // store's URL is what makes that true.
    compare: (
      <TeamComparePanel
        memberId={dossier.memberId}
        memberName={member.name}
      />
    ),
    scenarios: <TeamScenarioPanel memberId={dossier.memberId} />,
  }

  return frame(
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(studioRoute)}
        className={cn("inline-flex items-center gap-1 text-xs hover:text-slate-800", sk.text500)}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{tm("memberDevelopmentWorkspace.backToRoster", { defaultValue: "Back to roster" })}</button>

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
                {member.department ? tm("memberDevelopmentWorkspace.text", { defaultValue: " · {{department}}", department: member.department }) : ""}
              </p>
              <div className="mt-1.5 flex items-start gap-1.5">
                <ConfidenceDot level={overallConfidence} className="mt-1" />
                <p className={cn("text-sm", sk.text700)}>{reconciledHeadline}</p>
              </div>
              <div className="mt-2">
                {/* No onInvite: there is no Clifton or DISC invite in the platform,
                    and the old handler filed a Summit goals invite whichever chip
                    was clicked. A missing framework says so instead. */}
                <CoverageChips coverage={coverage} showDates />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dossier.events && dossier.events.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">{tm("memberDevelopmentWorkspace.provenance", { defaultValue: "Provenance" })}</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  {/* The rows are this dossier's recent activity (shares, invites,
                      closed gaps, recomputes), not only agent interpretations. */}
                  <div className={cn("text-xs font-semibold", sk.text700)}>{tm("memberDevelopmentWorkspace.recentActivity", { defaultValue: "Recent activity" })}</div>
                  <p className={cn("mt-0.5 text-[11px]", sk.text400)}>{tm("memberDevelopmentWorkspace.whatChangedOnThisDossier", { defaultValue: "What changed on this dossier, and which agent or action did it." })}</p>
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
                    onSuccess: (result) => sharePlanToast(result, member.name),
                    onError: () => toast.error(SHARE_PLAN_ERROR),
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
                  toast.success(tm("memberDevelopmentWorkspace.dossierExportedAsPdf", { defaultValue: "Dossier exported as PDF." }))
                } catch {
                  toast.error(tm("memberDevelopmentWorkspace.couldnTGenerateThePdf", { defaultValue: "Couldn't generate the PDF." }))
                }
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("dev.workspace.export")}
            </Button>
            {/* TDS-4b. This was `setTab("goals")` and nothing else: a button
                called "Start growth conversation" that started no conversation.
                It now also seeds the Meridian rail with an opening turn about
                this member, through the rail's existing `useMeridianChat` — the
                one send path (`.claude/rules/agents.md` §6). The tab change
                stays: it is the surface the conversation is about, and it is the
                only half that can be seen below the xl breakpoint. */}
            <Button
              size="sm"
              onClick={() => {
                setTab("goals")
                setConversationSeed((n) => n + 1)
              }}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("dev.workspace.startConversation")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main + assistant */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Tabs value={activeGroup} onValueChange={openGroup}>
          {groupTabs(OFFERED_GROUPS)}

          <div className="mt-4">
            {OFFERED_GROUPS.map((group) => groupContent(group, (def) => panels[def.value]))}
          </div>
        </Tabs>

        {/* Member-scoped Meridian assistant (in-page right rail; AppShell's own
            RightPanel is fixed and not prop-injectable). */}
        {/* Shown at every width: below xl it stacks under the tabs. It used to be
            `hidden xl:block`, so "Start growth conversation" sent and saved a
            turn the manager could not see on a laptop-width window. */}
        <aside data-testid="meridian-rail">
          <div className="h-[560px] xl:sticky xl:top-[calc(var(--spacing-header-h)+1rem)] xl:h-[calc(100vh-var(--spacing-header-h)-2rem)]">
            <MeridianDevelopmentPanel
              memberId={dossier.memberId}
              memberName={member.name}
              tab={activeSection}
              goals={dossier.goals}
              gaps={dossier.gaps}
              goalsNotShared={dossier.goalsNotShared}
              prismNotShared={dossier.prismNotShared}
              seedRequest={conversationSeed}
            />
          </div>
        </aside>
      </div>
    </div>,
  )
}
