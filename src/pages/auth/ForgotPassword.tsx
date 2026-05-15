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
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const resetMutation = useRequestPasswordReset();
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');

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
      leftTitleOne={t('forgotPassword.leftTitleOne')}
      leftTitleTwo={t('forgotPassword.leftTitleTwo')}
      subTitle={t('forgotPassword.leftSubtitle')}
    >
      <AuthHeader
        title={t('forgotPassword.title')}
        subtitle={t('forgotPassword.subtitle')}
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t('forgotPassword.email')}</Label>
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
          {resetMutation.isPending ? t('forgotPassword.sending') : t('forgotPassword.submit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        {t('forgotPassword.remembered')}{" "}
        <Link className="underline" to={ROUTES.LOGIN}>
          {tc('logIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
