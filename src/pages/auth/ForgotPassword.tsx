import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/ui/icon-input";
import { useState } from "react";
import { FiMail } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useRequestPasswordReset } from "@/hooks/auth/useRequestPasswordReset";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const resetMutation = useRequestPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await resetMutation.mutateAsync(
      { email },
      {
        onSuccess: () => navigate(ROUTES.LOGIN),
      }
    );
  };

  return (
    <AuthLayout
      leftTitleOne="Upload. Ask."
      leftTitleTwo="Analyze. Achieve."
      subTitle="Reset your password in a few steps."
    >
      <AuthHeader
        title="Forgot Password"
        subtitle="Enter your email and we'll send you a verification code"
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={resetMutation.isPending || !email}
        >
          {resetMutation.isPending ? "Sending..." : "Send Link"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Remembered your password?{" "}
        <Link className="underline" to={ROUTES.LOGIN}>
          Log In
        </Link>
      </p>
    </AuthLayout>
  );
}
