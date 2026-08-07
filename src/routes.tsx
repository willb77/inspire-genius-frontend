import React, { Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import { isNewHomeEnabled, isNewUserSurfacesEnabled } from "@/lib/surfaceFlags";
// Eager, not lazy: the shell is the entitlement gate for a vertical route
// subtree, so it must resolve before the subtree renders rather than after.
import { VerticalShell } from "@/verticals/core";

// ── Auth pages ──────────────────────────────────────────────────────────────
const Login = React.lazy(() => import("@/pages/auth/Login"));
const SignUp = React.lazy(() => import("@/pages/auth/SignUp"));
const ForgotPassword = React.lazy(() => import("@/pages/auth/ForgotPassword"));
const OTP = React.lazy(() => import("@/pages/auth/OTP"));
const ResetPassword = React.lazy(() => import("@/pages/auth/ResetPassword"));
const AcceptInvitation = React.lazy(() => import("@/pages/auth/AcceptInvitation"));
const SocialLogin = React.lazy(() => import("@/pages/auth/SocialLogin"));
const MagicLinkLogin = React.lazy(() => import("@/pages/auth/MagicLinkLogin"));
const MagicLinkVerify = React.lazy(() => import("@/pages/auth/MagicLinkVerify"));

// ── Legal pages ─────────────────────────────────────────────────────────────
const Terms = React.lazy(() => import("@/pages/legal/Terms"));
const Privacy = React.lazy(() => import("@/pages/legal/Privacy"));

// ── Misc / Preview / Dev pages ──────────────────────────────────────────────
const PreviewHome = React.lazy(() => import("@/pages/PreviewHome"));
const PrismTestHarness = React.lazy(() => import("@/pages/dev/PrismTestHarness"));
const JobBlueprintTestHarness = React.lazy(() => import("@/pages/dev/JobBlueprintTestHarness"));

// ── Onboarding pages ────────────────────────────────────────────────────────
const OnboardingOne = React.lazy(() => import("@/pages/onboarding/OnboardingOne"));
const OnboardingTwo = React.lazy(() => import("@/pages/onboarding/OnboardingTwo"));
const OnboardingThree = React.lazy(() => import("@/pages/onboarding/OnboardingThree"));
const OnboardingFour = React.lazy(() => import("@/pages/onboarding/OnboardingFour"));
const OnboardingFive = React.lazy(() => import("@/pages/onboarding/OnboardingFive"));
const OnboardingDetailsOne = React.lazy(() => import("@/pages/onboarding/OnboardingDetailsOne"));
const OnboardingDetailsTwo = React.lazy(() => import("@/pages/onboarding/OnboardingDetailsTwo"));

// ── User pages ──────────────────────────────────────────────────────────────
const Home = React.lazy(() => import("@/pages/user/Home"));
const HomeV2 = React.lazy(() => import("@/pages/user/HomeV2"));
const Dashboard = React.lazy(() => import("@/pages/user/Dashboard"));
const Coaches = React.lazy(() => import("@/pages/user/Coaches"));
const CoachChat = React.lazy(() => import("@/pages/user/CoachChat"));
const Documents = React.lazy(() => import("@/pages/user/Documents"));
const InterviewPractice = React.lazy(() => import("@/pages/user/InterviewPracticePage"));
const Profile = React.lazy(() => import("@/pages/user/Profile"));
const UserSettingsPage = React.lazy(() => import("@/pages/user/Settings"));
const UserSettingsPrivacy = React.lazy(() => import("@/pages/user/SettingsPrivacy"));
const HelpPage = React.lazy(() => import("@/pages/user/Help"));
const SupportPage = React.lazy(() => import("@/pages/user/Support"));
// Wave 1 — new-design (HomeV2 system) variants of high-traffic user pages.
// Flag-gated additive swaps; classic pages stay reachable at /<path>/classic.
const CoachesV2 = React.lazy(() => import("@/pages/user/CoachesV2"));
const DashboardV2 = React.lazy(() => import("@/pages/user/DashboardV2"));
const HelpV2 = React.lazy(() => import("@/pages/user/HelpV2"));
// Wave 1 batch 2
const DocumentsV2 = React.lazy(() => import("@/pages/user/DocumentsV2"));
const PrismAssessmentV2 = React.lazy(() => import("@/pages/user/PrismAssessmentV2"));
const UserAnalyticsV2 = React.lazy(() => import("@/pages/user/AnalyticsV2"));
const FeedbackHistoryV2 = React.lazy(() => import("@/pages/user/FeedbackHistoryV2"));
const UserSettingsPrivacyV2 = React.lazy(() => import("@/pages/user/SettingsPrivacyV2"));
// Wave 1 batch 3
const ProfileV2 = React.lazy(() => import("@/pages/user/ProfileV2"));
const PrismAssessment = React.lazy(() => import("@/pages/user/PrismAssessment"));
const FeedbackHistory = React.lazy(() => import("@/pages/user/FeedbackHistory"));
const UserAnalytics = React.lazy(() => import("@/pages/user/Analytics"));
const MeridianChat = React.lazy(() => import("@/pages/user/MeridianChat"));
const BioCapture = React.lazy(() => import("@/pages/user/BioCapture"));
// Summit — Goal Setting surface
const SummitLayout = React.lazy(() => import("@/pages/summit/SummitLayout"));
const SummitDashboard = React.lazy(() => import("@/pages/summit/SummitDashboard"));
const SummitDiscovery = React.lazy(() => import("@/pages/summit/SummitDiscovery"));
const SummitPrism = React.lazy(() => import("@/pages/summit/SummitPrism"));
const SummitGoals = React.lazy(() => import("@/pages/summit/SummitGoals"));
const SummitCoaches = React.lazy(() => import("@/pages/summit/SummitCoaches"));
const SummitDocuments = React.lazy(() => import("@/pages/summit/SummitDocuments"));
const SummitProgress = React.lazy(() => import("@/pages/summit/SummitProgress"));
const DiagnosticChat = React.lazy(() => import("@/pages/user/DiagnosticChat"));

// ── Super Admin pages ───────────────────────────────────────────────────────
const SuperAdminDashboard = React.lazy(() => import("@/pages/super-admin/Dashboard"));
const OrganizationManagement = React.lazy(() => import("@/pages/super-admin/OrganizationManagement"));
const UserManagement = React.lazy(() => import("@/pages/super-admin/UserManagement"));
const SuperAdminUserMemory = React.lazy(() => import("@/pages/super-admin/UserMemory"));
const IssuesDetailsPage = React.lazy(() => import("@/pages/super-admin/IssuesDetailsPage"));
const IssueDetailPage = React.lazy(() => import("@/pages/super-admin/IssueDetailPage"));
const LicenceDetailsPage = React.lazy(() => import("@/pages/super-admin/LicenceDetailsPage"));
const SuperAdminSettingsPage = React.lazy(() => import("@/pages/super-admin/Settings"));
const OrganizationView = React.lazy(() => import("@/pages/super-admin/OrganizationView"));
const UserCoaches = React.lazy(() => import("@/pages/super-admin/UserCoaches"));
const ProjectLog = React.lazy(() => import("@/pages/super-admin/ProjectLog"));
const RlhfTraining = React.lazy(() => import("@/pages/super-admin/RlhfTraining"));
const DevTrafficReport = React.lazy(() => import("@/pages/super-admin/DevTrafficReport"));
const BroadcastAlert = React.lazy(() => import("@/pages/super-admin/BroadcastAlert"));
// Wave 2 Lane 2.B — PromptBuilder standalone deprecated; tab embedded in MentorManagement.
// const PromptBuilder = React.lazy(() => import("@/pages/super-admin/PromptBuilder"));
const SuperAdminAnalytics = React.lazy(() => import("@/pages/super-admin/Analytics"));
// Wave 2 Lane 2.B — VoiceProviderSettings standalone deprecated; tab embedded in MentorManagement.
// const VoiceProviderSettings = React.lazy(() => import("@/pages/super-admin/VoiceProviderSettings"));
const PrismManagement = React.lazy(() => import("@/pages/super-admin/PrismManagement"));
const ProcessBuilderPage = React.lazy(() => import("@/pages/super-admin/ProcessBuilder"));

// ── Agent Trainer pages ────────────────────────────────────────────────────
const AgentTrainerDashboard = React.lazy(() => import("@/pages/super-admin/trainer/AgentTrainerDashboard"));
const AgentTrainerPromptStudio = React.lazy(() => import("@/pages/super-admin/trainer/PromptStudio"));
const AgentTrainerKnowledge = React.lazy(() => import("@/pages/super-admin/trainer/KnowledgeManager"));
const AgentTrainerTraining = React.lazy(() => import("@/pages/super-admin/trainer/TrainingPlanBuilder"));
const AgentTrainerCosts = React.lazy(() => import("@/pages/super-admin/trainer/CostDashboard"));
const AgentTrainerSimulator = React.lazy(() => import("@/pages/super-admin/trainer/ConversationSimulator"));
const AgentTrainerWorkflows = React.lazy(() => import("@/pages/super-admin/trainer/WorkflowDesigner"));
const AgentTrainerExecutions = React.lazy(() => import("@/pages/super-admin/trainer/ExecutionList"));
const AgentTrainerExecutionViewer = React.lazy(() => import("@/pages/super-admin/trainer/ExecutionViewer"));
const HitlDashboard = React.lazy(() => import("@/pages/super-admin/trainer/HitlDashboard"));

// ── Manager pages ───────────────────────────────────────────────────────────
const ManagerDashboard = React.lazy(() => import("@/pages/manager/Dashboard"));
const ManagerTeam = React.lazy(() => import("@/pages/manager/Team"));
const ManagerHiring = React.lazy(() => import("@/pages/manager/Hiring"));
const ManagerCandidates = React.lazy(() => import("@/pages/manager/Candidates"));
const ManagerInterviews = React.lazy(() => import("@/pages/manager/Interviews"));
const ManagerJobDna = React.lazy(() => import("@/pages/manager/JobDna"));
const ManagerTraining = React.lazy(() => import("@/pages/manager/Training"));
const ManagerCareerManagement = React.lazy(() => import("@/pages/manager/CareerManagement"));
const ManagerTeamBuilding = React.lazy(() => import("@/pages/manager/TeamBuilding"));
const ManagerLeadership = React.lazy(() => import("@/pages/manager/Leadership"));
// Team Development Studio (behind VITE_FEATURE_TEAM_DEVELOPMENT)
const DevelopmentStudio = React.lazy(() => import("@/pages/manager/development/DevelopmentStudio"));
const MemberDevelopmentWorkspace = React.lazy(() => import("@/pages/manager/development/MemberDevelopmentWorkspace"));
const PrismTeam = React.lazy(() => import("@/pages/manager/PrismTeam"));
const ManagerSettings = React.lazy(() => import("@/pages/manager/Settings"));
const ManagerAnalytics = React.lazy(() => import("@/pages/manager/Analytics"));
const ManagerBulkImport = React.lazy(() => import("@/pages/manager/BulkImport"));
// Combined Plan §A.E3.4 — task-agent pages
const ManagerJobBlueprint = React.lazy(() => import("@/pages/manager/JobBlueprintPage"));
const ManagerInterviewPrep = React.lazy(() => import("@/pages/manager/InterviewPrepPage"));
const ManagerTeamComposition = React.lazy(() => import("@/pages/manager/TeamCompositionPage"));
const OnboardingWizard = React.lazy(() => import("@/pages/onboarding/OnboardingWizardPage"));
const SuperAdminResearch = React.lazy(() => import("@/pages/super-admin/ResearchPage"));
const SuperAdminResearchLibrary = React.lazy(() => import("@/pages/super-admin/ResearchLibraryPage"));

// ── Company Admin pages ─────────────────────────────────────────────────────
const CompanyAdminDashboard = React.lazy(() => import("@/pages/company-admin/Dashboard"));
const CompanyAdminUsers = React.lazy(() => import("@/pages/company-admin/Users"));
const CompanyAdminOrganization = React.lazy(() => import("@/pages/company-admin/Organization"));
const CompanyAdminCosts = React.lazy(() => import("@/pages/company-admin/Costs"));
const CompanyAdminSettings = React.lazy(() => import("@/pages/company-admin/Settings"));
const CompanyAdminAnalytics = React.lazy(() => import("@/pages/company-admin/Analytics"));
const CompanyAdminBulkImport = React.lazy(() => import("@/pages/company-admin/BulkImport"));
const CompanyAdminObservability = React.lazy(() => import("@/pages/company-admin/Observability"));
const CompanyAdminCultureDocs = React.lazy(() => import("@/pages/company-admin/CultureDocs"));
const SuperAdminBulkImport = React.lazy(() => import("@/pages/super-admin/BulkImport"));
const SuperAdminObservability = React.lazy(() => import("@/pages/super-admin/Observability"));
// Wave 2 Lane 2.B — InteractionProtocol standalone deprecated; tab embedded in MentorManagement.
// const InteractionProtocol = React.lazy(() => import("@/pages/super-admin/InteractionProtocol"));
const MentorManagement = React.lazy(() => import("@/pages/super-admin/MentorManagement"));
const KnowledgeBase = React.lazy(() => import("@/pages/super-admin/KnowledgeBase"));
const PrivacyCompliance = React.lazy(() => import("@/pages/super-admin/PrivacyCompliance"));
const Explainability = React.lazy(() => import("@/pages/super-admin/Explainability"));

// ── Practitioner pages ──────────────────────────────────────────────────────
// The old mock PractitionerDashboard is retired — /practitioner/dashboard now
// redirects to /practitioner/home (the new landing). Its unbuilt
// /api/practitioner/sessions call was 500-ing; Home uses the coachClient seam.
const PractitionerClients = React.lazy(() => import("@/pages/practitioner/Clients"));
const PractitionerCredits = React.lazy(() => import("@/pages/practitioner/Credits"));
const PrismClients = React.lazy(() => import("@/pages/practitioner/PrismClients"));
const PractitionerSettings = React.lazy(() => import("@/pages/practitioner/Settings"));
const PractitionerAnalytics = React.lazy(() => import("@/pages/practitioner/Analytics"));
// Wave 4 Lane 4.D — practitioner task-agent forms (mirrors manager)
const PractitionerJobBlueprint = React.lazy(() => import("@/pages/practitioner/JobBlueprintPage"));
const PractitionerInterviewPrep = React.lazy(() => import("@/pages/practitioner/InterviewPrepPage"));
const PractitionerTeamComposition = React.lazy(() => import("@/pages/practitioner/TeamCompositionPage"));
// Phase 2 (Practitioner page wireframes) — Home, Meridian chat, and clickable
// placeholders for the Schedule/Meeting surfaces (built out in later phases).
const PractitionerHome = React.lazy(() => import("@/pages/practitioner/Home"));
const PractitionerMeridianChat = React.lazy(() => import("@/pages/practitioner/MeridianChat"));
const PractitionerClientProfile = React.lazy(() => import("@/pages/practitioner/ClientProfile"));
const PractitionerSchedule = React.lazy(() => import("@/pages/practitioner/Schedule"));
const PractitionerMeeting = React.lazy(() => import("@/pages/practitioner/Meeting"));

// ── Distributor pages ───────────────────────────────────────────────────────
const DistributorDashboard = React.lazy(() => import("@/pages/distributor/Dashboard"));
const DistributorNetworkHub = React.lazy(() => import("@/pages/distributor/NetworkHub"));
const DistributorPractitioners = React.lazy(() => import("@/pages/distributor/Practitioners"));
const DistributorCredits = React.lazy(() => import("@/pages/distributor/Credits"));
const DistributorTerritory = React.lazy(() => import("@/pages/distributor/Territory"));
const DistributorSettings = React.lazy(() => import("@/pages/distributor/Settings"));
const DistributorAnalytics = React.lazy(() => import("@/pages/distributor/Analytics"));

// ── GRANT financial-aid vertical (flag-gated by enabled_verticals) ──────────
const GrantLayout = React.lazy(() => import("@/pages/grant/GrantLayout"));
const GrantDashboardPage = React.lazy(() => import("@/pages/grant/GrantDashboardPage"));
const GrantProfilePage = React.lazy(() => import("@/pages/grant/GrantProfilePage"));
const GrantFederalPage = React.lazy(() => import("@/pages/grant/GrantFederalPage"));
const GrantScholarshipsPage = React.lazy(() => import("@/pages/grant/GrantScholarshipsPage"));
const GrantInstitutionsPage = React.lazy(() => import("@/pages/grant/GrantInstitutionsPage"));
const GrantApplicationsPage = React.lazy(() => import("@/pages/grant/GrantApplicationsPage"));
const GrantComparePage = React.lazy(() => import("@/pages/grant/GrantComparePage"));
const GrantLoansPage = React.lazy(() => import("@/pages/grant/GrantLoansPage"));
const GrantPlanPage = React.lazy(() => import("@/pages/grant/GrantPlanPage"));
const GrantRosterPage = React.lazy(() => import("@/pages/grant/coach/RosterPage"));
const GrantStudentIntakePage = React.lazy(() => import("@/pages/grant/coach/StudentIntakePage"));

// Knowledge Continuity vertical — Program-Health dashboard (entitlement-gated)
const KceLayout = React.lazy(() => import("@/pages/knowledge-continuity/KceLayout"));
const KceDashboardPage = React.lazy(() => import("@/pages/knowledge-continuity/KceDashboardPage"));
const KceBlueprintPage = React.lazy(() => import("@/pages/knowledge-continuity/KceBlueprintPage"));
const KceCapturePage = React.lazy(() => import("@/pages/knowledge-continuity/KceCapturePage"));
const KceReviewConsolePage = React.lazy(() => import("@/pages/knowledge-continuity/KceReviewConsolePage"));
const KceCurriculumPage = React.lazy(() => import("@/pages/knowledge-continuity/KceCurriculumPage"));

// Lumen — B2C personal diagnostics + just-in-time coaching (entitlement-gated)
const LumenLayout = React.lazy(() => import("@/pages/lumen/LumenLayout"));
const LumenShell = React.lazy(() => import("@/pages/lumen/LumenNav"));
const LumenDashboard = React.lazy(() => import("@/pages/lumen/LumenDashboard"));
const LumenCoaching = React.lazy(() => import("@/pages/lumen/CoachingPage"));
const LumenSelfPortrait = React.lazy(() => import("@/pages/lumen/SelfPortrait"));
const LumenMoments = React.lazy(() => import("@/pages/lumen/Moments"));
const LumenSettings = React.lazy(() => import("@/pages/lumen/LumenSettings"));
const LumenOnboarding = React.lazy(() => import("@/pages/lumen/onboarding/LumenOnboarding"));

// Direction Setting — the guided path from jobless to employed
// (entitlement-gated). The journey map is the home surface; each other route is
// one stage, reachable directly because the journey is resumed over weeks.
const DirectionSettingShell = React.lazy(() => import("@/pages/direction-setting/DirectionSettingNav"));
const DirectionJourney = React.lazy(() => import("@/pages/direction-setting/JourneyPage"));
const DirectionEstablish = React.lazy(() => import("@/pages/direction-setting/EstablishPage"));
const DirectionPortrait = React.lazy(() => import("@/pages/direction-setting/PortraitPage"));
const DirectionCareers = React.lazy(() => import("@/pages/direction-setting/CareersPage"));
const DirectionSalary = React.lazy(() => import("@/pages/direction-setting/SalaryPage"));
const DirectionGoals = React.lazy(() => import("@/pages/direction-setting/GoalsPage"));
const DirectionAlignment = React.lazy(() => import("@/pages/direction-setting/AlignmentPage"));
const DirectionMatches = React.lazy(() => import("@/pages/direction-setting/MatchesPage"));
const DirectionPlan = React.lazy(() => import("@/pages/direction-setting/PlanPage"));
const DirectionInterview = React.lazy(() => import("@/pages/direction-setting/InterviewPage"));
const DirectionRehearse = React.lazy(() => import("@/pages/direction-setting/RehearsePage"));

// The Honor Foundation — Coach Workbench vertical (reskinned; entitlement-gated)
const HonorLanding = React.lazy(() => import("@/pages/honor/HonorLanding"));
const HonorLayout = React.lazy(() => import("@/pages/honor/HonorLayout"));
const HonorDashboard = React.lazy(() => import("@/pages/honor/HonorDashboard"));
const HonorCaseload = React.lazy(() => import("@/pages/honor/HonorCaseload"));
const HonorOnboard = React.lazy(() => import("@/pages/honor/HonorOnboard"));
const HonorEvaluate = React.lazy(() => import("@/pages/honor/HonorEvaluate"));
const HonorResume = React.lazy(() => import("@/pages/honor/HonorResume"));
const HonorMemberProfile = React.lazy(() => import("@/pages/honor/HonorMemberProfile"));
const HonorActivity = React.lazy(() => import("@/pages/honor/HonorActivity"));
const HonorSchedule = React.lazy(() => import("@/pages/honor/HonorSchedule"));
const HonorAdministration = React.lazy(() => import("@/pages/honor/HonorAdministration"));
const HonorAdminGuard = React.lazy(() => import("@/pages/honor/admin/HonorAdminGuard"));

// ── Job DNA / Job Blueprint authoring vertical (flag-gated by enabled_verticals) ──
const JobBlueprintLayout = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintLayout"));
const JobBlueprintDashboardPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintDashboardPage"));
const JobBlueprintAuthoringPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintAuthoringPage"));
const JobBlueprintDnaDetailPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintDnaDetailPage"));
const JobBlueprintCandidatesPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintCandidatesPage"));
const JobBlueprintPipelinePage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintPipelinePage"));
const JobBlueprintScorecardsPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintScorecardsPage"));
const JobBlueprintAnalyticsPage = React.lazy(() => import("@/pages/job-blueprint/JobBlueprintAnalyticsPage"));

// ── Job-Fit vertical — person-side profile↔role matching (entitlement-gated) ──
const JobFitLayout = React.lazy(() => import("@/pages/job-fit/JobFitLayout"));
const JobFitMatchesPage = React.lazy(() => import("@/pages/job-fit/MatchesPage"));
const JobFitDetailPage = React.lazy(() => import("@/pages/job-fit/FitDetailPage"));
const JobFitGapsPage = React.lazy(() => import("@/pages/job-fit/GapsPage"));
const JobFitPathwayPage = React.lazy(() => import("@/pages/job-fit/PathwayPage"));
const JobFitBlueprintPage = React.lazy(() => import("@/pages/job-fit/BlueprintStudioPage"));
const JobFitCoachPage = React.lazy(() => import("@/pages/job-fit/CoachPage"));
const JobFitTargetPage = React.lazy(() => import("@/pages/job-fit/TargetPreviewPage"));
const JobFitShell = React.lazy(() => import("@/pages/job-fit/FitShell"));

// ── Suspense wrapper helper ─────────────────────────────────────────────────
function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;
}

