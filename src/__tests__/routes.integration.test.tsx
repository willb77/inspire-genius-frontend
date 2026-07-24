/**
 * Route Integration Tests
 *
 * Tests route rendering, auth protection, role-based access, 404 handling,
 * and onboarding redirect behavior.
 */
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "@/routes";
import { AuthContext } from "@/context/auth-context";
import type { AuthContextValue, AuthUser } from "@/types/auth/context-types";


// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock secureStorage to avoid crypto errors
jest.mock("@/lib/secureStorage", () => ({
  secureGetItem: jest.fn().mockResolvedValue(null),
  secureSetItem: jest.fn().mockResolvedValue(undefined),
  secureRemoveItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock storage to avoid crypto errors
jest.mock("@/lib/storage", () => ({
  getToken: jest.fn().mockResolvedValue(null),
  setToken: jest.fn().mockResolvedValue(undefined),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  clearAuth: jest.fn().mockResolvedValue(undefined),
  getUser: jest.fn().mockResolvedValue(null),
  setUser: jest.fn().mockResolvedValue(undefined),
  getRole: jest.fn().mockResolvedValue(null),
  getOnboardingFlag: jest.fn().mockResolvedValue(false),
  getUIFlag: jest.fn().mockReturnValue(false),
  setUIFlag: jest.fn(),
}));

// Mock axios
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} }, baseURL: "http://localhost:3000" },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  syncAuthToken: jest.fn(),
}));

