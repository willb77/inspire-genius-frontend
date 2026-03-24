import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { type AuthContextValue, type AuthUser } from "@/types/auth";
import {
  getEmail,
  getPassword,
  getToken,
  setEmail,
  setPassword,
  setSession,
  setToken,
  setUser as storeUser,
  getUser as readUser,
  clearAuth,
  setRefreshToken,
  setRole,
  setOnboardingFlag,
  removeEmail,
  removePassword,
  removeSession,
  setNextStep,
  removeNextStep,
  getNextStep,
} from "@/lib/storage";
import { syncAuthToken } from "@/lib/axios";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { NEXT_STEPS, ROUTES } from "@/constants/routes";
import { HOME_ROUTE_BY_ROLE } from "@/constants/navigation";
import { ROLE_HIERARCHY, isUserRole } from "@/types/roles";
import type { UserRole } from "@/types/roles";
import { logAuditEvent } from "@/services/audit/audit.service";
import { useNavigate } from "react-router-dom";
import type { ApiEnvelope, LoginDataPayload } from "@/types/auth/api-types";
import { useAuthLoginMutation, useAuthSignupMutation, useAuthVerifyOtpMutation, useResendOtpMutation } from "@/hooks/auth";
import { requestMagicLink } from "@/services/magic-auth/magic-auth.service";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(false);
  const navigate = useNavigate();

  // hydrate on mount
  useEffect(() => {
    (async () => {
      const [token, stored, email, password] = await Promise.all([
        getToken(),
        readUser(),
        getEmail(),
        getPassword(),
      ]);

      if (token && (stored?.email || email)) {
        setUser({
          id: stored?.id ?? "me",
          email: stored?.email ?? (email as string),
          name: stored?.name ?? null,
          token,
          role: stored?.role ?? null,
          isOnboardingCompleted: stored?.isOnboardingCompleted,
          fullName: stored?.fullName ?? null,
        });
        syncAuthToken(token);
      } else {
        syncAuthToken(null);
        // Preserve pending login state across refresh (OTP step)
        if (email && password) {
          setUser({
            id: "pending",
            email: email as string,
            name: stored?.name ?? null,
            token: null,
            fullName: stored?.fullName ?? null,
          });
          setPendingVerification(true);
        }
      }
      setHydrating(false);
    })();
  }, []);

  // Event-based token sync: update in-memory user token when axios refreshes
  useEffect(() => {
    const onAuthToken = (e: Event) => {
      const detail = (e as CustomEvent<{ token?: string }>).detail;
      const next = detail?.token;
      if (!next) return;
      setUser((prev) => (prev ? { ...prev, token: next } : prev));
      syncAuthToken(next);
    };
    window.addEventListener("auth:token", onAuthToken as EventListener);
    return () => window.removeEventListener("auth:token", onAuthToken as EventListener);
  }, []);

  const computeIsOnboarded = useCallback((v: unknown): boolean => v === true || v === "true", []);

  const navigateAfterAuth = useCallback(
    (role: string | null | undefined, isOnboardingCompleted: boolean) => {
      if (!isOnboardingCompleted) {
        navigate(ROUTES.ONBOARDING.ONE, { replace: true });
        return;
      }
      const normalizedRole = (role ?? "").toLowerCase();
      if (isUserRole(normalizedRole)) {
        navigate(HOME_ROUTE_BY_ROLE[normalizedRole], { replace: true });
      } else {
        // Fallback for legacy roles
        navigate(ROUTES.HOME, { replace: true });
      }
    },
    [navigate]
  );

  const completeAuthFromPayload = useCallback(
    async (
      payload: LoginDataPayload,
      fallbackEmail: string,
      options?: { message?: string; clearNextStep?: boolean }
    ) => {
      const accessToken = payload.access_token ?? null;
      const refreshToken = payload.refresh_token ?? null;
      const resolvedEmail = (payload.email ?? fallbackEmail) as string;
      const role = payload.role ?? null;
      const isOnboardingCompleted = computeIsOnboarded(payload.is_onboarded);
      const userId = payload.user_id ?? null;
      const organizationId = payload.organization_id ?? null;
      const businessId = payload.business_id ?? null;
      const tokenType = payload.token_type ?? null;
      const idToken = payload.id_token ?? null;
      const fullName = payload.full_name ?? null;

      if (accessToken) {
        await setToken(accessToken);
        syncAuthToken(accessToken);
      }
      if (refreshToken) await setRefreshToken(refreshToken);
      if (role) await setRole(role);
      await setOnboardingFlag(isOnboardingCompleted);
      await storeUser({
        email: resolvedEmail,
        role: role ?? undefined,
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
        isOnboardingCompleted,
        userId,
        organizationId,
        businessId,
        tokenType,
        idToken,
        fullName,
      });
      const clearers: Array<Promise<unknown>> = [removeEmail(), removePassword(), removeSession()];
      if (options?.clearNextStep) clearers.push(removeNextStep());
      await Promise.all(clearers);

      setUser({
        id: "me",
        email: resolvedEmail,
        name: null,
        token: accessToken ?? null,
        role: role ?? null,
        isOnboardingCompleted,
        fullName,
      });
      setPendingVerification(false);
      if (options?.message) toast.success(options.message);
      logAuditEvent({ action: "login", actor_email: resolvedEmail, actor_id: userId ?? undefined });
      navigateAfterAuth(role, isOnboardingCompleted);
    },
    [computeIsOnboarded, navigateAfterAuth]
  );

  const loginMutation = useAuthLoginMutation({
    onSuccess: async ({ data, email, password }) => {
      // Some APIs return 200 but embed failure in body
      const failed = data?.status === false || data?.success === false;
      const raw = (data.data ?? {}) as Record<string, unknown>;
      // Normalize PascalCase Cognito keys to snake_case expected by LoginDataPayload
      const payload: LoginDataPayload = {
        ...raw,
        access_token: (raw.access_token ?? raw.AccessToken ?? null) as string | null,
        refresh_token: (raw.refresh_token ?? raw.RefreshToken ?? null) as string | null,
        id_token: (raw.id_token ?? raw.IdToken ?? null) as string | null,
        token_type: (raw.token_type ?? raw.TokenType ?? null) as string | null,
      } as LoginDataPayload;
      // If backend tells us to verify MFA, do that FIRST and return early
      const nextStep: string | undefined = payload.next_step ?? undefined;
      if (failed) {
        const msg = data?.message || "Invalid email or password";
        toast.error(msg);
        if (nextStep === NEXT_STEPS.VERIFY_EMAIL) {
          // Send magic link for email verification instead of OTP
          try {
            await requestMagicLink({ email: email.trim().toLowerCase() });
            toast.success("Check your email for a verification link");
          } catch {
            // Fall back to OTP if magic link fails
            await setEmail(email);
            await setPassword(password);
            await setNextStep(NEXT_STEPS.VERIFY_EMAIL);
            navigate(ROUTES.OTP, { replace: true });
          }
        }
        return;
      }
      // Payload under data.data

      if (nextStep === NEXT_STEPS.VERIFY_MFA) {
        // Send magic link instead of OTP for MFA verification
        try {
          await requestMagicLink({ email: email.trim().toLowerCase() });
          toast.success("Check your email for a sign-in link");
        } catch {
          toast.error("Failed to send magic link. Please try again.");
        }
        return;
      }
      const accessToken = payload.access_token ?? null;
      // If tokens are present, complete login immediately (no OTP)
      if (accessToken) {
        await completeAuthFromPayload(payload, (payload.email ?? email) as string, { message: data?.message });
        return;
      }

      // Otherwise, store session and proceed to OTP as instructed
      await setEmail(email);
      await setPassword(password);
      if (payload.session) await setSession(String(payload.session));
      await storeUser({ email });
      setUser({ id: "pending", email, name: null, token: null });
      setPendingVerification(true);
      toast.success(data?.message);

      // MFA next_step is already handled earlier; no additional branching here
    },
    onError: (err: unknown) => {
      const ax = err as AxiosError<{ message?: string }>;
      const message = ax?.response?.data?.message ?? "Login failed";
      toast.error(message);
    },
  });

  

  const login = useCallback(
    async (email: string, password: string): Promise<{ status: boolean }> => {
      try {
        const emailLc = (email ?? "").trim().toLowerCase();
        await setEmail(emailLc);
        await setPassword(password);
        const result = (await loginMutation.mutateAsync({
          email: emailLc,
          password,
        })) as { data: ApiEnvelope<LoginDataPayload> };
        const failed =
          result?.data?.status === false || result?.data?.success === false;
        return { status: !failed };
      } catch (err) {
        const ax = err as AxiosError<ApiEnvelope<LoginDataPayload>>;
        const nextStep: string | undefined = (ax?.response?.data?.data as Partial<LoginDataPayload> | undefined)?.next_step ?? undefined;
        if (nextStep === NEXT_STEPS.VERIFY_EMAIL) {
          // Send magic link for email verification instead of OTP
          try {
            await requestMagicLink({ email: email.trim().toLowerCase() });
            toast.success("Check your email for a verification link");
          } catch {
            toast.error("Failed to send verification link");
          }
          return { status: false };
        }

        return { status: false };
      }
    },
    [loginMutation, navigate]
  );

  const signupMutation = useAuthSignupMutation({
    onSuccess: async ({ data, email, password }) => {
      const failed = data?.status === false || data?.success === false;
      const payload: LoginDataPayload = (data.data ?? {}) as LoginDataPayload;
      const nextStep: string | undefined = payload.next_step ?? undefined;
         await setEmail(email);
        await setPassword(password);
      if (failed) {
        const msg = data?.message || "Sign up failed";
        toast.error(msg);
        if (nextStep === NEXT_STEPS.VERIFY_EMAIL) {
          // Send magic link for email verification instead of OTP
          try {
            await requestMagicLink({ email: email.trim().toLowerCase() });
            toast.success("Check your email for a verification link");
            navigate(ROUTES.LOGIN, { replace: true });
          } catch {
            // Fall back to OTP if magic link fails
            await setNextStep(NEXT_STEPS.VERIFY_EMAIL);
            navigate(ROUTES.OTP, { replace: true });
          }
        }
        return;
      }

      if (nextStep === NEXT_STEPS.VERIFY_EMAIL) {
        // Send magic link for email verification instead of OTP
        try {
          await requestMagicLink({ email: email.trim().toLowerCase() });
          toast.success("Account created! Check your email for a verification link");
          navigate(ROUTES.LOGIN, { replace: true });
        } catch {
          // Fall back to OTP if magic link fails
          await setNextStep(NEXT_STEPS.VERIFY_EMAIL);
          navigate(ROUTES.OTP, { replace: true });
        }
      }
    },
    onError: (err: unknown) => {
      const ax = err as AxiosError<{ message?: string }>;
      const message = ax?.response?.data?.message ?? "Sign up failed";
      toast.error(message);
    },
  });

  const signup = useCallback(
    async (
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<boolean> => {
      try {
        await signupMutation.mutateAsync({ email, password, confirmPassword });
        return true;
      } catch {
        return false;
      }
    },
    [signupMutation]
  );

  const verifyOtpMutation = useAuthVerifyOtpMutation({
    onSuccess: async (
      payloadObj:
        | {
            mode: "verify_email";
            data: ApiEnvelope;
            email: string;
            password: string;
          }
        | {
            mode: "verify_mfa";
            data: ApiEnvelope<LoginDataPayload>;
            email: string;
          }
    ) => {
      if (payloadObj.mode === "verify_email") {
        const { data } = payloadObj;
        const failed = data?.status === false || data?.success === false;
        if (failed) {
          const msg = data?.message || "OTP verification failed";
          toast.error(msg);
          return;
        }
        // Email verified; clear auth state and go to Login (no auto-login)
        await clearAuth();
        syncAuthToken(null);
        setUser(null);
        setPendingVerification(false);
        toast.success("Email verified. Please login.");
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }
      const { data, email } = payloadObj;
      const failed = data?.status === false || data?.success === false;
      if (failed) {
        const msg = data?.message || "OTP verification failed";
        toast.error(msg);
        return;
      }
      const payload: LoginDataPayload = (data.data ?? {}) as LoginDataPayload;
      await completeAuthFromPayload(payload, email, { message: "Verification successful", clearNextStep: true });
    },
    onError: (err: unknown) => {
      const ax = err as AxiosError<{ message?: string }>;
      const message = ax?.response?.data?.message ?? "OTP verification failed";
      toast.error(message);
    },
  });

  const verifyOtp = useCallback(
    async (otp: string): Promise<boolean> => {
      try {
        await verifyOtpMutation.mutateAsync({ otp });
        return true;
      } catch {
        return false;
      }
    },
    [verifyOtpMutation]
  );

  const resendOtpMutation = useResendOtpMutation({
    onSuccess: (data) => {
      const failed = data?.status === false || data?.success === false;
      if (failed) {
        const msg = data?.message || "Failed to resend OTP";
        toast.error(msg);
      } else {
        toast.success("OTP resent");
      }
    },
    onError: (err: unknown) => {
      const ax = err as AxiosError<{ message?: string }>;
      const message = ax?.response?.data?.message ?? "Failed to resend OTP";
      toast.error(message);
    },
  });

  const resendOtp = useCallback(async (): Promise<boolean> => {
    try {
      const step = (await getNextStep()) ?? undefined;
      if (step === NEXT_STEPS.VERIFY_EMAIL) {
        await resendOtpMutation.mutateAsync();
        return true;
      }
      if (step === NEXT_STEPS.VERIFY_MFA) {
        const email = (await getEmail()) ?? "";
        const password = (await getPassword()) ?? "";
        if (!email || !password) return false;
        const emailLc = email.trim().toLowerCase();
        await loginMutation.mutateAsync({ email: emailLc, password });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [resendOtpMutation, loginMutation]);

  

  // mocked reset password handlers
  const resetPasswordStart = useCallback(
    async (_email: string): Promise<boolean> => {
      void _email;
      return true;
    },
    []
  );
  const resetPasswordConfirm = useCallback(
    async (_code: string, _newPassword: string): Promise<boolean> => {
      void _code;
      void _newPassword;
      return true;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    const email = user?.email;
    await clearAuth();
    syncAuthToken(null);
    setUser(null);
    setPendingVerification(false);
    logAuditEvent({ action: "logout", actor_email: email ?? "unknown" });
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate, user?.email]);

  const markOnboardingCompleted = useCallback(async (): Promise<void> => {
    await setOnboardingFlag(true);
    // update in-memory user
    setUser((prev) => (prev ? { ...prev, isOnboardingCompleted: true } : prev));
    // also persist to stored user object without losing other fields
    try {
      const stored = await readUser();
      if (stored) {
        await storeUser({ ...stored, isOnboardingCompleted: true });
      }
    } catch {
      // ignore storage errors silently
    }
  }, []);

  const markFullName = useCallback(async (fullName: string): Promise<void> => {
    // update in-memory user
    setUser((prev) => (prev ? { ...prev, fullName } : prev));
    // persist to storage without losing other fields
    try {
      const stored = await readUser();
      if (stored) {
        await storeUser({ ...stored, fullName });
      }
    } catch {
      // ignore storage errors silently
    }
  }, []);

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      const userRole = (user?.role ?? "").toLowerCase();
      return userRole === role;
    },
    [user?.role]
  );

  const isAtLeast = useCallback(
    (role: UserRole): boolean => {
      const userRole = (user?.role ?? "").toLowerCase();
      if (!isUserRole(userRole)) return false;
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role];
    },
    [user?.role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      hasRole,
      isAtLeast,
      isLoading:
        hydrating ||
        loginMutation.isPending ||
        signupMutation.isPending ||
        verifyOtpMutation.isPending ||
        resendOtpMutation.isPending,
      pendingVerification,
      login,
      signup,
      verifyOtp,
      resendOtp,
      resetPasswordStart,
      resetPasswordConfirm,
      logout,
      clearAuth,
      setPendingVerification,
      markOnboardingCompleted,
      markFullName,
      completeAuthFromPayload,
    }),
    [
      user,
      hydrating,
      pendingVerification,
      hasRole,
      isAtLeast,
      login,
      signup,
      verifyOtp,
      resendOtp,
      resetPasswordStart,
      resetPasswordConfirm,
      logout,
      markOnboardingCompleted,
      markFullName,
      loginMutation.isPending,
      signupMutation.isPending,
      verifyOtpMutation.isPending,
      resendOtpMutation.isPending,
      completeAuthFromPayload,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