// ── /home surface resolver ──────────────────────────────────────────────────
// HomeV2 is the DEFAULT here as of 2026-08-01 (`isNewHomeEnabled`), unlike every
// other surface below, which stays opt-in behind `isNewUserSurfacesEnabled`.
// Both branches are lazy, so only the selected one is loaded, and the original
// stays reachable at /home/classic regardless of the flag (permanent rollback
// path). An explicit user choice still wins — the two predicates read the same
// localStorage key and differ only in what an ABSENT value means.
//
// The on-page Classic/New toggle was removed on 2026-08-06 (request). The flag
// still resolves, so a stored `"false"` set from the console is honoured, and
// /home/classic remains the permanent escape hatch — the switch went, not the
// destination.
function HomeSurface() {
  const enabled = isNewHomeEnabled();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {enabled ? <HomeV2 /> : <Home />}
    </Suspense>
  );
}

// ── Wave 1 surface resolvers ────────────────────────────────────────────────
// Flag-gated additive swaps for high-traffic user pages. Unlike /home there is
// no in-page toggle — the `new_user_surfaces` flag is flipped once (from the
// /home toggle or localStorage) and persists, so these read it at render and
// navigation picks up the current value. The classic page always stays at
// /<path>/classic. Rendered inside withSuspense so the lazy page can load.
function DashboardSurface() {
  return isNewUserSurfacesEnabled() ? <DashboardV2 /> : <Dashboard />;
}
function CoachesSurface() {
  return isNewUserSurfacesEnabled() ? <CoachesV2 /> : <Coaches />;
}
function HelpSurface() {
  return isNewUserSurfacesEnabled() ? <HelpV2 /> : <HelpPage />;
}
function DocumentsSurface() {
  return isNewUserSurfacesEnabled() ? <DocumentsV2 /> : <Documents />;
}
function PrismAssessmentSurface() {
  return isNewUserSurfacesEnabled() ? <PrismAssessmentV2 /> : <PrismAssessment />;
}
function UserAnalyticsSurface() {
  return isNewUserSurfacesEnabled() ? <UserAnalyticsV2 /> : <UserAnalytics />;
}
function FeedbackHistorySurface() {
  return isNewUserSurfacesEnabled() ? <FeedbackHistoryV2 /> : <FeedbackHistory />;
}
function UserSettingsPrivacySurface() {
  return isNewUserSurfacesEnabled() ? <UserSettingsPrivacyV2 /> : <UserSettingsPrivacy />;
}
function ProfileSurface() {
  return isNewUserSurfacesEnabled() ? <ProfileV2 /> : <Profile />;
}
// Meridian Chat used to carry its own in-page Classic/New toggle. Removed with
// the /home one on 2026-08-06 (request) — same reasoning: the flag still
// resolves, and /meridian/chat/classic stays as the escape hatch.
function MeridianChatSurface() {
  const enabled = isNewUserSurfacesEnabled();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MeridianChat variant={enabled ? "v2" : "classic"} />
    </Suspense>
  );
}

