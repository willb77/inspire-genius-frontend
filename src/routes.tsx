import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import LoadingFallback from "@/components/LoadingFallback";

// ── Static imports (auth, onboarding, legal, shared) ─────────────────
import SignUp from "@/pages/auth/SignUp";
import OTP from "@/pages/auth/OTP";
import ResetPassword from "@/pages/auth/ResetPassword";
import AcceptInvitation from "@/pages/auth/AcceptInvitation";
import Login from "@/pages/auth/Login";
import SocialLogin from "@/pages/auth/SocialLogin";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import MagicLinkLogin from "@/pages/auth/MagicLinkLogin";
import MagicLinkVerify from "@/pages/auth/MagicLinkVerify";
import ProtectedRoute from "@/components/ProtectedRoute";
import PreviewHome from "@/pages/PreviewHome";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";

// Onboarding pages (static — part of initial auth flow)
import OnboardingOne from "@/pages/onboarding/OnboardingOne";
import OnboardingTwo from "@/pages/onboarding/OnboardingTwo";
import OnboardingThree from "@/pages/onboarding/OnboardingThree";
import OnboardingFour from "@/pages/onboarding/OnboardingFour";
import OnboardingFive from "@/pages/onboarding/OnboardingFive";
import OnboardingDetailsOne from "@/pages/onboarding/OnboardingDetailsOne";
import OnboardingDetailsTwo from "@/pages/onboarding/OnboardingDetailsTwo";

// Dev pages (static — lightweight)
import PrismTestHarness from "@/pages/dev/PrismTestHarness";
import JobBlueprintTestHarness from "@/pages/dev/JobBlueprintTestHarness";

// ── Lazy imports (role-specific pages) ───────────────────────────────

// User pages
const Home = lazy(() => import("@/pages/user/Home"));
const Dashboard = lazy(() => import("@/pages/user/Dashboard"));
const Coaches = lazy(() => import("@/pages/user/Coaches"));
const CoachChat = lazy(() => import("@/pages/user/CoachChat"));
const Documents = lazy(() => import("@/pages/user/Documents"));
const UserSettingsPage = lazy(() => import("@/pages/user/Settings"));
const HelpPage = lazy(() => import("@/pages/user/Help"));
const FeedbackHistory = lazy(() => import("@/pages/user/FeedbackHistory"));
const UserAnalytics = lazy(() => import("@/pages/user/Analytics"));
const PrismAssessment = lazy(() => import("@/pages/user/PrismAssessment"));

// Super Admin pages
const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/Dashboard"));
const TeamManagement = lazy(() => import("@/pages/super-admin/TeamManagement"));
const CoachManagement = lazy(() => import("@/pages/super-admin/CoachManagement"));
const OrganizationManagement = lazy(() => import("@/pages/super-admin/OrganizationManagement"));
const UserManagement = lazy(() => import("@/pages/super-admin/UserManagement"));
const IssuesDetailsPage = lazy(() => import("@/pages/super-admin/IssuesDetailsPage"));
const IssueDetailPage = lazy(() => import("@/pages/super-admin/IssueDetailPage"));
const LicenceDetailsPage = lazy(() => import("@/pages/super-admin/LicenceDetailsPage"));
const SuperAdminSettingsPage = lazy(() => import("@/pages/super-admin/Settings"));
const OrganizationView = lazy(() => import("@/pages/super-admin/OrganizationView"));
const UserCoaches = lazy(() => import("@/pages/super-admin/UserCoaches"));
const ProjectLog = lazy(() => import("@/pages/super-admin/ProjectLog"));
const RlhfTraining = lazy(() => import("@/pages/super-admin/RlhfTraining"));
const PromptBuilder = lazy(() => import("@/pages/super-admin/PromptBuilder"));
const AuditLog = lazy(() => import("@/pages/super-admin/AuditLog"));
const SuperAdminAnalytics = lazy(() => import("@/pages/super-admin/Analytics"));

