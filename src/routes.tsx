import { Navigate, type RouteObject } from "react-router-dom";
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import OTP from "@/pages/auth/OTP";
import ProtectedRoute from "@/components/ProtectedRoute";
// import Home from "@/pages/user/Home";
// import Dashboard from "@/pages/user/Dashboard";
// import Coaches from "@/pages/user/Coaches";
// import Documents from "@/pages/user/Documents";
// import SettingsPage from "@/pages/user/Settings";
// import HelpPage from "@/pages/user/Help";
// import CoachChat from "@/pages/user/CoachChat";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import OnboardingOne from "@/pages/onboarding/OnboardingOne";
import OnboardingTwo from "@/pages/onboarding/OnboardingTwo";
import OnboardingThree from "@/pages/onboarding/OnboardingThree";
import OnboardingFour from "@/pages/onboarding/OnboardingFour";
import OnboardingFive from "@/pages/onboarding/OnboardingFive";
import OnboardingDetailsOne from "@/pages/onboarding/OnboardingDetailsOne";
import OnboardingDetailsTwo from "@/pages/onboarding/OnboardingDetailsTwo";

// Central route configuration compatible with useRoutes
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/otp", element: <OTP /> },
  // Onboarding flow
  { path: "/onboarding/one", element: <OnboardingOne /> },
  { path: "/onboarding/two", element: <OnboardingTwo /> },
  { path: "/onboarding/three", element: <OnboardingThree /> },
  { path: "/onboarding/four", element: <OnboardingFour /> },
  { path: "/onboarding/five", element: <OnboardingFive /> },
  // Onboarding details
  { path: "/onboarding/details/one", element: <OnboardingDetailsOne /> },
  { path: "/onboarding/details/two", element: <OnboardingDetailsTwo /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/onboarding/one", element: <OnboardingOne /> },
      { path: "/onboarding/two", element: <OnboardingTwo /> },
      { path: "/onboarding/three", element: <OnboardingThree /> },
      { path: "/onboarding/four", element: <OnboardingFour /> },
      { path: "/onboarding/five", element: <OnboardingFive /> },
      // Onboarding details
      { path: "/onboarding/details/one", element: <OnboardingDetailsOne /> },
      { path: "/onboarding/details/two", element: <OnboardingDetailsTwo /> },
      // {path:"/home",element:<Home/>}
      // { path: "/onboarding/details/one", element: <OnboardingOne /> },
      // { path: "/onboarding/details/one", element: <OnboardingDetailsOne /> },
      // { path: "/onboarding/details/two", element: <OnboardingDetailsTwo /> },
      // { path: "/dashboard/:coach/chat", element: <CoachChat /> },
      // { path: "/coaches", element: <Coaches /> },
      // { path: "/documents", element: <Documents /> },
      // { path: "/settings", element: <SettingsPage /> },
      // { path: "/help", element: <HelpPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
];

export default routes;
