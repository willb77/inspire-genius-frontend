import { Navigate, type RouteObject } from "react-router-dom";
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import OTP from "@/pages/auth/OTP";
import ResetPassword from "@/pages/auth/ResetPassword";
import AcceptInvitation from "@/pages/auth/AcceptInvitation";
// import SocialLogin from "@/pages/auth/SocialLogin";
import ProtectedRoute from "@/components/ProtectedRoute";
// import PublicRoute from "@/components/PublicRoute";

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
      // { path: "/social-login", element: <SocialLogin /> },
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
      // Super Admin protected pages
      { path: "/super-admin/dashboard", element: <SuperAdminDashboard /> },
      { path: "/super-admin/team", element: <TeamManagement /> },
      { path: "/super-admin/coaches", element: <CoachManagement /> },
      {
        path: "/super-admin/organizations",
        element: <OrganizationManagement />,
      },
      {
        path: "/super-admin/organizations/:id/view",
        element: <OrganizationView />,
      },

      { path: "/super-admin/users", element: <UserManagement /> },
      { path: "/super-admin/dashboard/issues", element: <IssuesDetailsPage /> },
      {
        path: "/super-admin/issues/:id",
        element: <IssueDetailPage />,
      },
      {
        path: "/super-admin/dashboard/licences",
        element: <LicenceDetailsPage />,
      },
      {path:"/super-admin/settings",element:<SuperAdminSettingsPage />}
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
];

export default routes;