// Stub all lazy-loaded page components to render identifiable text
const pageModules: Record<string, string> = {
  "@/pages/auth/Login": "LoginPage",
  "@/pages/auth/SignUp": "SignUpPage",
  "@/pages/auth/ForgotPassword": "ForgotPasswordPage",
  "@/pages/auth/OTP": "OTPPage",
  "@/pages/auth/ResetPassword": "ResetPasswordPage",
  "@/pages/auth/AcceptInvitation": "AcceptInvitationPage",
  "@/pages/auth/SocialLogin": "SocialLoginPage",
  "@/pages/auth/MagicLinkLogin": "MagicLinkLoginPage",
  "@/pages/auth/MagicLinkVerify": "MagicLinkVerifyPage",
  "@/pages/legal/Terms": "TermsPage",
  "@/pages/legal/Privacy": "PrivacyPage",
  "@/pages/PreviewHome": "PreviewHomePage",
  "@/pages/dev/PrismTestHarness": "PrismTestHarnessPage",
  "@/pages/dev/JobBlueprintTestHarness": "JobBlueprintTestHarnessPage",
  "@/pages/onboarding/OnboardingOne": "OnboardingOnePage",
  "@/pages/onboarding/OnboardingTwo": "OnboardingTwoPage",
  "@/pages/onboarding/OnboardingThree": "OnboardingThreePage",
  "@/pages/onboarding/OnboardingFour": "OnboardingFourPage",
  "@/pages/onboarding/OnboardingFive": "OnboardingFivePage",
  "@/pages/onboarding/OnboardingDetailsOne": "OnboardingDetailsOnePage",
  "@/pages/onboarding/OnboardingDetailsTwo": "OnboardingDetailsTwoPage",
  "@/pages/user/Home": "UserHomePage",
  "@/pages/user/Dashboard": "UserDashboardPage",
  "@/pages/user/Coaches": "UserCoachesPage",
  "@/pages/user/CoachChat": "UserCoachChatPage",
  "@/pages/user/Documents": "UserDocumentsPage",
  "@/pages/user/Settings": "UserSettingsPage",
  "@/pages/user/Help": "UserHelpPage",
  "@/pages/user/PrismAssessment": "PrismAssessmentPage",
  "@/pages/user/FeedbackHistory": "FeedbackHistoryPage",
  "@/pages/user/Analytics": "UserAnalyticsPage",
  "@/pages/super-admin/Dashboard": "SuperAdminDashboardPage",
  "@/pages/super-admin/OrganizationManagement": "OrganizationManagementPage",
  "@/pages/super-admin/UserManagement": "UserManagementPage",
  "@/pages/super-admin/IssuesDetailsPage": "IssuesDetailsPage",
  "@/pages/super-admin/IssueDetailPage": "IssueDetailPage",
  "@/pages/super-admin/LicenceDetailsPage": "LicenceDetailsPage",
  "@/pages/super-admin/Settings": "SuperAdminSettingsPage",
  "@/pages/super-admin/OrganizationView": "OrganizationViewPage",
  "@/pages/super-admin/UserCoaches": "UserCoachesPage",
  "@/pages/super-admin/ProjectLog": "ProjectLogPage",
  "@/pages/super-admin/RlhfTraining": "RlhfTrainingPage",
  "@/pages/super-admin/PromptBuilder": "PromptBuilderPage",
  "@/pages/super-admin/Analytics": "SuperAdminAnalyticsPage",
  "@/pages/super-admin/VoiceProviderSettings": "VoiceProviderSettingsPage",
  "@/pages/super-admin/ProcessBuilder": "ProcessBuilderPage",
  "@/pages/super-admin/BulkImport": "SuperAdminBulkImportPage",
  "@/pages/super-admin/trainer/AgentTrainerDashboard": "AgentTrainerDashboardPage",
  "@/pages/super-admin/trainer/PromptStudio": "PromptStudioPage",
  "@/pages/super-admin/trainer/KnowledgeManager": "KnowledgeManagerPage",
  "@/pages/super-admin/trainer/TrainingPlanBuilder": "TrainingPlanBuilderPage",
  "@/pages/super-admin/trainer/CostDashboard": "CostDashboardPage",
  "@/pages/super-admin/trainer/ConversationSimulator": "ConversationSimulatorPage",
  "@/pages/super-admin/trainer/WorkflowDesigner": "WorkflowDesignerPage",
  "@/pages/super-admin/trainer/ExecutionList": "ExecutionListPage",
  "@/pages/super-admin/trainer/ExecutionViewer": "ExecutionViewerPage",
  "@/pages/super-admin/trainer/HitlDashboard": "HitlDashboardPage",
  "@/pages/manager/Dashboard": "ManagerDashboardPage",
  "@/pages/manager/Team": "ManagerTeamPage",
  "@/pages/manager/Hiring": "ManagerHiringPage",
  "@/pages/manager/Candidates": "ManagerCandidatesPage",
  "@/pages/manager/Interviews": "ManagerInterviewsPage",
  "@/pages/manager/JobDna": "ManagerJobDnaPage",
  "@/pages/manager/Training": "ManagerTrainingPage",
  "@/pages/manager/CareerManagement": "ManagerCareerManagementPage",
  "@/pages/manager/TeamBuilding": "ManagerTeamBuildingPage",
  "@/pages/manager/Leadership": "ManagerLeadershipPage",
  "@/pages/manager/PrismTeam": "PrismTeamPage",
  "@/pages/manager/Settings": "ManagerSettingsPage",
  "@/pages/manager/Analytics": "ManagerAnalyticsPage",
  "@/pages/manager/BulkImport": "ManagerBulkImportPage",
  "@/pages/company-admin/Dashboard": "CompanyAdminDashboardPage",
  "@/pages/company-admin/Users": "CompanyAdminUsersPage",
  "@/pages/company-admin/Organization": "CompanyAdminOrganizationPage",
  "@/pages/company-admin/Costs": "CompanyAdminCostsPage",
  "@/pages/company-admin/Settings": "CompanyAdminSettingsPage",
  "@/pages/company-admin/Analytics": "CompanyAdminAnalyticsPage",
  "@/pages/company-admin/BulkImport": "CompanyAdminBulkImportPage",
  "@/pages/practitioner/Home": "PractitionerHomePage",
  "@/pages/practitioner/MeridianChat": "PractitionerMeridianChatPage",
  "@/pages/practitioner/ComingSoon": "PractitionerComingSoonPage",
  "@/pages/practitioner/ClientProfile": "PractitionerClientProfilePage",
  "@/pages/practitioner/Schedule": "PractitionerSchedulePage",
  "@/pages/practitioner/Meeting": "PractitionerMeetingPage",
  "@/pages/practitioner/Dashboard": "PractitionerDashboardPage",
  "@/pages/practitioner/Clients": "PractitionerClientsPage",
  "@/pages/practitioner/Credits": "PractitionerCreditsPage",
  "@/pages/practitioner/PrismClients": "PrismClientsPage",
  "@/pages/practitioner/Settings": "PractitionerSettingsPage",
  "@/pages/practitioner/Analytics": "PractitionerAnalyticsPage",
  "@/pages/distributor/Dashboard": "DistributorDashboardPage",
  "@/pages/distributor/Practitioners": "DistributorPractitionersPage",
  "@/pages/distributor/Credits": "DistributorCreditsPage",
  "@/pages/distributor/Territory": "DistributorTerritoryPage",
  "@/pages/distributor/Settings": "DistributorSettingsPage",
  "@/pages/distributor/Analytics": "DistributorAnalyticsPage",
};

