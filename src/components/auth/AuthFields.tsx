import { useState } from "react";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/ui/icon-input";
import { Button } from "@/components/ui/button";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { type EmailFieldProps, type PasswordFieldProps } from "@/types/auth";

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

export function SocialAuthSection() {
  return (
    <>
      <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" aria-label="Continue with Google" title="Continue with Google">
          <img src="/images/auth/google-logo.svg" alt="google" className="h-5" />
        </Button>
        <Button variant="outline" aria-label="Continue with Apple" title="Continue with Apple">
          <img src="/images/auth/apple-logo.svg" alt="apple" className="h-5" />
        </Button>
        <Button variant="outline" aria-label="Continue with Facebook" title="Continue with Facebook">
          <img src="/images/auth/facebook-logo.svg" alt="facebook" className="h-5" />
        </Button>
      </div>
    </>
  );
}
