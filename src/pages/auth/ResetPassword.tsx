import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { Button } from "@/components/ui/button"
import PasswordField from "@/components/shared/inputs/PasswordField"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { useResetPassword } from "@/hooks/auth/useResetPassword"
import { useTranslation } from "react-i18next"

type FormValues = {
  new_password: string
  confirm_password: string
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resetMutation = useResetPassword()
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const form = useForm<FormValues>({
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
    mode: "onTouched",
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form

  const newPasswordValue = watch("new_password")

  const onSubmit = async (values: FormValues) => {
    const token = params.get('token') || ''
    if (!token) return
    await resetMutation.mutateAsync(
      {
        reset_token: token,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      },
      { onSuccess: () => navigate(ROUTES.LOGIN) }
    )
  }

  return (
    <AuthLayout leftTitleOne={t('resetPassword.leftTitleOne')} leftTitleTwo={t('resetPassword.leftTitleTwo')} subTitle={t('resetPassword.leftSubtitle')}>
      <AuthHeader title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <PasswordField
          placeholder={t('resetPassword.newPassword')}
          {...register("new_password", {
            required: t('resetPassword.newPasswordRequired'),
            minLength: { value: 6, message: t('resetPassword.minLength') },
          })}
          error={errors?.new_password?.message}
        />

        <PasswordField
          placeholder={t('resetPassword.confirmPassword')}
          {...register("confirm_password", {
            required: t('resetPassword.confirmRequired'),
            validate: (val) => val === newPasswordValue || t('signup.passwordsDoNotMatch'),
          })}
          error={errors?.confirm_password?.message}
        />

        <Button type="submit" className="w-full mt-2" disabled={resetMutation.isPending}>
          {resetMutation.isPending ? t('resetPassword.saving') : t('resetPassword.submit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        {t('resetPassword.remembered')} <Link className="underline" to={ROUTES.LOGIN}>{tc('logIn')}</Link>
      </p>
    </AuthLayout>
  )
}
