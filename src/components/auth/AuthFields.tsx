import { useState } from "react";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/ui/icon-input";
import { Button } from "@/components/ui/button";
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { type FirstNameFieldProps,type LastNameFieldProps, type EmailFieldProps, type PasswordFieldProps } from "@/types/auth";
import { useSocialAuthLoginUrlMutation } from "@/hooks/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types/auth/api-types";
export function FirstNameField({
  id = "firstName",
  label = "First Name",
  placeholder = "Enter your first name",
  required = true,
  value,
  onChange,
}: FirstNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <IconInput
        id={id}
        type="text"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftIcon={<FiUser className="text-blue-primary" size={18} />}
      />
    </div>
  );
}

export function LastNameField({
  id = "lastName",
  label = "Last Name",
  placeholder = "Enter your last name",
  required = true,
  value,
  onChange,
}: LastNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <IconInput
        id={id}
        type="text"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftIcon={<FiUser className="text-blue-primary" size={18} />}
      />
    </div>
  );
}

export function EmailField({
  id = "email",
  label = "Email Address",
  placeholder = "you@example.com",
  required = true,
  value,
  onChange,
}: EmailFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <IconInput
        id={id}
        type="email"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftIcon={<FiMail className="text-blue-primary" size={18} />}
      />
    </div>
  );
}

export function PasswordField({
  id = "password",
  label = "Enter Password",
  placeholder = "••••••••",
  required = true,
  value,
  onChange,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <IconInput
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftIcon={<FiLock className="text-blue-primary" size={18} />}
        rightIcon={show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        onRightIconClick={() => setShow((s) => !s)}
      />
    </div>
  );
}

type SocialAuthSectionProps = {
  onProviderStart?: (provider: string) => void;
  onProviderEnd?: () => void;
};

export function SocialAuthSection({ onProviderStart, onProviderEnd }: SocialAuthSectionProps = {}) {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const socialLogin = useSocialAuthLoginUrlMutation();

  const handleProvider = (provider: string) => {
    setActiveProvider(provider);
    try {
      sessionStorage.setItem("auth:provider", provider);
    } catch {
      setActiveProvider((p) => p);
    }
    onProviderStart?.(provider);
    socialLogin.mutate(
      { provider },
      {
        onSuccess: (res) => {
          const url = res?.data?.login_url;
          if (url) {
            window.location.href = url;
          } else {
            toast.error("Login URL not received");
          }
        },
        onError: (err: AxiosError<ApiEnvelope>) => {
          const msg = err?.response?.data?.message ?? err?.message ?? "Failed to start social login";
          toast.error(msg);
        },
        onSettled: () => {
          setActiveProvider(null);
          onProviderEnd?.();
        },
      }
    );
  };

  return (
    <>
      <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 items-center gap-3">
        <Button
          variant="outline"
          aria-label="Continue with Google"
          title="Continue with Google"
          disabled={socialLogin.isPending && activeProvider === "Google"}
          onClick={() => handleProvider("Google")}
        >
          {socialLogin.isPending && activeProvider === "Google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <img src="/images/auth/google-logo.svg" alt="google" className="h-5" />
          )}
        </Button>
        {/* <Button  variant="outline" aria-label="Continue with Apple" title="Continue with Apple">
          <img src="/images/auth/apple-logo.svg" alt="apple" className="h-5" />
        </Button> */}
        <Button onClick={()=> handleProvider("Facebook")} variant="outline" aria-label="Continue with Facebook" title="Continue with Facebook">
          <img src="/images/auth/facebook-logo.svg" alt="facebook" className="h-5" />
        </Button>
      </div>
    </>
  );
}