for (const [modulePath, testId] of Object.entries(pageModules)) {
  jest.mock(modulePath, () => {
    const Stub = () => <div data-testid={testId}>{testId}</div>;
    Stub.displayName = testId;
    return { __esModule: true, default: Stub };
  });
}

// Mock LoadingSpinner
jest.mock("@/components/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock LoadingCard (used by ProtectedRoute boot screen)
jest.mock("@/components/loading-inspires-genius/LoadingCard", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-card">Loading...</div>,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    token: "mock-token",
    role: "user",
    isOnboardingCompleted: true,
    ...overrides,
  };
}

function makeAuthContext(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    pendingVerification: false,
    pendingRoleSelection: null,
    selectRole: jest.fn().mockResolvedValue(undefined),
    hasRole: jest.fn(() => false),
    isAtLeast: jest.fn(() => false),
    login: jest.fn().mockResolvedValue({ status: true }),
    signup: jest.fn().mockResolvedValue(true),
    verifyOtp: jest.fn().mockResolvedValue(true),
    resendOtp: jest.fn().mockResolvedValue(true),
    resetPasswordStart: jest.fn().mockResolvedValue(true),
    resetPasswordConfirm: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(undefined),
    clearAuth: jest.fn().mockResolvedValue(undefined),
    setPendingVerification: jest.fn(),
    markOnboardingCompleted: jest.fn().mockResolvedValue(undefined),
    markFullName: jest.fn().mockResolvedValue(undefined),
    completeAuthFromPayload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function AppRoutes() {
  return useRoutes(routes);
}

function renderWithRouter(
  initialPath: string,
  authCtx: AuthContextValue,
) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Route Integration Tests", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper: advance past ProtectedRoute boot timer
  async function advancePastBoot() {
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
  }

  // ── 1. Public routes render correct page components ──────────────────

  describe("Public routes", () => {
    const publicRoutes: Array<{ path: string; testId: string }> = [
      { path: "/login", testId: "LoginPage" },
      { path: "/signup", testId: "SignUpPage" },
      { path: "/otp", testId: "OTPPage" },
      { path: "/forgot", testId: "ForgotPasswordPage" },
      { path: "/reset-password", testId: "ResetPasswordPage" },
      { path: "/accept-invitation", testId: "AcceptInvitationPage" },
      { path: "/social-login", testId: "SocialLoginPage" },
      { path: "/terms", testId: "TermsPage" },
      { path: "/privacy", testId: "PrivacyPage" },
    ];

    it.each(publicRoutes)(
      "renders $testId at $path",
      async ({ path, testId }) => {
        const ctx = makeAuthContext();
        renderWithRouter(path, ctx);
        expect(await screen.findByTestId(testId)).toBeInTheDocument();
      },
    );

    it("renders magic-login page", async () => {
      const ctx = makeAuthContext();
      renderWithRouter("/magic-login", ctx);
      expect(await screen.findByTestId("MagicLinkLoginPage")).toBeInTheDocument();
    });

    it("redirects / to /login", async () => {
      const ctx = makeAuthContext();
      renderWithRouter("/", ctx);
      expect(await screen.findByTestId("LoginPage")).toBeInTheDocument();
    });
  });

  // ── 2. Protected routes redirect to /login when unauthenticated ──────

  describe("Protected routes redirect when unauthenticated", () => {
    const protectedPaths = [
      "/home",
      "/dashboard",
      "/coaches",
      "/documents",
      "/settings",
      "/help",
      "/super-admin/dashboard",
      "/manager/dashboard",
      "/company-admin/dashboard",
      "/practitioner/dashboard",
      "/distributor/dashboard",
      "/onboarding/one",
    ];

    it.each(protectedPaths)(
      "redirects %s to /login when not authenticated",
      async (path) => {
        const ctx = makeAuthContext({ user: null });
        renderWithRouter(path, ctx);
        await advancePastBoot();
        // Should redirect to login — login page should render
        expect(await screen.findByTestId("LoginPage")).toBeInTheDocument();
      },
    );
  });

  // ── 3. Role-based route access ───────────────────────────────────────

  describe("Role-based access: user role", () => {
    const userAccessible = [
      { path: "/home", testId: "UserHomePage" },
      { path: "/dashboard", testId: "UserDashboardPage" },
      { path: "/coaches", testId: "UserCoachesPage" },
      { path: "/documents", testId: "UserDocumentsPage" },
      { path: "/settings", testId: "UserSettingsPage" },
      { path: "/help", testId: "UserHelpPage" },
    ];

    it.each(userAccessible)(
      "user can access $path",
      async ({ path, testId }) => {
        const user = makeAuthUser({ role: "user" });
        const ctx = makeAuthContext({ user });
        renderWithRouter(path, ctx);
        await advancePastBoot();
        expect(await screen.findByTestId(testId)).toBeInTheDocument();
      },
    );

    const userDenied = [
      "/super-admin/dashboard",
      "/manager/dashboard",
      "/company-admin/dashboard",
      "/practitioner/dashboard",
      "/distributor/dashboard",
    ];

    it.each(userDenied)(
      "user CANNOT access %s (redirects to home)",
      async (path) => {
        const user = makeAuthUser({ role: "user" });
        const ctx = makeAuthContext({ user });
        renderWithRouter(path, ctx);
        await advancePastBoot();
        // User should be redirected to /home
        expect(await screen.findByTestId("UserHomePage")).toBeInTheDocument();
      },
    );
  });

  describe("Role-based access: manager role", () => {
    const managerAccessible = [
      { path: "/manager/dashboard", testId: "ManagerDashboardPage" },
      { path: "/manager/team", testId: "ManagerTeamPage" },
      { path: "/manager/hiring", testId: "ManagerHiringPage" },
    ];

    it.each(managerAccessible)(
      "manager can access $path",
      async ({ path, testId }) => {
        const user = makeAuthUser({ role: "manager" });
        const ctx = makeAuthContext({ user });
        renderWithRouter(path, ctx);
        await advancePastBoot();
        expect(await screen.findByTestId(testId)).toBeInTheDocument();
      },
    );

    it("manager CANNOT access /super-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "manager" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/super-admin/dashboard", ctx);
      await advancePastBoot();
      // Manager redirected to their home route: /manager/dashboard
      expect(await screen.findByTestId("ManagerDashboardPage")).toBeInTheDocument();
    });

    it("manager CANNOT access /company-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "manager" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/company-admin/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("ManagerDashboardPage")).toBeInTheDocument();
    });
  });

  describe("Role-based access: company-admin role", () => {
    it("company-admin can access /company-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "company-admin" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/company-admin/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("CompanyAdminDashboardPage")).toBeInTheDocument();
    });

    it("company-admin CANNOT access /super-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "company-admin" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/super-admin/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("CompanyAdminDashboardPage")).toBeInTheDocument();
    });
  });

  describe("Role-based access: practitioner role", () => {
    it("practitioner /practitioner/dashboard redirects to Home (old mock retired)", async () => {
      const user = makeAuthUser({ role: "practitioner" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/practitioner/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("PractitionerHomePage")).toBeInTheDocument();
    });

    it("practitioner CANNOT access /super-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "practitioner" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/super-admin/dashboard", ctx);
      await advancePastBoot();
      // Redirected to the practitioner home route (now /practitioner/home).
      expect(await screen.findByTestId("PractitionerHomePage")).toBeInTheDocument();
    });
  });

  describe("Role-based access: distributor role", () => {
    it("distributor can access /distributor/dashboard", async () => {
      const user = makeAuthUser({ role: "distributor" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/distributor/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("DistributorDashboardPage")).toBeInTheDocument();
    });

    it("distributor CANNOT access /super-admin/dashboard", async () => {
      const user = makeAuthUser({ role: "distributor" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/super-admin/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("DistributorDashboardPage")).toBeInTheDocument();
    });
  });

  describe("Role-based access: super-admin role", () => {
    // Wave 0 Lane A — /super-admin/team and /super-admin/coaches now redirect
    // to /super-admin/users and /super-admin/mentor-management respectively;
    // /super-admin/audit-log redirects to /super-admin/analytics?tab=audit.
    // Direct redirect behavior is exercised in the redirects describe block below.
    const superAdminRoutes = [
      { path: "/super-admin/dashboard", testId: "SuperAdminDashboardPage" },
      { path: "/super-admin/users", testId: "UserManagementPage" },
      { path: "/super-admin/settings", testId: "SuperAdminSettingsPage" },
    ];

    it.each(superAdminRoutes)(
      "super-admin can access $path",
      async ({ path, testId }) => {
        const user = makeAuthUser({ role: "super-admin" });
        const ctx = makeAuthContext({ user });
        renderWithRouter(path, ctx);
        await advancePastBoot();
        expect(await screen.findByTestId(testId)).toBeInTheDocument();
      },
    );

    it("super-admin can also access /manager/dashboard", async () => {
      const user = makeAuthUser({ role: "super-admin" });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/manager/dashboard", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("ManagerDashboardPage")).toBeInTheDocument();
    });
  });

  // ── 4. 404/wildcard redirect to /login ───────────────────────────────

  describe("404 handling", () => {
    it("unknown route redirects to /login", async () => {
      const ctx = makeAuthContext();
      renderWithRouter("/this-does-not-exist", ctx);
      expect(await screen.findByTestId("LoginPage")).toBeInTheDocument();
    });

    it("deeply nested unknown route redirects to /login", async () => {
      const ctx = makeAuthContext();
      renderWithRouter("/foo/bar/baz/qux", ctx);
      expect(await screen.findByTestId("LoginPage")).toBeInTheDocument();
    });
  });

  // ── 5. Onboarding redirect when incomplete ──────────────────────────

  describe("Onboarding redirect", () => {
    it("does NOT force onboarding when incomplete — lands on /home (forced onboarding disabled 2026-07-21)", async () => {
      const user = makeAuthUser({
        role: "user",
        isOnboardingCompleted: false,
      });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/home", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("UserHomePage")).toBeInTheDocument();
      expect(screen.queryByTestId("OnboardingOnePage")).not.toBeInTheDocument();
    });

    it("allows access to onboarding routes when onboarding incomplete", async () => {
      const user = makeAuthUser({
        role: "user",
        isOnboardingCompleted: false,
      });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/onboarding/two", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("OnboardingTwoPage")).toBeInTheDocument();
    });

    it("allows access to /home when onboarding is completed", async () => {
      const user = makeAuthUser({
        role: "user",
        isOnboardingCompleted: true,
      });
      const ctx = makeAuthContext({ user });
      renderWithRouter("/home", ctx);
      await advancePastBoot();
      expect(await screen.findByTestId("UserHomePage")).toBeInTheDocument();
    });
  });
});
