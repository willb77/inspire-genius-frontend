import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/useAuth";
import { EmailField, PasswordField, SocialAuthSection } from "@/components/auth/AuthFields";
import { useForm } from "react-hook-form";
import { useAuthRedirectForAuthPages } from "@/hooks/useAuthRedirectForAuthPages";
import { useTranslation } from "react-i18next";

export default function SignUp() {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const redirectTo = useAuthRedirectForAuthPages();
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [providerActive, setProviderActive] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem("auth:provider"));
    } catch {
      return false;
    }
  });

  const { handleSubmit, setValue, watch, formState: { dirtyFields } } = useForm<{ email: string; password: string; confirm: string; terms: boolean }>({
    mode: "onChange",
    defaultValues: { email: "", password: "", confirm: "", terms: false },
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
  }, [redirectTo, navigate, providerActive]);

  const email = watch("email") ?? "";
  const password = watch("password") ?? "";
  const confirm = watch("confirm") ?? "";
  const [pwdFocused, setPwdFocused] = useState(false);
  const terms = watch("terms") ?? false;
  const rules = useMemo(() => ({
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);
  const unmet: string[] = useMemo(() => {
    const arr: string[] = []
    if (!rules.hasUpper) arr.push('Uppercase')
    if (!rules.hasLower) arr.push('Lowercase')
    if (!rules.hasNumber) arr.push('Number')
    if (!rules.hasSpecial) arr.push('Special')
    return arr
  }, [rules])

  // Submit handler
  const onSubmit = async (values: { email: string; password: string; confirm: string; terms: boolean }) => {
    sessionStorage.removeItem("auth:provider");
    if (values.password !== values.confirm) return;
    if (!values.terms) return;
    await signup(values.email, values.password, values.confirm);
  };
  return (
    <AuthLayout leftTitleOne={t('signup.leftTitleOne')} leftTitleTwo={t('signup.leftTitleTwo')} subTitle={t('signup.subtitle')}>
      <AuthHeader
        title={t('signup.title')}
        subtitle={t('signup.subtitle')}
      />

      <form
        className="space-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <EmailField value={email} onChange={(v) => setValue("email", v, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} />

        <div role="group" aria-label="Password" onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}>
          <PasswordField value={password} onChange={(v) => setValue("password", v, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} />
          {(pwdFocused || dirtyFields.password) && password && unmet.length > 0 && (
            <p className="text-left mt-2 text-xs text-red-500">At least one {unmet.join(', ')}</p>
          )}
        </div>

        <div>
          <PasswordField id="confirm" label={t('signup.confirmPassword')} value={confirm} onChange={(v) => setValue("confirm", v, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} />
          {dirtyFields.confirm && confirm && password !== confirm && (
            <p className="text-left mt-2 text-xs text-red-500">{t('signup.passwordsDoNotMatch')}</p>
          )}

        </div>

        <div className="mt-8 flex items-start gap-2">
          <Checkbox id="terms" checked={!!terms} onCheckedChange={(v) => setValue("terms", Boolean(v), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} />
          <Label htmlFor="terms" className="text-muted-foreground text-xs">
            {t('signup.termsAgreement')} <Link className="underline text-blue-primary" to="/terms">{t('signup.termsOfUse')}</Link> & <Link className="underline text-blue-primary" to="/privacy">{t('signup.privacyPolicy')}</Link>
          </Label>
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isLoading || !email || !password || !confirm || unmet.length > 0 || password !== confirm || !terms}>
          {isLoading ? t('signup.creating') : t('signup.submit')}
        </Button>
      </form>

      <SocialAuthSection
        onProviderStart={() => setProviderActive(true)}
        onProviderEnd={() => setProviderActive(false)}
      />

      <p className="mt-6 text-sm text-muted-foreground text-center">
        {tc('hasAccount')} <Link className="underline" to="/login">{tc('logIn')}</Link>
      </p>
    </AuthLayout>
  );
}
