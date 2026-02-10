import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { Button } from "@/components/ui/button"
import PasswordField from "@/components/shared/inputs/PasswordField"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { useAcceptInvitation } from "@/hooks/auth/useAcceptInvitation"
import { toast } from "sonner"
import { useMemo, useState } from "react"

type FormValues = {
  new_password: string
  confirm_password: string
}

export default function AcceptInvitation() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mutation = useAcceptInvitation()

  const { handleSubmit, setValue, watch, formState: { dirtyFields } } = useForm<FormValues>({
    defaultValues: { new_password: "", confirm_password: "" },
    mode: "onChange",
  })

  const [pwdFocused, setPwdFocused] = useState(false)
  const newPasswordValue = watch("new_password") ?? ""
  const confirmValue = watch("confirm_password") ?? ""

  const rules = useMemo(() => ({
    hasUpper: /[A-Z]/.test(newPasswordValue),
    hasLower: /[a-z]/.test(newPasswordValue),
    hasNumber: /\d/.test(newPasswordValue),
    hasSpecial: /[^A-Za-z0-9]/.test(newPasswordValue),
  }), [newPasswordValue])

  const unmet: string[] = useMemo(() => {
    const arr: string[] = []
    if (!rules.hasUpper) arr.push('Uppercase')
    if (!rules.hasLower) arr.push('Lowercase')
    if (!rules.hasNumber) arr.push('Number')
    if (!rules.hasSpecial) arr.push('Special')
    return arr
  }, [rules])

  const onSubmit = async (values: FormValues) => {
    const token = params.get('token') || ''
    if (!token) {
      toast.error('Invalid or missing invitation token')
      return
    }
    const res = await mutation.mutateAsync({ invitation_token: token, new_password: values.new_password })
    const ok = Boolean((res?.status ?? res?.success) === true)
    if (ok) navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <AuthLayout leftTitleOne="Upload. Ask." leftTitleTwo="Analyze. Achieve." subTitle="Set a strong password to activate your account.">
      <AuthHeader title="Accept Invitation" subtitle="Create your password to continue" />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div role="group" aria-label="New password" onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}>
          <PasswordField
            placeholder="Enter New Password"
            value={newPasswordValue}
            onChange={(e) => setValue("new_password", e.target.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
          />
          {(pwdFocused || dirtyFields.new_password) && newPasswordValue && unmet.length > 0 && (
            <p className="text-left mt-2 text-xs text-red-500">At least one {unmet.join(', ')}</p>
          )}
        </div>

        <div>
          <PasswordField
            placeholder="Confirm New Password"
            value={confirmValue}
            onChange={(e) => setValue("confirm_password", e.target.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
          />
          {dirtyFields.confirm_password && confirmValue && newPasswordValue !== confirmValue && (
            <p className="text-left mt-2 text-xs text-red-500">Passwords do not match</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" disabled={mutation.isPending || !newPasswordValue || !confirmValue || unmet.length > 0 || newPasswordValue !== confirmValue}>
          {mutation.isPending ? "Saving..." : "Set Password"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Already have an account? <Link className="underline" to={ROUTES.LOGIN}>Log In</Link>
      </p>
    </AuthLayout>
  )
}
