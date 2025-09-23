import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { EmailField, PasswordField, SocialAuthSection } from "@/components/auth/AuthFields";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate(ROUTES.OTP);
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
            <Checkbox id="remember" />
            <Label htmlFor="remember" className="text-muted-foreground">Remember me</Label>
          </div>
          <Link className="underline text-muted-foreground" to="/forgot">Forgot password?</Link>
        </div>

        <Button type="submit" className="w-full mt-8" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <SocialAuthSection />

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Don’t have an account? <Link className="underline" to="/signup">Sign Up</Link>
      </p>
    </AuthLayout>
  );
}