// Manager pages
const ManagerDashboard = lazy(() => import("@/pages/manager/Dashboard"));
const ManagerTeam = lazy(() => import("@/pages/manager/Team"));
const ManagerHiring = lazy(() => import("@/pages/manager/Hiring"));
const ManagerSettings = lazy(() => import("@/pages/manager/Settings"));
const ManagerAnalytics = lazy(() => import("@/pages/manager/Analytics"));
const PrismTeam = lazy(() => import("@/pages/manager/PrismTeam"));

// Company Admin pages
const CompanyAdminDashboard = lazy(() => import("@/pages/company-admin/Dashboard"));
const CompanyAdminUsers = lazy(() => import("@/pages/company-admin/Users"));
const CompanyAdminOrganization = lazy(() => import("@/pages/company-admin/Organization"));
const CompanyAdminCosts = lazy(() => import("@/pages/company-admin/Costs"));
const CompanyAdminSettings = lazy(() => import("@/pages/company-admin/Settings"));
const CompanyAdminAnalytics = lazy(() => import("@/pages/company-admin/Analytics"));

// Practitioner pages
const PractitionerDashboard = lazy(() => import("@/pages/practitioner/Dashboard"));
const PractitionerClients = lazy(() => import("@/pages/practitioner/Clients"));
const PractitionerCredits = lazy(() => import("@/pages/practitioner/Credits"));
const PractitionerSettings = lazy(() => import("@/pages/practitioner/Settings"));
const PractitionerAnalytics = lazy(() => import("@/pages/practitioner/Analytics"));
const PrismClients = lazy(() => import("@/pages/practitioner/PrismClients"));

// Distributor pages
const DistributorDashboard = lazy(() => import("@/pages/distributor/Dashboard"));
const DistributorPractitioners = lazy(() => import("@/pages/distributor/Practitioners"));
const DistributorCredits = lazy(() => import("@/pages/distributor/Credits"));
const DistributorTerritory = lazy(() => import("@/pages/distributor/Territory"));
const DistributorSettings = lazy(() => import("@/pages/distributor/Settings"));
const DistributorAnalytics = lazy(() => import("@/pages/distributor/Analytics"));

// ── Suspense wrapper helper ──────────────────────────────────────────
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

