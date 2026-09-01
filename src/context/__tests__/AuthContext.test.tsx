/**
 * @jest-environment jsdom
 */

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { render, screen } from "@testing-library/react";

/* ── Storage mocks ── */
const mockGetToken = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
const mockGetEmail = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
const mockGetPassword = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
const mockReadUser = jest.fn<Promise<Record<string, unknown> | null>, []>().mockResolvedValue(null);
const mockSetToken = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
const mockSetEmail = jest.fn().mockResolvedValue(undefined);
const mockSetPassword = jest.fn().mockResolvedValue(undefined);
const mockSetSession = jest.fn().mockResolvedValue(undefined);
const mockStoreUser = jest.fn().mockResolvedValue(undefined);
const mockClearAuth = jest.fn().mockResolvedValue(undefined);
const mockSetRefreshToken = jest.fn().mockResolvedValue(undefined);
const mockSetRole = jest.fn().mockResolvedValue(undefined);
const mockSetOnboardingFlag = jest.fn().mockResolvedValue(undefined);
const mockRemoveEmail = jest.fn().mockResolvedValue(undefined);
const mockRemovePassword = jest.fn().mockResolvedValue(undefined);
const mockRemoveSession = jest.fn().mockResolvedValue(undefined);
const mockSetNextStep = jest.fn().mockResolvedValue(undefined);
const mockRemoveNextStep = jest.fn().mockResolvedValue(undefined);
const mockGetNextStep = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
const mockSyncAuthToken = jest.fn();

jest.mock("@/lib/storage", () => ({
  getToken: () => mockGetToken(),
  getEmail: () => mockGetEmail(),
  getPassword: () => mockGetPassword(),
  getUser: () => mockReadUser(),
  setToken: (v: string) => mockSetToken(v),
  setEmail: (v: string) => mockSetEmail(v),
  setPassword: (v: string) => mockSetPassword(v),
  setSession: (v: string) => mockSetSession(v),
  setUser: (v: unknown) => mockStoreUser(v),
  clearAuth: () => mockClearAuth(),
  setRefreshToken: (v: string) => mockSetRefreshToken(v),
  setRole: (v: string) => mockSetRole(v),
  setOnboardingFlag: (v: boolean) => mockSetOnboardingFlag(v),
  removeEmail: () => mockRemoveEmail(),
  removePassword: () => mockRemovePassword(),
  removeSession: () => mockRemoveSession(),
  setNextStep: (v: string) => mockSetNextStep(v),
  removeNextStep: () => mockRemoveNextStep(),
  getNextStep: () => mockGetNextStep(),
}));

jest.mock("@/lib/axios", () => ({
  syncAuthToken: (v: string | null) => mockSyncAuthToken(v),
}));

/* ── Mutation mocks ── */
const mockLoginMutateAsync = jest.fn();
const mockSignupMutateAsync = jest.fn();
const mockVerifyOtpMutateAsync = jest.fn();
const mockResendOtpMutateAsync = jest.fn();

jest.mock("@/hooks/auth", () => ({
  useAuthLoginMutation: (opts: Record<string, unknown>) => {
    // store callbacks for testing
    (globalThis as any).__loginOpts = opts;
    return { mutateAsync: mockLoginMutateAsync, isPending: false };
  },
  useAuthSignupMutation: (opts: Record<string, unknown>) => {
    (globalThis as any).__signupOpts = opts;
    return { mutateAsync: mockSignupMutateAsync, isPending: false };
  },
  useAuthVerifyOtpMutation: (opts: Record<string, unknown>) => {
    (globalThis as any).__verifyOtpOpts = opts;
    return { mutateAsync: mockVerifyOtpMutateAsync, isPending: false };
  },
  useResendOtpMutation: (opts: Record<string, unknown>) => {
    (globalThis as any).__resendOtpOpts = opts;
    return { mutateAsync: mockResendOtpMutateAsync, isPending: false };
  },
}));

