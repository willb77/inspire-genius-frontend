import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import type { LoginDataPayload } from "@/types/auth/api-types";
import { useMeWithTokenQuery } from "@/hooks/auth/useMeWithTokenQuery";
import { useAuth } from "@/context/useAuth";

export type SocialLoginState = {
  status: "idle" | "processing" | "error" | "done";
  error?: string;
};

export function useSocialLogin(): SocialLoginState {
  const navigate = useNavigate();
  const { completeAuthFromPayload } = useAuth();
  const { search } = useLocation();
  const dispatchedRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const errorParam = params.get("error");
  const token = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  // Query /v1/me via reusable query hook (enabled only if token exists)
  const meQuery = useMeWithTokenQuery(token, true);

  // Derive status without mutating local state
  const status: SocialLoginState["status"] = useMemo(() => {
    if (errorParam) return "error";
    if (!token) return "error"; // missing token
    if (meQuery.isLoading) return "processing";
    if (meQuery.isError) return "error";
    if (meQuery.isSuccess) return "done";
    return "idle";
  }, [errorParam, token, meQuery.isLoading, meQuery.isError, meQuery.isSuccess]);

  // Redirect on error states
  useEffect(() => {
    if (status !== "error") return;
    const msg =
      errorParam || (!token ? "Your email not exist or already registerd please login with email" : (meQuery.error as unknown as Error)?.message || "Social login failed");
    toast.error(msg);
    navigate("/login", { replace: true });
  }, [status, errorParam, token, meQuery.error, navigate]);

  // On success, build payload and complete auth (awaited)
  useEffect(() => {
    if (dispatchedRef.current) return;
    if (status !== "done") return;
    const me = (meQuery.data?.data ?? {}) as Partial<{
      user_id: string;
      email: string;
      full_name: string | null;
      has_profile: boolean;
      is_onboarded: boolean | string;
      role: string;
      organization_id: string | null;
      business_id: string | null;
      password_change_allowed: boolean;
    }>;

    const payload: LoginDataPayload = {
      access_token: token ?? null,
      refresh_token: refreshToken ?? null,
      id_token: null,
      token_type: null,
      user_id: me.user_id ?? null,
      full_name: me.full_name ?? null,
      email: me.email ?? null,
      role: me.role ?? null,
      has_profile: me.has_profile ?? null,
      is_onboarded: (me.is_onboarded as unknown as boolean | string | null) ?? null,
      organization_id: (me.organization_id as string | null) ?? null,
      business_id: (me.business_id as string | null) ?? null,
      mfa_required: null,
      next_step: null,
      session: null,
    };

    (async () => {
      try {
        await completeAuthFromPayload(payload, me.email ?? "", {
          message: "Login successful",
          clearNextStep: true,
        });
        sessionStorage.removeItem("auth:provider");
      } catch (err) {
        const msg = (err as Error)?.message || "Failed to complete login";
        toast.error(msg);
        navigate("/login", { replace: true });
        return;
      } finally {
        dispatchedRef.current = true;
      }
    })();
  }, [status, meQuery.data, token, refreshToken, navigate]);

  return { status };
}
