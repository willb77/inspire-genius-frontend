/**
 * Route Integration Tests
 *
 * Tests route rendering, auth protection, role-based access, 404 handling,
 * and onboarding redirect behavior.
 */
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  // /home resolves to HomeV2 by DEFAULT as of 2026-08-01 (`isNewHomeEnabled`),
  // so the V2 mock is what these route tests land on. The classic page is still
  // mocked — it is what /home/classic renders, and what /home falls back to when
  // the user explicitly opts out via the on-page toggle.
  "@/pages/user/Home": "UserHomePage",
  "@/pages/user/HomeV2": "UserHomeV2Page",
  "@/pages/user/Dashboard": "UserDashboardPage",
  "@/pages/user/Coaches": "UserCoachesPage",
  // V2 stubs. The Wave-1 surfaces became the DEFAULT on 2026-08-06, so /dashboard,
  // /coaches, /documents and /help now land on these rather than the classic
  // pages above. Without stubs the real components mount and drag their whole
  // data layer into a routing test.
  "@/pages/user/DashboardV2": "UserDashboardV2Page",
  "@/pages/user/CoachesV2": "UserCoachesV2Page",
  "@/pages/user/DocumentsV2": "UserDocumentsV2Page",
  "@/pages/user/HelpV2": "UserHelpV2Page",
  "@/pages/user/CoachChat": "UserCoachChatPage",
  "@/pages/user/Documents": "UserDocumentsPage",
  "@/pages/user/Settings": "UserSettingsPage",
  "@/pages/user/Help": "UserHelpPage",
  // /help now renders the support-request surface; the previous Help page (and
  // its V2 re-skin) live at /help/classic.
  "@/pages/user/Support": "UserSupportPage",
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
  // QueryClientProvider mirrors App.tsx, which wraps the whole tree in one.
  // Needed here since 2026-08-06: the new user surfaces became the default, and
  // several of them (DashboardV2, CoachesV2, DocumentsV2) call useQuery on
  // mount. Without a client this harness threw "No QueryClient set" — a gap in
  // the harness rather than in the app, which has always had the provider.
  // A fresh client per render keeps tests isolated; retries off so a failed
  // fetch surfaces immediately instead of stalling the test.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={[initialPath]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
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
      { path: "/home", testId: "UserHomeV2Page" },
      { path: "/home/classic", testId: "UserHomePage" },
      { path: "/dashboard", testId: "UserDashboardV2Page" },
      { path: "/coaches", testId: "UserCoachesV2Page" },
      { path: "/documents", testId: "UserDocumentsV2Page" },
      { path: "/settings", testId: "UserSettingsPage" },
      { path: "/help", testId: "UserSupportPage" },
      // /help/classic is where the Help PAGE lives (/help is the support-request
      // surface), and it resolves V2 like any other Wave-1 surface — so with new
      // as the default since 2026-08-06 it lands on HelpV2, not the classic page.
      { path: "/help/classic", testId: "UserHelpV2Page" },
      { path: "/support", testId: "UserSupportPage" },
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
        expect(await screen.findByTestId("UserHomeV2Page")).toBeInTheDocument();
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
      expect(await screen.findByTestId("UserHomeV2Page")).toBeInTheDocument();
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
      expect(await screen.findByTestId("UserHomeV2Page")).toBeInTheDocument();
    });
  });

  describe("Retired routes", () => {
    // Lumen's Personal coaching was deleted 2026-08-12 — page, hook and
    // question bank. Asserted structurally rather than by rendering because
    // Lumen is entitlement-gated: an unentitled render redirects to /home and
    // would pass whether or not the route still existed.
    function findRoute(path: string) {
      const walk = (list: typeof routes): (typeof routes)[number] | undefined => {
        for (const route of list) {
          if (route.path === path) return route;
          const hit = route.children && walk(route.children);
          if (hit) return hit;
        }
        return undefined;
      };
      return walk(routes);
    }

    it("keeps /vertical/lumen/coaching resolvable, but only as a redirect", () => {
      // The global "*" catch-all sends unmatched paths to /login. Without this
      // redirect an old bookmark would bounce a signed-in user to a login
      // screen, which reads as "you are logged out", not "this page is gone".
      const coaching = findRoute("coaching");
      expect(coaching).toBeDefined();

      const element = coaching?.element as React.ReactElement<{ to: string }>;
      expect(element?.props?.to).toBe("/vertical/lumen/dashboard");
    });

    it("no longer exposes a Lumen coaching page component", () => {
      // A redirect has no children and no lazy element to load. If someone
      // reinstates the page by hanging it back on this path, this fails.
      expect(findRoute("coaching")?.children).toBeUndefined();
    });
  });
});
