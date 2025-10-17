import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { OtpInputField } from "@/components/shared/OtpInputField";
import { useAuth } from "@/context/useAuth";
import { useAuthRedirectForAuthPages } from "@/hooks/useAuthRedirectForAuthPages";
// Navigation is handled inside AuthContext; no local routing needed here

export default function OTP() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60); // 1:45 like the mock
  const { verifyOtp, resendOtp, isLoading } = useAuth();
  const redirectTo = useAuthRedirectForAuthPages();

  useEffect(() => {
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate]);

  // Handlers
  const handleVerify = async () => {
    if (value.length !== 6) return;
    await verifyOtp(value);

  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    const ok = await resendOtp();
    if (ok) setSecondsLeft(60);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-verify when full OTP is entered (typing or paste)
  useEffect(() => {
    if (value.length === 6 && !isLoading) {
      void handleVerify();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Navigation after verification is handled in AuthContext and by route guards

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <AuthLayout>
      <AuthHeader
        title="Almost Done"
        subtitle="Please type the code we sent you in your email"
      />

      <div className="space-y-6 w-full">
        <div className="flex justify-start">
          <OtpInputField
            value={value}
            onChange={setValue}
            inputClassName="md:h-[3.8rem] md:w-[3.8rem] h-10 w-10 rounded-lg border border-gray-10 bg-transparent text-lg text-center shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
          />
        </div>

        <Button
          className="w-full h-11"
          disabled={value.length !== 6 || isLoading}
          onClick={handleVerify}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </Button>

        <div className="text-xs flex items-center justify-center gap-4">
          <span className="text-foreground">
            {mm}:{ss}s
          </span>
          <button
            type="button"
            disabled={secondsLeft > 0 || isLoading}
            className={secondsLeft > 0 ? "text-muted-foreground" : "text-primary underline"}
            onClick={handleResend}
          >
            Resend code
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-auto">
          Already have an account?{" "}
          <a
            className="underline text-blue-primary font-semibold"
            href="/login"
          >
            Log In
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
