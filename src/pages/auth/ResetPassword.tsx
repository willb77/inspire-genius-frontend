import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { Button } from "@/components/ui/button"
import PasswordField from "@/components/shared/inputs/PasswordField"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { useResetPassword } from "@/hooks/auth/useResetPassword"

type FormValues = {
  new_password: string
  confirm_password: string
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resetMutation = useResetPassword()
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
    <AuthLayout leftTitleOne="Upload. Ask." leftTitleTwo="Analyze. Achieve." subTitle="Choose a strong password to secure your account.">
      <AuthHeader title="Reset Password" subtitle="Enter your new password and confirm it" />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <PasswordField
          placeholder="Enter New Password"
          {...register("new_password", {
            required: "New password is required",
            minLength: { value: 6, message: "Password must be at least 6 characters long" },
          })}
          error={errors?.new_password?.message}
        />

        <PasswordField
          placeholder="Confirm New Password"
          {...register("confirm_password", {
            required: "Please confirm your new password",
            validate: (val) => val === newPasswordValue || "Passwords do not match",
          })}
          error={errors?.confirm_password?.message}
        />

        <Button type="submit" className="w-full mt-2" disabled={resetMutation.isPending}>
          {resetMutation.isPending ? "Saving..." : "Reset Password"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Remembered your password? <Link className="underline" to={ROUTES.LOGIN}>Log In</Link>
      </p>
    </AuthLayout>
  )
}
