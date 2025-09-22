import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { IconInput } from "@/components/ui/icon-input";
import { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <IconInput
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            leftIcon={<FiMail className="text-blue-primary" size={18} />}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Enter Password</Label>
          <IconInput
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            leftIcon={<FiLock className="text-blue-primary" size={18} />}
            rightIcon={showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            onRightIconClick={() => setShowPassword((s) => !s)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <IconInput
            id="confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            leftIcon={<FiLock className="text-blue-primary" size={18} />}
            rightIcon={showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            onRightIconClick={() => setShowConfirm((s) => !s)}
          />
        </div>

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

      <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" aria-label="Continue with Google" title="Continue with Google">
          {/* <FaGoogle color="#4285F4" size={18} /> */}
          <img src="/images/auth/google-logo.svg" alt="google" className="h-5" />
        </Button>
        <Button variant="outline" aria-label="Continue with Apple" title="Continue with Apple">
          <img src="/images/auth/apple-logo.svg" alt="apple" className="h-5" />
        </Button>
        <Button variant="outline" aria-label="Continue with Facebook" title="Continue with Facebook">
          <img src="/images/auth/facebook-logo.svg" alt="facebook" className="h-5" />
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Already have an account? <Link className="underline" to="/login">Log In</Link>
      </p>
    </AuthLayout>
  );
}
