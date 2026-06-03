import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/useAuth";
import { EmailField, PasswordField, SocialAuthSection } from "@/components/auth/AuthFields";
import { useAuthRedirectForAuthPages } from "@/hooks/useAuthRedirectForAuthPages";
import { useRequestMagicLink } from "@/hooks/magic-auth/useMagicAuth";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { LoginDataPayload } from "@/types/auth/api-types";
import type { UserRole } from "@/types/roles";

// Dev bypass accounts — only rendered in development mode
const DEV_ACCOUNTS: { label: string; role: UserRole; email: string; name: string }[] = [
  { label: "User", role: "user", email: "user@test.com", name: "Test User" },
  { label: "Manager", role: "manager", email: "manager@test.com", name: "Test Manager" },
  { label: "Company Admin", role: "company-admin", email: "companyadmin@test.com", name: "Company Admin" },
  { label: "Practitioner", role: "practitioner", email: "practitioner@test.com", name: "Test Practitioner" },
  { label: "Distributor", role: "distributor", email: "distributor@test.com", name: "Test Distributor" },
  { label: "Super Admin", role: "super-admin", email: "admin@test.com", name: "Super Admin" },
  { label: "Tone", role: "user", email: "tone99@3pp.com", name: "Tone" },
];

// Login Hardening Plan v2 — Phase 1. Staging-b builds set
// VITE_LOGIN_HARDENED=true to render enhanced UX (visible 15-min TTL hint,
// "Email not arriving?" fallback link, "Forgot password? Use magic-link"
// cross-link). Dev / prod default to undefined → same UI as today. Env-var
// gate keeps the changes reversible per-env without code changes.
const LOGIN_HARDENED = import.meta.env.VITE_LOGIN_HARDENED === 'true';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, isLoading, completeAuthFromPayload } = useAuth();
  const navigate = useNavigate();
  const redirectTo = useAuthRedirectForAuthPages();
  const magicLinkMutation = useRequestMagicLink();
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [providerActive, setProviderActive] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem("auth:provider"));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!redirectTo) return;
    let inProgress = providerActive;
    try {
      inProgress = inProgress || Boolean(sessionStorage.getItem("auth:provider"));
    } catch {
      setProviderActive((s) => s);
    }
    if (!inProgress) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate, providerActive])

  const handleDevLogin = async (acct: typeof DEV_ACCOUNTS[number]) => {
    const payload: LoginDataPayload = {
      access_token: `dev-token-${acct.role}-${Date.now()}`,
      refresh_token: `dev-refresh-${acct.role}-${Date.now()}`,
      token_type: "Bearer",
      user_id: `dev-${acct.role}`,
      email: acct.email,
      full_name: acct.name,
      role: acct.role,
      has_profile: true,
      is_onboarded: true,
      organization_id: null,
      business_id: null,
      mfa_required: false,
      next_step: null,
    };
    await completeAuthFromPayload(payload, acct.email, { message: `Dev login: ${acct.label}` });
  };

  const validateEmail = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setSubmitting(true);
    try {
      await magicLinkMutation.mutateAsync({ email: email.trim().toLowerCase() });
      setMagicLinkSent(true);
    } catch {
      // Error already surfaced by React Query onError + axios interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }
    try { sessionStorage.removeItem("auth:provider"); } catch { /* storage blocked */ }
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.status) {
        // login() already shows toast on error via mutation onError
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = isLoading || submitting || magicLinkMutation.isPending;

  // Magic link sent confirmation screen
  if (magicLinkSent) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-teal-50 p-4 rounded-full">
              <Mail className="size-8 text-teal-600" />
            </div>
          </div>
          <AuthHeader title={t('magicLink.checkEmail')} subtitle={t('magicLink.sentTo', { email })} />
          <p className="text-sm text-muted-foreground">
            {t('magicLink.clickLink')}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setMagicLinkSent(false)}
            >
              {t('magicLink.tryDifferentEmail')}
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              disabled={magicLinkMutation.isPending}
              onClick={async () => {
                await magicLinkMutation.mutateAsync({ email: email.trim().toLowerCase() });
              }}
            >
              {magicLinkMutation.isPending ? t('magicLink.resending') : t('magicLink.resend')}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Password login form (secondary)
  if (showPasswordLogin) {
    return (
      <AuthLayout>
        <AuthHeader title={t('login.passwordTitle')} subtitle={t('login.passwordSubtitle')} />

        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <EmailField value={email} onChange={setEmail} />
          <p className="text-xs text-muted-foreground">
            You can sign in with your primary or secondary email address
          </p>
          <PasswordField value={password} onChange={setPassword} />

          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2" />
            <Link className="underline text-muted-foreground" to="/forgot">{t('login.forgotPassword')}</Link>
          </div>

          <Button type="submit" className="w-full mt-8" disabled={isBusy}>
            {isBusy ? t('login.loggingIn') : t('login.submit')}
          </Button>

          {LOGIN_HARDENED && (
            <p className="text-xs text-muted-foreground text-center">
              Forgot your password?{' '}
              <button
                type="button"
                className="underline text-blue-primary hover:text-blue-700"
                onClick={() => setShowPasswordLogin(false)}
              >
                Use a magic-link instead
              </button>
              .
            </p>
          )}
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">{tc('or')}</span></div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          disabled={isBusy}
          onClick={() => setShowPasswordLogin(false)}
        >
          {t('login.signInWithMagicLink')}
        </Button>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          {tc('noAccount')} <Link className="underline" to="/signup">{tc('signUp')}</Link>
        </p>
      </AuthLayout>
    );
  }

  // Primary: Magic link login
  return (
    <AuthLayout>
      <AuthHeader title={t('login.title')} subtitle={t('login.subtitle')} />

      <form className="space-y-4" onSubmit={handleMagicLink}>
        <EmailField value={email} onChange={setEmail} />
        <p className="text-xs text-muted-foreground">
          You can sign in with your primary or secondary email address
        </p>

        <Button type="submit" className="w-full mt-8" disabled={isBusy}>
          {isBusy ? t('login.sending') : t('login.sendSignInLink')}
        </Button>

        {LOGIN_HARDENED && (
          <p className="text-xs text-muted-foreground text-center">
            We'll email you a one-time sign-in link, valid for 15 minutes.
          </p>
        )}
      </form>

      <SocialAuthSection
        onProviderStart={() => setProviderActive(true)}
        onProviderEnd={() => setProviderActive(false)}
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">{tc('or')}</span></div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        disabled={isBusy}
        onClick={() => setShowPasswordLogin(true)}
      >
        {t('login.signInWithPassword')}
      </Button>

      {LOGIN_HARDENED && (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Email not arriving? Check spam or{' '}
          <button
            type="button"
            className="underline text-blue-primary hover:text-blue-700"
            onClick={() => setShowPasswordLogin(true)}
          >
            sign in with password instead
          </button>
          .
        </p>
      )}

      <p className="mt-6 text-sm text-muted-foreground text-center">
        {tc('noAccount')} <Link className="underline" to="/signup">{tc('signUp')}</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground text-center mb-3 font-semibold uppercase tracking-wide">{t('login.devQuickLogin')}</p>
          <div className="grid grid-cols-2 gap-2">
            {DEV_ACCOUNTS.map((acct) => (
              <Button
                key={acct.role}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleDevLogin(acct)}
              >
                {acct.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
