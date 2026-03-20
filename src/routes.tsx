import { Navigate, type RouteObject } from "react-router-dom";
import SignUp from "@/pages/auth/SignUp";
import OTP from "@/pages/auth/OTP";
import ResetPassword from "@/pages/auth/ResetPassword";
import AcceptInvitation from "@/pages/auth/AcceptInvitation";
import SocialLogin from "@/pages/auth/SocialLogin";
import ProtectedRoute from "@/components/ProtectedRoute";

import UserSettingsPage from "@/pages/user/Settings";
import HelpPage from "@/pages/user/Help";
import Home from "@/pages/user/Home";
import Dashboard from "@/pages/user/Dashboard";
import Coaches from "@/pages/user/Coaches";
import CoachChat from "@/pages/user/CoachChat";
import Documents from "@/pages/user/Documents";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import OnboardingOne from "@/pages/onboarding/OnboardingOne";
import OnboardingTwo from "@/pages/onboarding/OnboardingTwo";
import OnboardingThree from "@/pages/onboarding/OnboardingThree";
import OnboardingFour from "@/pages/onboarding/OnboardingFour";
import OnboardingFive from "@/pages/onboarding/OnboardingFive";
import OnboardingDetailsOne from "@/pages/onboarding/OnboardingDetailsOne";
import OnboardingDetailsTwo from "@/pages/onboarding/OnboardingDetailsTwo";
import SuperAdminDashboard from "@/pages/super-admin/Dashboard";
import TeamManagement from "@/pages/super-admin/TeamManagement";
import CoachManagement from "@/pages/super-admin/CoachManagement";
import OrganizationManagement from "@/pages/super-admin/OrganizationManagement";
import UserManagement from "@/pages/super-admin/UserManagement";
import IssuesDetailsPage from "@/pages/super-admin/IssuesDetailsPage";
import IssueDetailPage from "@/pages/super-admin/IssueDetailPage";
import LicenceDetailsPage from "@/pages/super-admin/LicenceDetailsPage";
import SuperAdminSettingsPage from "@/pages/super-admin/Settings";
import OrganizationView from "@/pages/super-admin/OrganizationView";
import UserCoaches from "@/pages/super-admin/UserCoaches";
import ProjectLog from "@/pages/super-admin/ProjectLog";
import RlhfTraining from "@/pages/super-admin/RlhfTraining";
import PromptBuilder from "@/pages/super-admin/PromptBuilder";
import AuditLog from "@/pages/super-admin/AuditLog";
import MagicLinkLogin from "@/pages/auth/MagicLinkLogin";
import MagicLinkVerify from "@/pages/auth/MagicLinkVerify";
import PreviewHome from "@/pages/PreviewHome";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";

// Manager pages
import ManagerDashboard from "@/pages/manager/Dashboard";
import ManagerTeam from "@/pages/manager/Team";
import ManagerHiring from "@/pages/manager/Hiring";
import ManagerSettings from "@/pages/manager/Settings";

// Company Admin pages
import CompanyAdminDashboard from "@/pages/company-admin/Dashboard";
import CompanyAdminUsers from "@/pages/company-admin/Users";
import CompanyAdminOrganization from "@/pages/company-admin/Organization";
import CompanyAdminCosts from "@/pages/company-admin/Costs";
import CompanyAdminSettings from "@/pages/company-admin/Settings";

// Practitioner pages
import PractitionerDashboard from "@/pages/practitioner/Dashboard";
import PractitionerClients from "@/pages/practitioner/Clients";
import PractitionerCredits from "@/pages/practitioner/Credits";
import PractitionerSettings from "@/pages/practitioner/Settings";

// Distributor pages
import DistributorDashboard from "@/pages/distributor/Dashboard";
import DistributorPractitioners from "@/pages/distributor/Practitioners";
import DistributorCredits from "@/pages/distributor/Credits";
import DistributorTerritory from "@/pages/distributor/Territory";
import DistributorSettings from "@/pages/distributor/Settings";

// Central route configuration compatible with useRoutes
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/preview-home" replace /> },
  {
    children: [
      { path: "/login", element: <Navigate to="/preview-home" replace /> },
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

      // User pages
      { path: "/home", element: <Home /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/coaches", element: <Coaches /> },
      { path: "/dashboard/:coach/chat", element: <CoachChat /> },
      { path: "/documents", element: <Documents /> },
      { path: "/settings", element: <UserSettingsPage /> },
      { path: "/help", element: <HelpPage /> },

      // Super Admin pages
      { path: "/super-admin/dashboard", element: <SuperAdminDashboard /> },
      { path: "/super-admin/team", element: <TeamManagement /> },
      { path: "/super-admin/coaches", element: <CoachManagement /> },
      { path: "/super-admin/:userId/coaches", element: <UserCoaches /> },
      { path: "/super-admin/organizations", element: <OrganizationManagement /> },
      { path: "/super-admin/organizations/:id/view", element: <OrganizationView /> },
      { path: "/super-admin/users", element: <UserManagement /> },
      { path: "/super-admin/dashboard/issues", element: <IssuesDetailsPage /> },
      { path: "/super-admin/issues/:id", element: <IssueDetailPage /> },
      { path: "/super-admin/dashboard/licences", element: <LicenceDetailsPage /> },
      { path: "/super-admin/settings", element: <SuperAdminSettingsPage /> },
      { path: "/super-admin/project-log", element: <ProjectLog /> },
      { path: "/super-admin/rlhf-training", element: <RlhfTraining /> },
      { path: "/super-admin/prompt-builder", element: <PromptBuilder /> },
      { path: "/super-admin/audit-log", element: <AuditLog /> },

      // Manager pages
      { path: "/manager/dashboard", element: <ManagerDashboard /> },
      { path: "/manager/team", element: <ManagerTeam /> },
      { path: "/manager/hiring", element: <ManagerHiring /> },
      { path: "/manager/settings", element: <ManagerSettings /> },

      // Company Admin pages
      { path: "/company-admin/dashboard", element: <CompanyAdminDashboard /> },
      { path: "/company-admin/users", element: <CompanyAdminUsers /> },
      { path: "/company-admin/organization", element: <CompanyAdminOrganization /> },
      { path: "/company-admin/costs", element: <CompanyAdminCosts /> },
      { path: "/company-admin/settings", element: <CompanyAdminSettings /> },

      // Practitioner pages
      { path: "/practitioner/dashboard", element: <PractitionerDashboard /> },
      { path: "/practitioner/clients", element: <PractitionerClients /> },
      { path: "/practitioner/credits", element: <PractitionerCredits /> },
      { path: "/practitioner/settings", element: <PractitionerSettings /> },

      // Distributor pages
      { path: "/distributor/dashboard", element: <DistributorDashboard /> },
      { path: "/distributor/practitioners", element: <DistributorPractitioners /> },
      { path: "/distributor/credits", element: <DistributorCredits /> },
      { path: "/distributor/territory", element: <DistributorTerritory /> },
      { path: "/distributor/settings", element: <DistributorSettings /> },
    ],
  },
  { path: "*", element: <Navigate to="/preview-home" replace /> },
];

export default routes;