// Central route configuration compatible with useRoutes
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    children: [
      { path: "/login", element: withSuspense(<Login />) },
      { path: "/signup", element: withSuspense(<SignUp />) },
      { path: "/forgot", element: withSuspense(<ForgotPassword />) },
      { path: "/otp", element: withSuspense(<OTP />) },
      { path: "/reset-password", element: withSuspense(<ResetPassword />) },
      { path: "/accept-invitation", element: withSuspense(<AcceptInvitation />) },
      { path: "/social-login", element: withSuspense(<SocialLogin />) },
      { path: "/magic-login", element: withSuspense(<MagicLinkLogin />) },
      { path: "/magic-verify", element: withSuspense(<MagicLinkVerify />) },
      // The Honor Foundation — standalone Coach Workbench front door. Reuses the
      // platform magic-link auth; authed visitors are forwarded into the vertical.
      { path: "/honor", element: withSuspense(<HonorLanding />) },
      { path: "/terms", element: withSuspense(<Terms />) },
      { path: "/privacy", element: withSuspense(<Privacy />) },
      { path: "/preview-home", element: withSuspense(<PreviewHome />) },
      { path: "/dev/prism-test", element: withSuspense(<PrismTestHarness />) },
      { path: "/dev/job-blueprint-test", element: withSuspense(<JobBlueprintTestHarness />) },
      { path: "/dev/process-builder", element: withSuspense(<ProcessBuilderPage />) },
      // Wave 2 Lane 2.A (P7.1) — `/diagnostic-chat` is now a redirect to the super-admin-gated route.
      // The old path is kept public so any external link still lands somewhere useful.
      { path: "/diagnostic-chat", element: <Navigate to="/super-admin/agent-trace-console" replace /> },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      // User onboarding (authenticated-only)
      { path: "/onboarding/one", element: withSuspense(<OnboardingOne />) },
      { path: "/onboarding/two", element: withSuspense(<OnboardingTwo />) },
      { path: "/onboarding/three", element: withSuspense(<OnboardingThree />) },
      { path: "/onboarding/four", element: withSuspense(<OnboardingFour />) },
      { path: "/onboarding/five", element: withSuspense(<OnboardingFive />) },
      { path: "/onboarding/details/one", element: withSuspense(<OnboardingDetailsOne />) },
      { path: "/onboarding/details/two", element: withSuspense(<OnboardingDetailsTwo />) },
      // Combined Plan §A.E3.4 — onboarding wizard (Forge)
      { path: "/onboarding/wizard", element: withSuspense(<OnboardingWizard />) },

      // User pages
      // /home resolves to HomeV2 or Home via the new_user_surfaces flag.
      { path: "/home", element: withSuspense(<HomeSurface />) },
      // Permanent escape hatch — original Home, flag-independent.
      { path: "/home/classic", element: withSuspense(<Home />) },
      { path: "/dashboard", element: withSuspense(<DashboardSurface />) },
      { path: "/dashboard/classic", element: withSuspense(<Dashboard />) },
      { path: "/coaches", element: withSuspense(<CoachesSurface />) },
      { path: "/coaches/classic", element: withSuspense(<Coaches />) },
      { path: "/dashboard/:coach/chat", element: withSuspense(<CoachChat />) },
      { path: "/meridian/chat", element: withSuspense(<MeridianChatSurface />) },
      { path: "/meridian/chat/classic", element: withSuspense(<MeridianChat />) },
      // Bio Capture — Chronicle life-narrative surface (viewer + chat + memoir export)
      { path: "/bio", element: withSuspense(<BioCapture />) },
      // Summit — Goal Setting surface (nested; SummitLayout renders the sub-nav + Meridian chat)
      {
        path: "/summit",
        element: withSuspense(<SummitLayout />),
        children: [
          { index: true, element: withSuspense(<SummitDashboard />) },
          { path: "discovery", element: withSuspense(<SummitDiscovery />) },
          { path: "prism", element: withSuspense(<SummitPrism />) },
          { path: "goals", element: withSuspense(<SummitGoals />) },
          { path: "coaches", element: withSuspense(<SummitCoaches />) },
          { path: "documents", element: withSuspense(<SummitDocuments />) },
          { path: "progress", element: withSuspense(<SummitProgress />) },
        ],
      },
      { path: "/documents", element: withSuspense(<DocumentsSurface />) },
      { path: "/documents/classic", element: withSuspense(<Documents />) },
      { path: "/interview-practice", element: withSuspense(<InterviewPractice />) },
      { path: "/profile", element: withSuspense(<ProfileSurface />) },
      { path: "/profile/classic", element: withSuspense(<Profile />) },
      { path: "/settings", element: withSuspense(<UserSettingsPage />) },
      { path: "/settings/privacy", element: withSuspense(<UserSettingsPrivacySurface />) },
      { path: "/settings/privacy/classic", element: withSuspense(<UserSettingsPrivacy />) },
      // Help & Support is the support-request surface: it posts to
      // support-service (/v1/support/tickets), which emails
      // contact@inspiresgenius.com on every submission.
      { path: "/help", element: withSuspense(<SupportPage />) },
      // The previous Help page — and its flag-gated V2 re-skin — posted to the
      // legacy monolith /v1/issues (which has no route on staging-b). Both are
      // preserved here rather than deleted.
      // NOT an escape hatch, despite the path. `/help` renders the
      // support-request surface; the Help PAGE lives here, and it resolves V2
      // vs classic like any other Wave-1 surface — hence HelpSurface rather
      // than HelpPage directly. Pointing this at HelpPage would make HelpV2
      // unreachable, which the "HelpSurface is unused" build error catches.
      { path: "/help/classic", element: withSuspense(<HelpSurface />) },
      // Alias so /support keeps working for anyone who has it bookmarked.
      { path: "/support", element: withSuspense(<SupportPage />) },
      { path: "/prism-assessment", element: withSuspense(<PrismAssessmentSurface />) },
      { path: "/prism-assessment/classic", element: withSuspense(<PrismAssessment />) },
      { path: "/feedback", element: withSuspense(<FeedbackHistorySurface />) },
      { path: "/feedback/classic", element: withSuspense(<FeedbackHistory />) },
      { path: "/analytics", element: withSuspense(<UserAnalyticsSurface />) },
      { path: "/analytics/classic", element: withSuspense(<UserAnalytics />) },

      // Super Admin pages
      { path: "/super-admin/dashboard", element: withSuspense(<SuperAdminDashboard />) },
      // Wave 0 Lane A — D8: TeamManagement stub deleted; UserManagement covers all platform users
      { path: "/super-admin/team", element: <Navigate to="/super-admin/users" replace /> },
      // Wave 0 Lane A — D2: CoachManagement deleted; MentorManagement is the canonical Agent Management page
      { path: "/super-admin/coaches", element: <Navigate to="/super-admin/mentor-management" replace /> },
      { path: "/super-admin/:userId/coaches", element: withSuspense(<UserCoaches />) },
      { path: "/super-admin/organizations", element: withSuspense(<OrganizationManagement />) },
      { path: "/super-admin/organizations/:id/view", element: withSuspense(<OrganizationView />) },
      { path: "/super-admin/users", element: withSuspense(<UserManagement />) },
      { path: "/super-admin/users/:userId/memory", element: withSuspense(<SuperAdminUserMemory />) },
      { path: "/super-admin/dashboard/issues", element: withSuspense(<IssuesDetailsPage />) },
      { path: "/super-admin/issues/:id", element: withSuspense(<IssueDetailPage />) },
      { path: "/super-admin/dashboard/licences", element: withSuspense(<LicenceDetailsPage />) },
      { path: "/super-admin/settings", element: withSuspense(<SuperAdminSettingsPage />) },
      { path: "/super-admin/project-log", element: withSuspense(<ProjectLog />) },
      { path: "/super-admin/rlhf-training", element: withSuspense(<RlhfTraining />) },
      { path: "/super-admin/dev-traffic-report", element: withSuspense(<DevTrafficReport />) },
      { path: "/super-admin/broadcast-alert", element: withSuspense(<BroadcastAlert />) },
      // Combined Plan §A.E3.4 — document research (Sage)
      { path: "/super-admin/research", element: withSuspense(<SuperAdminResearch />) },
      // Saved-research workspace browser — Q + A pairs from POST /v1/tasks/results
      { path: "/super-admin/research-library", element: withSuspense(<SuperAdminResearchLibrary />) },
      // Wave 2 Lane 2.B (P2.1 / D3) — PromptBuilder standalone superseded by the
      // MentorManagement → Prompt tab. Public path redirects so external links work.
      { path: "/super-admin/prompt-builder", element: <Navigate to="/super-admin/mentor-management?tab=prompt" replace /> },
      // Wave 0 Lane A — D1: AuditLog standalone page deleted; canonical view is the Audit Log tab on Analytics
      { path: "/super-admin/audit-log", element: <Navigate to="/super-admin/analytics?tab=audit" replace /> },
      { path: "/super-admin/analytics", element: withSuspense(<SuperAdminAnalytics />) },
      { path: "/super-admin/bulk-import", element: withSuspense(<SuperAdminBulkImport />) },
      { path: "/super-admin/observability", element: withSuspense(<SuperAdminObservability />) },
      // Wave 2 Lane 2.B (P2.2 / D4) — InteractionProtocol standalone superseded by
      // the MentorManagement → Protocol tab. Public path redirects.
      { path: "/super-admin/interaction-protocol", element: <Navigate to="/super-admin/mentor-management?tab=protocol" replace /> },
      { path: "/super-admin/mentor-management", element: withSuspense(<MentorManagement />) },
      // Wave 2 Lane 2.B (P2.3 / D7) — VoiceProviderSettings standalone superseded by
      // the MentorManagement → Voice tab. Public path redirects.
      { path: "/super-admin/voice-settings", element: <Navigate to="/super-admin/mentor-management?tab=voice" replace /> },
      { path: "/super-admin/knowledge-base", element: withSuspense(<KnowledgeBase />) },
      { path: "/super-admin/prism-management", element: withSuspense(<PrismManagement />) },
      // Wave 0.E (P5.1) — CulturalContent merged into KnowledgeBase as a domain filter.
      { path: "/super-admin/cultural-content", element: <Navigate to="/super-admin/knowledge-base?domain=cultural" replace /> },
      { path: "/super-admin/privacy-compliance", element: withSuspense(<PrivacyCompliance />) },
      { path: "/super-admin/explainability", element: withSuspense(<Explainability />) },
      { path: "/super-admin/explainability/c/:sessionId", element: withSuspense(<Explainability />) },
      { path: "/super-admin/explainability/c/:sessionId/t/:turnId", element: withSuspense(<Explainability />) },
      // Wave 2 Lane 2.A (P7.1) — formerly `/diagnostic-chat`. Renamed to "Agent Trace Console" and gated to super-admin.
      { path: "/super-admin/agent-trace-console", element: withSuspense(<DiagnosticChat />) },
      { path: "/super-admin/process-builder", element: <Navigate to="/super-admin/agent-trainer/workflows" replace /> },

      // Agent Trainer routes
      { path: "/super-admin/agent-trainer", element: withSuspense(<AgentTrainerDashboard />) },
      { path: "/super-admin/agent-trainer/:agentId", element: withSuspense(<AgentTrainerDashboard />) },
      { path: "/super-admin/agent-trainer/:agentId/prompt", element: withSuspense(<AgentTrainerPromptStudio />) },
      { path: "/super-admin/agent-trainer/:agentId/knowledge", element: withSuspense(<AgentTrainerKnowledge />) },
      { path: "/super-admin/agent-trainer/:agentId/training", element: withSuspense(<AgentTrainerTraining />) },
      { path: "/super-admin/agent-trainer/:agentId/costs", element: withSuspense(<AgentTrainerCosts />) },
      { path: "/super-admin/agent-trainer/:agentId/test", element: withSuspense(<AgentTrainerSimulator />) },
      { path: "/super-admin/agent-trainer/workflows", element: withSuspense(<AgentTrainerWorkflows />) },
      { path: "/super-admin/agent-trainer/executions", element: withSuspense(<AgentTrainerExecutions />) },
      { path: "/super-admin/agent-trainer/executions/:executionId", element: withSuspense(<AgentTrainerExecutionViewer />) },
      { path: "/super-admin/agent-trainer/approvals", element: withSuspense(<HitlDashboard />) },

      // Manager pages
      { path: "/manager/dashboard", element: withSuspense(<ManagerDashboard />) },
      { path: "/manager/team", element: withSuspense(<ManagerTeam />) },
      { path: "/manager/hiring", element: withSuspense(<ManagerHiring />) },
      { path: "/manager/candidates", element: withSuspense(<ManagerCandidates />) },
      { path: "/manager/interviews", element: withSuspense(<ManagerInterviews />) },
      { path: "/manager/job-dna", element: withSuspense(<ManagerJobDna />) },
      // Combined Plan §A.E3.4 — task-agent pages
      { path: "/manager/job-blueprint", element: withSuspense(<ManagerJobBlueprint />) },
      { path: "/manager/interview-prep", element: withSuspense(<ManagerInterviewPrep />) },
      { path: "/manager/team-composition", element: withSuspense(<ManagerTeamComposition />) },
      // Team Development Studio (roster + per-member workspace)
      // Team Development Studio. The page resolves classic vs the HomeV2 look
      // from the `new_user_surfaces` flag internally; /classic forces the
      // original look as a permanent escape hatch (static segment out-ranks
      // :memberId in the router).
      { path: "/manager/development", element: withSuspense(<DevelopmentStudio />) },
      { path: "/manager/development/classic", element: withSuspense(<DevelopmentStudio variant="classic" />) },
      { path: "/manager/development/:memberId", element: withSuspense(<MemberDevelopmentWorkspace />) },
      { path: "/manager/development/:memberId/classic", element: withSuspense(<MemberDevelopmentWorkspace variant="classic" />) },
      { path: "/manager/training", element: withSuspense(<ManagerTraining />) },
      { path: "/manager/career-mgmt", element: withSuspense(<ManagerCareerManagement />) },
      { path: "/manager/team-building", element: withSuspense(<ManagerTeamBuilding />) },
      { path: "/manager/leadership", element: withSuspense(<ManagerLeadership />) },
      { path: "/manager/prism-team", element: withSuspense(<PrismTeam />) },
      { path: "/manager/settings", element: withSuspense(<ManagerSettings />) },
      { path: "/manager/analytics", element: withSuspense(<ManagerAnalytics />) },
      { path: "/manager/bulk-import", element: withSuspense(<ManagerBulkImport />) },

      // Company Admin pages
      { path: "/company-admin/dashboard", element: withSuspense(<CompanyAdminDashboard />) },
      { path: "/company-admin/users", element: withSuspense(<CompanyAdminUsers />) },
      { path: "/company-admin/organization", element: withSuspense(<CompanyAdminOrganization />) },
      { path: "/company-admin/costs", element: withSuspense(<CompanyAdminCosts />) },
      { path: "/company-admin/settings", element: withSuspense(<CompanyAdminSettings />) },
      { path: "/company-admin/bulk-import", element: withSuspense(<CompanyAdminBulkImport />) },
      { path: "/company-admin/analytics", element: withSuspense(<CompanyAdminAnalytics />) },
      { path: "/company-admin/observability", element: withSuspense(<CompanyAdminObservability />) },
      { path: "/company-admin/culture", element: withSuspense(<CompanyAdminCultureDocs />) },

      // Practitioner pages
      { path: "/practitioner/home", element: withSuspense(<PractitionerHome />) },
      { path: "/practitioner/meridian-chat", element: withSuspense(<PractitionerMeridianChat />) },
      { path: "/practitioner/schedule", element: withSuspense(<PractitionerSchedule />) },
      { path: "/practitioner/meeting", element: withSuspense(<PractitionerMeeting />) },
      { path: "/practitioner/dashboard", element: <Navigate to="/practitioner/home" replace /> },
      { path: "/practitioner/clients", element: withSuspense(<PractitionerClients />) },
      { path: "/practitioner/clients/:clientId", element: withSuspense(<PractitionerClientProfile />) },
      { path: "/practitioner/credits", element: withSuspense(<PractitionerCredits />) },
      { path: "/practitioner/prism-clients", element: withSuspense(<PrismClients />) },
      { path: "/practitioner/settings", element: withSuspense(<PractitionerSettings />) },
      { path: "/practitioner/analytics", element: withSuspense(<PractitionerAnalytics />) },
      // Wave 4 Lane 4.D (P7.2) — task-agent forms now available to practitioner
      { path: "/practitioner/job-blueprint", element: withSuspense(<PractitionerJobBlueprint />) },
      { path: "/practitioner/interview-prep", element: withSuspense(<PractitionerInterviewPrep />) },
      { path: "/practitioner/team-composition", element: withSuspense(<PractitionerTeamComposition />) },

      // Distributor pages
      { path: "/distributor/dashboard", element: withSuspense(<DistributorDashboard />) },
      { path: "/distributor/network", element: withSuspense(<DistributorNetworkHub />) },
      { path: "/distributor/practitioners", element: withSuspense(<DistributorPractitioners />) },
      { path: "/distributor/credits", element: withSuspense(<DistributorCredits />) },
      { path: "/distributor/territory", element: withSuspense(<DistributorTerritory />) },
      { path: "/distributor/settings", element: withSuspense(<DistributorSettings />) },
      { path: "/distributor/analytics", element: withSuspense(<DistributorAnalytics />) },

      // GRANT financial-aid vertical — entitlement-gated inside GrantLayout,
      // which wraps every child in the existing AppShell. Unentitled users are
      // redirected to /home by the layout.
      {
        path: "/vertical/grant",
        element: withSuspense(<GrantLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/grant/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<GrantDashboardPage />) },
          { path: "profile", element: withSuspense(<GrantProfilePage />) },
          { path: "federal", element: withSuspense(<GrantFederalPage />) },
          { path: "scholarships", element: withSuspense(<GrantScholarshipsPage />) },
          { path: "institutions", element: withSuspense(<GrantInstitutionsPage />) },
          { path: "applications", element: withSuspense(<GrantApplicationsPage />) },
          { path: "compare", element: withSuspense(<GrantComparePage />) },
          { path: "loans", element: withSuspense(<GrantLoansPage />) },
          { path: "plan", element: withSuspense(<GrantPlanPage />) },
          // Coach surface — roster + per-student intake (coach-capable roles).
          { path: "coach/students", element: withSuspense(<GrantRosterPage />) },
          { path: "coach/students/:studentId", element: withSuspense(<GrantStudentIntakePage />) },
        ],
      },

      // Knowledge Continuity vertical — entitlement-gated inside KceLayout,
      // which wraps every child in the existing AppShell. Unentitled users are
      // redirected to /home by the layout.
      {
        path: "/vertical/knowledge-continuity",
        element: withSuspense(<KceLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/knowledge-continuity/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<KceDashboardPage />) },
          { path: "blueprint", element: withSuspense(<KceBlueprintPage />) },
          { path: "capture", element: withSuspense(<KceCapturePage />) },
          { path: "review", element: withSuspense(<KceReviewConsolePage />) },
          { path: "curriculum", element: withSuspense(<KceCurriculumPage />) },
        ],
      },

      // Lumen — B2C personal diagnostics + JIT coaching. Entitlement-gated
      // inside LumenLayout, which wraps every child in the existing AppShell.
      // Unentitled users are redirected to /home by the layout.
      {
        path: "/vertical/lumen",
        element: withSuspense(<LumenLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/lumen/dashboard" replace /> },
          // Pathless layout: the in-vertical nav renders above every tool page.
          // Onboarding sits outside it deliberately — it is a funnel, and a row
          // of links to surfaces that are not ready yet invites leaving it.
          {
            element: withSuspense(<LumenShell />),
            children: [
              { path: "dashboard", element: withSuspense(<LumenDashboard />) },
              { path: "self-portrait", element: withSuspense(<LumenSelfPortrait />) },
              { path: "moments", element: withSuspense(<LumenMoments />) },
              { path: "coaching", element: withSuspense(<LumenCoaching />) },
              { path: "settings", element: withSuspense(<LumenSettings />) },
            ],
          },
          { path: "onboarding", element: withSuspense(<LumenOnboarding />) },
        ],
      },

      // Direction Setting — entitlement-gated by VerticalShell, which wraps
      // every child in the existing AppShell and redirects unentitled users.
      // Nothing inside is locked by stage: every stage is enterable and
      // explains what it is missing rather than refusing.
      {
        path: "/vertical/direction-setting",
        element: <VerticalShell vertical="direction-setting" />,
        children: [
          { index: true, element: <Navigate to="/vertical/direction-setting/journey" replace /> },
          // Pathless layout: the in-vertical nav renders above every stage page.
          {
            element: withSuspense(<DirectionSettingShell />),
            children: [
              { path: "journey", element: withSuspense(<DirectionJourney />) },
              { path: "establish", element: withSuspense(<DirectionEstablish />) },
              { path: "portrait", element: withSuspense(<DirectionPortrait />) },
              { path: "careers", element: withSuspense(<DirectionCareers />) },
              { path: "salary", element: withSuspense(<DirectionSalary />) },
              { path: "goals", element: withSuspense(<DirectionGoals />) },
              { path: "alignment", element: withSuspense(<DirectionAlignment />) },
              { path: "matches", element: withSuspense(<DirectionMatches />) },
              { path: "plan", element: withSuspense(<DirectionPlan />) },
              { path: "interview", element: withSuspense(<DirectionInterview />) },
              { path: "rehearse", element: withSuspense(<DirectionRehearse />) },
            ],
          },
        ],
      },

      // The Honor Foundation — Coach Workbench vertical. Reskinned (navy/orange
      // THF chrome) and entitlement-gated inside HonorLayout, which redirects
      // users lacking the "honor" entitlement to /home.
      {
        path: "/vertical/honor",
        element: withSuspense(<HonorLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/honor/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<HonorDashboard />) },
          { path: "caseload", element: withSuspense(<HonorCaseload />) },
          { path: "onboard", element: withSuspense(<HonorOnboard />) },
          { path: "evaluate", element: withSuspense(<HonorEvaluate />) },
          { path: "resume", element: withSuspense(<HonorResume />) },
          { path: "activity", element: withSuspense(<HonorActivity />) },
          { path: "schedule", element: withSuspense(<HonorSchedule />) },
          {
            path: "administration",
            element: withSuspense(
              <HonorAdminGuard>
                <HonorAdministration />
              </HonorAdminGuard>,
            ),
          },
          // Member workspace — no id lands on the first assigned member.
          { path: "member", element: withSuspense(<HonorMemberProfile />) },
          { path: "member/:memberId", element: withSuspense(<HonorMemberProfile />) },
        ],
      },

      // Job-Fit vertical — a logged-in user matches their OWN PRISM profile
      // against published Job DNAs. Entitlement-gated inside JobFitLayout,
      // which wraps every child in the shared AppShell and redirects users
      // lacking the "job-fit" entitlement to /home.
      {
        path: "/vertical/job-fit",
        element: withSuspense(<JobFitLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/job-fit/matches" replace /> },
          // Pathless layout route: renders the in-vertical nav above every page.
          {
            element: withSuspense(<JobFitShell />),
            children: [
              { path: "matches", element: withSuspense(<JobFitMatchesPage />) },
              { path: "fit/:jobId", element: withSuspense(<JobFitDetailPage />) },
              { path: "gaps", element: withSuspense(<JobFitGapsPage />) },
              { path: "pathway", element: withSuspense(<JobFitPathwayPage />) },
              { path: "blueprint", element: withSuspense(<JobFitBlueprintPage />) },
              { path: "coach", element: withSuspense(<JobFitCoachPage />) },
              { path: "target", element: withSuspense(<JobFitTargetPage />) },
            ],
          },
        ],
      },

      // Job DNA / Job Blueprint authoring vertical — entitlement-gated inside
      // JobBlueprintLayout, which wraps every child in the existing AppShell.
      // Unentitled users are redirected to /home by the layout. The authoring
      // create → benchmark → save → reload flow hits the live /v1/blueprint/*
      // backend; the matching / fit surfaces read the same endpoints (gated).
      {
        path: "/vertical/job-blueprint",
        element: withSuspense(<JobBlueprintLayout />),
        children: [
          { index: true, element: <Navigate to="/vertical/job-blueprint/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<JobBlueprintDashboardPage />) },
          { path: "authoring", element: withSuspense(<JobBlueprintAuthoringPage />) },
          { path: "dna/:id", element: withSuspense(<JobBlueprintDnaDetailPage />) },
          { path: "candidates", element: withSuspense(<JobBlueprintCandidatesPage />) },
          { path: "pipeline", element: withSuspense(<JobBlueprintPipelinePage />) },
          { path: "scorecards", element: withSuspense(<JobBlueprintScorecardsPage />) },
          { path: "analytics", element: withSuspense(<JobBlueprintAnalyticsPage />) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
];

export default routes;
