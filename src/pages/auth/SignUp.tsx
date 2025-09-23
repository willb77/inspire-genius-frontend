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

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    const ok = await signup("", email, password);
    if (ok) navigate(ROUTES.OTP);
  };
  return (
    <AuthLayout leftTitleOne="Upload. Ask." leftTitleTwo="Analyze. Achieve." subTitle="First things first: let’s set you up with an account.">
      <AuthHeader
        title="Welcome to Inspire Genius"
        subtitle="First things first: let’s set you up with an account."
      />

      <form
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <EmailField value={email} onChange={setEmail} />

        <PasswordField value={password} onChange={setPassword} />

        <PasswordField id="confirm" label="Confirm Password" value={confirm} onChange={setConfirm} />

        <div className="mt-8 flex items-start gap-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms" className="text-muted-foreground text-xs">
            By signing up, I agree with the <a className="underline text-blue-primary" href="#">Terms of Use</a> & <a className="underline text-blue-primary" href="#">Privacy Policy</a>
          </Label>
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isLoading || !email || !password || password !== confirm}>
          {isLoading ? "Creating..." : "Sign Up"}
        </Button>
      </form>

      <SocialAuthSection />

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Already have an account? <Link className="underline" to="/login">Log In</Link>
      </p>
    </AuthLayout>
  );
}
