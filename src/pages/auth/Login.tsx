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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { login, isLoading } = useAuth();
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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await magicLinkMutation.mutateAsync({ email: email.trim().toLowerCase() });
    setMagicLinkSent(true);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    sessionStorage.removeItem("auth:provider");
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
    </AuthLayout>
  );
}