// Central route configuration compatible with useRoutes
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },
      { path: "/forgot", element: <ForgotPassword /> },
      { path: "/otp", element: <OTP /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/accept-invitation", element: <AcceptInvitation /> },
      { path: "/social-login", element: <SocialLogin /> },
      { path: "/magic-login", element: <MagicLinkLogin /> },
      { path: "/magic-verify", element: <MagicLinkVerify /> },
      { path: "/terms", element: <Terms /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/preview-home", element: <PreviewHome /> },
      { path: "/dev/prism-test", element: <PrismTestHarness /> },
      { path: "/dev/job-blueprint-test", element: <JobBlueprintTestHarness /> },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      // User onboarding (authenticated-only)
      { path: "/onboarding/one", element: <OnboardingOne /> },
      { path: "/onboarding/two", element: <OnboardingTwo /> },
      { path: "/onboarding/three", element: <OnboardingThree /> },
      { path: "/onboarding/four", element: <OnboardingFour /> },
      { path: "/onboarding/five", element: <OnboardingFive /> },
      { path: "/onboarding/details/one", element: <OnboardingDetailsOne /> },
      { path: "/onboarding/details/two", element: <OnboardingDetailsTwo /> },

      // User pages (lazy-loaded)
      { path: "/home", element: <S><Home /></S> },
      { path: "/dashboard", element: <S><Dashboard /></S> },
      { path: "/coaches", element: <S><Coaches /></S> },
      { path: "/dashboard/:coach/chat", element: <S><CoachChat /></S> },
      { path: "/documents", element: <S><Documents /></S> },
      { path: "/settings", element: <S><UserSettingsPage /></S> },
      { path: "/help", element: <S><HelpPage /></S> },
      { path: "/prism-assessment", element: <S><PrismAssessment /></S> },
      { path: "/feedback", element: <S><FeedbackHistory /></S> },
      { path: "/analytics", element: <S><UserAnalytics /></S> },

      // Super Admin pages (lazy-loaded)
      { path: "/super-admin/dashboard", element: <S><SuperAdminDashboard /></S> },
      { path: "/super-admin/team", element: <S><TeamManagement /></S> },
      { path: "/super-admin/coaches", element: <S><CoachManagement /></S> },
      { path: "/super-admin/:userId/coaches", element: <S><UserCoaches /></S> },
      { path: "/super-admin/organizations", element: <S><OrganizationManagement /></S> },
      { path: "/super-admin/organizations/:id/view", element: <S><OrganizationView /></S> },
      { path: "/super-admin/users", element: <S><UserManagement /></S> },
      { path: "/super-admin/dashboard/issues", element: <S><IssuesDetailsPage /></S> },
      { path: "/super-admin/issues/:id", element: <S><IssueDetailPage /></S> },
      { path: "/super-admin/dashboard/licences", element: <S><LicenceDetailsPage /></S> },
      { path: "/super-admin/settings", element: <S><SuperAdminSettingsPage /></S> },
      { path: "/super-admin/project-log", element: <S><ProjectLog /></S> },
      { path: "/super-admin/rlhf-training", element: <S><RlhfTraining /></S> },
      { path: "/super-admin/prompt-builder", element: <S><PromptBuilder /></S> },
      { path: "/super-admin/audit-log", element: <S><AuditLog /></S> },
      { path: "/super-admin/analytics", element: <S><SuperAdminAnalytics /></S> },

      // Manager pages (lazy-loaded)
      { path: "/manager/dashboard", element: <S><ManagerDashboard /></S> },
      { path: "/manager/team", element: <S><ManagerTeam /></S> },
      { path: "/manager/hiring", element: <S><ManagerHiring /></S> },
      { path: "/manager/prism-team", element: <S><PrismTeam /></S> },
      { path: "/manager/settings", element: <S><ManagerSettings /></S> },
      { path: "/manager/analytics", element: <S><ManagerAnalytics /></S> },

      // Company Admin pages (lazy-loaded)
      { path: "/company-admin/dashboard", element: <S><CompanyAdminDashboard /></S> },
      { path: "/company-admin/users", element: <S><CompanyAdminUsers /></S> },
      { path: "/company-admin/organization", element: <S><CompanyAdminOrganization /></S> },
      { path: "/company-admin/costs", element: <S><CompanyAdminCosts /></S> },
      { path: "/company-admin/settings", element: <S><CompanyAdminSettings /></S> },
      { path: "/company-admin/analytics", element: <S><CompanyAdminAnalytics /></S> },

      // Practitioner pages (lazy-loaded)
      { path: "/practitioner/dashboard", element: <S><PractitionerDashboard /></S> },
      { path: "/practitioner/clients", element: <S><PractitionerClients /></S> },
      { path: "/practitioner/credits", element: <S><PractitionerCredits /></S> },
      { path: "/practitioner/prism-clients", element: <S><PrismClients /></S> },
      { path: "/practitioner/settings", element: <S><PractitionerSettings /></S> },
      { path: "/practitioner/analytics", element: <S><PractitionerAnalytics /></S> },

      // Distributor pages (lazy-loaded)
      { path: "/distributor/dashboard", element: <S><DistributorDashboard /></S> },
      { path: "/distributor/practitioners", element: <S><DistributorPractitioners /></S> },
      { path: "/distributor/credits", element: <S><DistributorCredits /></S> },
      { path: "/distributor/territory", element: <S><DistributorTerritory /></S> },
      { path: "/distributor/settings", element: <S><DistributorSettings /></S> },
      { path: "/distributor/analytics", element: <S><DistributorAnalytics /></S> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
];

export default routes;
