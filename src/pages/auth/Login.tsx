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
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { login, isLoading, completeAuthFromPayload } = useAuth();
  const navigate = useNavigate();
  const redirectTo = useAuthRedirectForAuthPages();
  const magicLinkMutation = useRequestMagicLink();
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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await magicLinkMutation.mutateAsync({ email: email.trim().toLowerCase() });
    setMagicLinkSent(true);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    try { sessionStorage.removeItem("auth:provider"); } catch { /* storage blocked */ }
    e.preventDefault();
    await login(email, password);
  };

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
          <AuthHeader title="Check your email" subtitle={`We sent a sign-in link to ${email}`} />
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. The link expires in 15 minutes.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setMagicLinkSent(false)}
            >
              Try a different email
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              disabled={magicLinkMutation.isPending}
              onClick={async () => {
                await magicLinkMutation.mutateAsync({ email: email.trim().toLowerCase() });
              }}
            >
              {magicLinkMutation.isPending ? "Resending..." : "Resend magic link"}
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
        <AuthHeader title="Sign In with Password" subtitle="Enter your credentials" />

        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <EmailField value={email} onChange={setEmail} />
          <PasswordField value={password} onChange={setPassword} />

          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2" />
            <Link className="underline text-muted-foreground" to="/forgot">Forgot password?</Link>
          </div>

          <Button type="submit" className="w-full mt-8" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">or</span></div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowPasswordLogin(false)}
        >
          Sign in with magic link
        </Button>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Don't have an account? <Link className="underline" to="/signup">Sign Up</Link>
        </p>
      </AuthLayout>
    );
  }

  // Primary: Magic link login
  return (
    <AuthLayout>
      <AuthHeader title="Hello Again" subtitle="Welcome back" />

      <form className="space-y-4" onSubmit={handleMagicLink}>
        <EmailField value={email} onChange={setEmail} />

        <Button type="submit" className="w-full mt-8" disabled={magicLinkMutation.isPending}>
          {magicLinkMutation.isPending ? "Sending..." : "Send Sign-In Link"}
        </Button>
      </form>

      <SocialAuthSection
        onProviderStart={() => setProviderActive(true)}
        onProviderEnd={() => setProviderActive(false)}
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">or</span></div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowPasswordLogin(true)}
      >
        Sign in with password
      </Button>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Don't have an account? <Link className="underline" to="/signup">Sign Up</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground text-center mb-3 font-semibold uppercase tracking-wide">Dev Quick Login</p>
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
