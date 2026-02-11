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
function NameField({
  id,
  label,
  placeholder,
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

export function FirstNameField(props: FirstNameFieldProps) {
  return (
    <NameField
      id={props.id ?? "firstName"}
      label={props.label ?? "First Name"}
      placeholder={props.placeholder ?? "Enter your first name"}
      required={props.required ?? true}
      value={props.value}
      onChange={props.onChange}
    />
  );
}

export function LastNameField(props: LastNameFieldProps) {
  return (
    <NameField
      id={props.id ?? "lastName"}
      label={props.label ?? "Last Name"}
      placeholder={props.placeholder ?? "Enter your last name"}
      required={props.required ?? true}
      value={props.value}
      onChange={props.onChange}
    />
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
          let url = res?.data?.login_url;
          if (url) {
            try {
              const u = new URL(url);
              // If Google login, ensure account chooser shows up
              if (/google\.com$/i.test(u.hostname) || u.hostname.includes("accounts.google.")) {
                if (!u.searchParams.has("prompt")) {
                  u.searchParams.set("prompt", "select_account");
                }
                url = u.toString();
              }
            } catch {
              // if URL parsing fails, fall back to original url
            }
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

      <div className="flex justify-center items-center gap-3">
        <Button
          variant="outline"
          aria-label="Continue with Google"
          title="Continue with Google"
          className="min-w-52"
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
        {/* <Button onClick={()=> handleProvider("Facebook")} variant="outline" aria-label="Continue with Facebook" title="Continue with Facebook">
          <img src="/images/auth/facebook-logo.svg" alt="facebook" className="h-5" />
        </Button> */}
      </div>
    </>
  );
}
