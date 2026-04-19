import React, { Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";

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
const Dashboard = React.lazy(() => import("@/pages/user/Dashboard"));
const Coaches = React.lazy(() => import("@/pages/user/Coaches"));
const CoachChat = React.lazy(() => import("@/pages/user/CoachChat"));
const Documents = React.lazy(() => import("@/pages/user/Documents"));
const UserSettingsPage = React.lazy(() => import("@/pages/user/Settings"));
const HelpPage = React.lazy(() => import("@/pages/user/Help"));
const PrismAssessment = React.lazy(() => import("@/pages/user/PrismAssessment"));
const FeedbackHistory = React.lazy(() => import("@/pages/user/FeedbackHistory"));
const UserAnalytics = React.lazy(() => import("@/pages/user/Analytics"));
const MeridianChat = React.lazy(() => import("@/pages/user/MeridianChat"));

// ── Super Admin pages ───────────────────────────────────────────────────────
const SuperAdminDashboard = React.lazy(() => import("@/pages/super-admin/Dashboard"));
const TeamManagement = React.lazy(() => import("@/pages/super-admin/TeamManagement"));
const CoachManagement = React.lazy(() => import("@/pages/super-admin/CoachManagement"));
const OrganizationManagement = React.lazy(() => import("@/pages/super-admin/OrganizationManagement"));
const UserManagement = React.lazy(() => import("@/pages/super-admin/UserManagement"));
const IssuesDetailsPage = React.lazy(() => import("@/pages/super-admin/IssuesDetailsPage"));
const IssueDetailPage = React.lazy(() => import("@/pages/super-admin/IssueDetailPage"));
const LicenceDetailsPage = React.lazy(() => import("@/pages/super-admin/LicenceDetailsPage"));
const SuperAdminSettingsPage = React.lazy(() => import("@/pages/super-admin/Settings"));
const OrganizationView = React.lazy(() => import("@/pages/super-admin/OrganizationView"));
const UserCoaches = React.lazy(() => import("@/pages/super-admin/UserCoaches"));
const ProjectLog = React.lazy(() => import("@/pages/super-admin/ProjectLog"));
const RlhfTraining = React.lazy(() => import("@/pages/super-admin/RlhfTraining"));
const PromptBuilder = React.lazy(() => import("@/pages/super-admin/PromptBuilder"));
const AuditLog = React.lazy(() => import("@/pages/super-admin/AuditLog"));
const SuperAdminAnalytics = React.lazy(() => import("@/pages/super-admin/Analytics"));
const VoiceProviderSettings = React.lazy(() => import("@/pages/super-admin/VoiceProviderSettings"));
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
const PrismTeam = React.lazy(() => import("@/pages/manager/PrismTeam"));
const ManagerSettings = React.lazy(() => import("@/pages/manager/Settings"));
const ManagerAnalytics = React.lazy(() => import("@/pages/manager/Analytics"));
const ManagerBulkImport = React.lazy(() => import("@/pages/manager/BulkImport"));

// ── Company Admin pages ─────────────────────────────────────────────────────
const CompanyAdminDashboard = React.lazy(() => import("@/pages/company-admin/Dashboard"));
const CompanyAdminUsers = React.lazy(() => import("@/pages/company-admin/Users"));
const CompanyAdminOrganization = React.lazy(() => import("@/pages/company-admin/Organization"));
const CompanyAdminCosts = React.lazy(() => import("@/pages/company-admin/Costs"));
const CompanyAdminTraining = React.lazy(() => import("@/pages/company-admin/Training"));
const CompanyAdminLeadership = React.lazy(() => import("@/pages/company-admin/Leadership"));
const CompanyAdminSettings = React.lazy(() => import("@/pages/company-admin/Settings"));
const CompanyAdminAnalytics = React.lazy(() => import("@/pages/company-admin/Analytics"));
const CompanyAdminBulkImport = React.lazy(() => import("@/pages/company-admin/BulkImport"));
const CompanyAdminObservability = React.lazy(() => import("@/pages/company-admin/Observability"));
const SuperAdminBulkImport = React.lazy(() => import("@/pages/super-admin/BulkImport"));
const SuperAdminObservability = React.lazy(() => import("@/pages/super-admin/Observability"));
const InteractionProtocol = React.lazy(() => import("@/pages/super-admin/InteractionProtocol"));
const MentorManagement = React.lazy(() => import("@/pages/super-admin/MentorManagement"));

// ── Practitioner pages ──────────────────────────────────────────────────────
const PractitionerDashboard = React.lazy(() => import("@/pages/practitioner/Dashboard"));
const PractitionerClients = React.lazy(() => import("@/pages/practitioner/Clients"));
const PractitionerCredits = React.lazy(() => import("@/pages/practitioner/Credits"));
const PrismClients = React.lazy(() => import("@/pages/practitioner/PrismClients"));
const PractitionerSettings = React.lazy(() => import("@/pages/practitioner/Settings"));
const PractitionerAnalytics = React.lazy(() => import("@/pages/practitioner/Analytics"));

// ── Distributor pages ───────────────────────────────────────────────────────
const DistributorDashboard = React.lazy(() => import("@/pages/distributor/Dashboard"));
const DistributorPractitioners = React.lazy(() => import("@/pages/distributor/Practitioners"));
const DistributorCredits = React.lazy(() => import("@/pages/distributor/Credits"));
const DistributorTerritory = React.lazy(() => import("@/pages/distributor/Territory"));
const DistributorSettings = React.lazy(() => import("@/pages/distributor/Settings"));
const DistributorAnalytics = React.lazy(() => import("@/pages/distributor/Analytics"));

// ── Suspense wrapper helper ─────────────────────────────────────────────────
function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;
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
      { path: "/terms", element: withSuspense(<Terms />) },
      { path: "/privacy", element: withSuspense(<Privacy />) },
      { path: "/preview-home", element: withSuspense(<PreviewHome />) },
      { path: "/dev/prism-test", element: withSuspense(<PrismTestHarness />) },
      { path: "/dev/job-blueprint-test", element: withSuspense(<JobBlueprintTestHarness />) },
      { path: "/dev/process-builder", element: withSuspense(<ProcessBuilderPage />) },
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

      // User pages
      { path: "/home", element: withSuspense(<Home />) },
      { path: "/dashboard", element: withSuspense(<Dashboard />) },
      { path: "/coaches", element: withSuspense(<Coaches />) },
      { path: "/dashboard/:coach/chat", element: withSuspense(<CoachChat />) },
      { path: "/meridian/chat", element: withSuspense(<MeridianChat />) },
      { path: "/documents", element: withSuspense(<Documents />) },
      { path: "/settings", element: withSuspense(<UserSettingsPage />) },
      { path: "/help", element: withSuspense(<HelpPage />) },
      { path: "/prism-assessment", element: withSuspense(<PrismAssessment />) },
      { path: "/feedback", element: withSuspense(<FeedbackHistory />) },
      { path: "/analytics", element: withSuspense(<UserAnalytics />) },

      // Super Admin pages
      { path: "/super-admin/dashboard", element: withSuspense(<SuperAdminDashboard />) },
      { path: "/super-admin/team", element: withSuspense(<TeamManagement />) },
      { path: "/super-admin/coaches", element: withSuspense(<CoachManagement />) },
      { path: "/super-admin/:userId/coaches", element: withSuspense(<UserCoaches />) },
      { path: "/super-admin/organizations", element: withSuspense(<OrganizationManagement />) },
      { path: "/super-admin/organizations/:id/view", element: withSuspense(<OrganizationView />) },
      { path: "/super-admin/users", element: withSuspense(<UserManagement />) },
      { path: "/super-admin/dashboard/issues", element: withSuspense(<IssuesDetailsPage />) },
      { path: "/super-admin/issues/:id", element: withSuspense(<IssueDetailPage />) },
      { path: "/super-admin/dashboard/licences", element: withSuspense(<LicenceDetailsPage />) },
      { path: "/super-admin/settings", element: withSuspense(<SuperAdminSettingsPage />) },
      { path: "/super-admin/project-log", element: withSuspense(<ProjectLog />) },
      { path: "/super-admin/rlhf-training", element: withSuspense(<RlhfTraining />) },
      { path: "/super-admin/prompt-builder", element: withSuspense(<PromptBuilder />) },
      { path: "/super-admin/audit-log", element: withSuspense(<AuditLog />) },
      { path: "/super-admin/analytics", element: withSuspense(<SuperAdminAnalytics />) },
      { path: "/super-admin/bulk-import", element: withSuspense(<SuperAdminBulkImport />) },
      { path: "/super-admin/observability", element: withSuspense(<SuperAdminObservability />) },
      { path: "/super-admin/interaction-protocol", element: withSuspense(<InteractionProtocol />) },
      { path: "/super-admin/mentor-management", element: withSuspense(<MentorManagement />) },
      { path: "/super-admin/voice-settings", element: withSuspense(<VoiceProviderSettings />) },
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
      { path: "/company-admin/training", element: withSuspense(<CompanyAdminTraining />) },
      { path: "/company-admin/leadership", element: withSuspense(<CompanyAdminLeadership />) },
      { path: "/company-admin/settings", element: withSuspense(<CompanyAdminSettings />) },
      { path: "/company-admin/bulk-import", element: withSuspense(<CompanyAdminBulkImport />) },
      { path: "/company-admin/analytics", element: withSuspense(<CompanyAdminAnalytics />) },
      { path: "/company-admin/observability", element: withSuspense(<CompanyAdminObservability />) },

      // Practitioner pages
      { path: "/practitioner/dashboard", element: withSuspense(<PractitionerDashboard />) },
      { path: "/practitioner/clients", element: withSuspense(<PractitionerClients />) },
      { path: "/practitioner/credits", element: withSuspense(<PractitionerCredits />) },
      { path: "/practitioner/prism-clients", element: withSuspense(<PrismClients />) },
      { path: "/practitioner/settings", element: withSuspense(<PractitionerSettings />) },
      { path: "/practitioner/analytics", element: withSuspense(<PractitionerAnalytics />) },

      // Distributor pages
      { path: "/distributor/dashboard", element: withSuspense(<DistributorDashboard />) },
      { path: "/distributor/practitioners", element: withSuspense(<DistributorPractitioners />) },
      { path: "/distributor/credits", element: withSuspense(<DistributorCredits />) },
      { path: "/distributor/territory", element: withSuspense(<DistributorTerritory />) },
      { path: "/distributor/settings", element: withSuspense(<DistributorSettings />) },
      { path: "/distributor/analytics", element: withSuspense(<DistributorAnalytics />) },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
];

export default routes;
