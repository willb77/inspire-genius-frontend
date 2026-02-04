import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
// NOTE: Removed unused remember-me UI imports; restore via git history if needed.
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/useAuth";
import { EmailField, PasswordField, SocialAuthSection } from "@/components/auth/AuthFields";
import { useAuthRedirectForAuthPages } from "@/hooks/useAuthRedirectForAuthPages";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const redirectTo = useAuthRedirectForAuthPages();
  const [providerActive, setProviderActive] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem("auth:provider"));
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    if (!redirectTo) return;
    // Skip redirect if a social provider flow is in progress
    let inProgress = providerActive;
    try {
      inProgress = inProgress || Boolean(sessionStorage.getItem("auth:provider"));
    } catch {
      setProviderActive((s) => s);
    }
    if (!inProgress) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate, providerActive])

  
  const handleSubmit = async (e: React.FormEvent) => {
    sessionStorage.removeItem("auth:provider");
    e.preventDefault();
    // Navigation is handled by the login mutation
    await login(email, password);
  };
  return (
    <AuthLayout>
      <AuthHeader title="Hello Again" subtitle="Welcome back" />

      <form
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <EmailField value={email} onChange={setEmail} />

        <PasswordField value={password} onChange={setPassword} />

        <div className="mt-6 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {/* NOTE: Removed remember-me UI; restore via git history if needed. */}
          </div>
          <Link className="underline text-muted-foreground" to="/forgot">Forgot password?</Link>
        </div>

        <Button type="submit" className="w-full mt-8" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <SocialAuthSection
        onProviderStart={() => setProviderActive(true)}
        onProviderEnd={() => setProviderActive(false)}
      />

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Don’t have an account? <Link className="underline" to="/signup">Sign Up</Link>
      </p>
    </AuthLayout>
  );
}