jest.mock("sonner", () => ({
  // `info`/`warning`/`dismiss` are used by the idle-session timeout the
  // provider now installs. A partial mock here fails inside an effect
  // cleanup, which surfaces as eight unrelated AuthContext failures.
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock("@/services/audit/audit.service", () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock("@/services/magic-auth/magic-auth.service", () => ({
  requestMagicLink: jest.fn().mockResolvedValue({}),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: {
    LOGIN: "/login",
    SIGNUP: "/signup",
    OTP: "/otp",
    HOME: "/home",
    ONBOARDING: { ONE: "/onboarding/one" },
  },
  NEXT_STEPS: {
    VERIFY_MFA: "verify_mfa",
    VERIFY_EMAIL: "verify_email",
  },
}));

jest.mock("@/constants/navigation", () => ({
  HOME_ROUTE_BY_ROLE: {
    user: "/home",
    manager: "/manager/dashboard",
    "company-admin": "/company-admin/dashboard",
    practitioner: "/practitioner/dashboard",
    distributor: "/distributor/dashboard",
    "super-admin": "/super-admin/dashboard",
  },
}));

jest.mock("@/types/roles", () => ({
  ROLE_HIERARCHY: {
    user: 0,
    manager: 1,
    "company-admin": 2,
    practitioner: 3,
    distributor: 4,
    "super-admin": 5,
  },
  isUserRole: (v: string) =>
    ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"].includes(v),
}));

// Import AuthProvider after all mocks
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../useAuth";

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue(null);
    mockGetEmail.mockResolvedValue(null);
    mockGetPassword.mockResolvedValue(null);
    mockReadUser.mockResolvedValue(null);
  });

  describe("useAuth hook", () => {
    test("throws when used outside AuthProvider", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider"
      );
      spy.mockRestore();
    });
  });

  describe("AuthProvider", () => {
    test("renders children", () => {
      render(
        <AuthProvider>
          <div data-testid="child">Hello</div>
        </AuthProvider>
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    test("provides initial state with null user during hydration", () => {
      // getToken resolves to null — no stored auth
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      // During hydration isLoading should be true
      expect(result.current.isLoading).toBe(true);
    });

    test("hydrates user from storage when token exists", async () => {
      mockGetToken.mockResolvedValue("stored-token");
      mockGetEmail.mockResolvedValue("test@example.com");
      mockReadUser.mockResolvedValue({
        email: "test@example.com",
        role: "user",
        isOnboardingCompleted: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.user?.email).toBe("test@example.com");
      expect(result.current.user?.token).toBe("stored-token");
      expect(mockSyncAuthToken).toHaveBeenCalledWith("stored-token");
    });

    test("sets pendingVerification when email+password present but no token", async () => {
      mockGetToken.mockResolvedValue(null);
      mockGetEmail.mockResolvedValue("test@example.com");
      mockGetPassword.mockResolvedValue("password123");
      mockReadUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.pendingVerification).toBe(true);
      });

      expect(result.current.user?.id).toBe("pending");
      expect(result.current.user?.email).toBe("test@example.com");
    });
  });

  describe("hasRole", () => {
    test("returns true when role matches", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "manager" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasRole("manager")).toBe(true);
      expect(result.current.hasRole("user")).toBe(false);
    });
  });

  describe("isAtLeast", () => {
    test("returns true when user role is at or above required level", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "super-admin" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.isAtLeast("user")).toBe(true);
      expect(result.current.isAtLeast("manager")).toBe(true);
      expect(result.current.isAtLeast("super-admin")).toBe(true);
    });

    test("returns false when user role is below required level", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "user" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.isAtLeast("manager")).toBe(false);
      expect(result.current.isAtLeast("super-admin")).toBe(false);
    });
  });

  describe("logout", () => {
    test("clears auth and navigates to login", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "user" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockSyncAuthToken).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  describe("markOnboardingCompleted", () => {
    test("updates user state and storage", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({
        email: "a@b.com",
        role: "user",
        isOnboardingCompleted: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.markOnboardingCompleted();
      });

      expect(mockSetOnboardingFlag).toHaveBeenCalledWith(true);
      expect(result.current.user?.isOnboardingCompleted).toBe(true);
    });
  });

  describe("markFullName", () => {
    test("updates user fullName in state", async () => {
      mockGetToken.mockResolvedValue("tok");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "user" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.markFullName("John Doe");
      });

      expect(result.current.user?.fullName).toBe("John Doe");
    });
  });

  describe("login", () => {
    test("calls loginMutation.mutateAsync with email and password", async () => {
      mockLoginMutateAsync.mockResolvedValue({
        data: { status: true, data: { access_token: "new-tok" } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const res = await result.current.login("Test@Example.com", "password");
        expect(res.status).toBe(true);
      });

      expect(mockSetEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockSetPassword).toHaveBeenCalledWith("password");
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
      });
    });

    test("returns status false on login failure", async () => {
      mockLoginMutateAsync.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const res = await result.current.login("bad@example.com", "wrong");
        expect(res.status).toBe(false);
      });
    });
  });

  describe("signup", () => {
    test("calls signupMutation.mutateAsync and returns true on success", async () => {
      mockSignupMutateAsync.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const res = await result.current.signup("a@b.com", "pass123", "pass123");
        expect(res).toBe(true);
      });

      expect(mockSignupMutateAsync).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "pass123",
        confirmPassword: "pass123",
      });
    });

    test("returns false on signup failure", async () => {
      mockSignupMutateAsync.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const res = await result.current.signup("a@b.com", "pass", "pass");
        expect(res).toBe(false);
      });
    });
  });

  describe("auth:token event", () => {
    test("updates user token on auth:token custom event", async () => {
      mockGetToken.mockResolvedValue("initial-token");
      mockReadUser.mockResolvedValue({ email: "a@b.com", role: "user" });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user?.token).toBe("initial-token");
      });

      act(() => {
        window.dispatchEvent(
          new CustomEvent("auth:token", { detail: { token: "refreshed-token" } })
        );
      });

      await waitFor(() => {
        expect(result.current.user?.token).toBe("refreshed-token");
      });
    });
  });
});
