import { useState, type ReactNode } from "react"
import { useForm, Controller, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CalendarClock, CheckCircle2, Loader2 } from "lucide-react"
import AuthHeader from "@/components/auth/AuthHeader"
import AuthLayout from "@/components/auth/AuthLayout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePublicRegistration } from "@/hooks/intake/usePublicRegistration"
import { classifyRegistrationError } from "@/services/intake/publicIntake.service"
import { INTAKE_CONTEXTS, INTAKE_PRISM_ACCREDITED, INTAKE_ROLES, type PublicRegistrationFailure } from "@/types/intake"
import {
  CONSENT_WORDING,
  CONTEXT_LABELS,
  JOIN_DEFAULTS,
  PRISM_LABELS,
  ROLE_LABELS,
  formFieldFor,
  joinSchema,
  toPayload,
  type JoinFormValues,
} from "./join.schema"

/**
 * IN-2c — `/join`, the public "Register your interest" form. No sign-in.
 *
 * It sends through its own request client (no auth interceptors), so nothing a
 * public route answers can redirect a visitor to /login. The page ships before
 * the backend is switched on, and the server answers 404 on every public route
 * until then, so the 404 state is a deliberate "not open yet" notice rather
 * than an error page.
 */

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive md:text-sm"

const FORM_LEVEL_MESSAGE: Record<Exclude<PublicRegistrationFailure["kind"], "not_open" | "invalid">, string> = {
  rate_limited: "There have been too many submissions from your connection. Please try again later.",
  too_large: "That submission was too long to send. Please shorten your answers and try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again in a few minutes.",
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-sm text-red-700">
      {message}
    </p>
  )
}

function Field({
  name,
  label,
  error,
  children,
}: {
  name: string
  label: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`join-${name}`}>{label}</Label>
      {children}
      <FieldError id={`join-${name}-error`} message={error} />
    </div>
  )
}

export default function JoinPage() {
  const registration = usePublicRegistration()
  const [failure, setFailure] = useState<PublicRegistrationFailure | null>(null)
  const [consentsError, setConsentsError] = useState<string | null>(null)

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: JOIN_DEFAULTS,
    mode: "onSubmit",
  })
  const { register, handleSubmit, watch, setError, control, formState } = form
  const errors = formState.errors

  const role = watch("role")
  const context = watch("context")
  const prism = watch("prism_accredited")

  const onSubmit = (values: JoinFormValues) => {
    setFailure(null)
    setConsentsError(null)
    registration.mutate(toPayload(values), {
      onError: (err) => {
        const f = classifyRegistrationError(err)
        if (f.kind === "invalid") {
          const unmapped = []
          for (const p of f.problems) {
            const target = formFieldFor(p.field)
            if (target === "consents") setConsentsError(p.message)
            else if (target) setError(target as FieldPath<JoinFormValues>, { type: "server", message: p.message })
            else unmapped.push(p)
          }
          setFailure(unmapped.length || !f.problems.length ? { kind: "invalid", problems: unmapped } : null)
          return
        }
        setFailure(f)
      },
    })
  }

  const ariaFor = (name: keyof JoinFormValues) => ({
    id: `join-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `join-${name}-error` : undefined,
  })

  let body: ReactNode
  if (registration.isSuccess) {
    body = (
      <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Thank you</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We've received your details. Thank you for your interest in Inspires Genius.
        </p>
      </div>
    )
  } else if (failure?.kind === "not_open") {
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
        <CalendarClock className="h-10 w-10 text-slate-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Registration isn't open yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Registration isn't open yet. Please check back soon.
        </p>
        <Button type="button" variant="outline" onClick={() => setFailure(null)}>
          Back to the form
        </Button>
      </div>
    )
  } else {
    body = (
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" aria-label="Register your interest">
        {failure && failure.kind !== "invalid" && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{FORM_LEVEL_MESSAGE[failure.kind]}</span>
          </div>
        )}
        {failure?.kind === "invalid" && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>We couldn't accept that submission. Please check your answers and try again.</p>
              {failure.problems.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {failure.problems.map((p) => (
                    <li key={`${p.field}:${p.message}`}>{p.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="first_name" label="First name" error={errors.first_name?.message}>
            <Input {...register("first_name")} {...ariaFor("first_name")} autoComplete="given-name" />
          </Field>
          <Field name="last_name" label="Last name" error={errors.last_name?.message}>
            <Input {...register("last_name")} {...ariaFor("last_name")} autoComplete="family-name" />
          </Field>
          <Field name="email" label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} {...ariaFor("email")} autoComplete="email" inputMode="email" />
          </Field>
          <Field name="phone" label="Phone (optional)" error={errors.phone?.message}>
            <Input type="tel" {...register("phone")} {...ariaFor("phone")} autoComplete="tel" />
          </Field>
        </div>

        <Field name="role" label="Which best describes you?" error={errors.role?.message}>
          <select {...register("role")} {...ariaFor("role")} className={selectClass}>
            <option value="">Choose one</option>
            {INTAKE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        {role === "other" && (
          <Field name="role_other" label="Your role" error={errors.role_other?.message}>
            <Input {...register("role_other")} {...ariaFor("role_other")} />
          </Field>
        )}

        <Field name="prism_accredited" label="Are you PRISM accredited?" error={errors.prism_accredited?.message}>
          <select {...register("prism_accredited")} {...ariaFor("prism_accredited")} className={selectClass}>
            <option value="">Choose one</option>
            {INTAKE_PRISM_ACCREDITED.map((p) => (
              <option key={p} value={p}>
                {PRISM_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        {prism === "yes" && (
          <Field name="site_id" label="PRISM site ID (optional)" error={errors.site_id?.message}>
            <Input {...register("site_id")} {...ariaFor("site_id")} />
          </Field>
        )}

        <Field name="context" label="Where would you use Inspires Genius?" error={errors.context?.message}>
          <select {...register("context")} {...ariaFor("context")} className={selectClass}>
            <option value="">Choose one</option>
            {INTAKE_CONTEXTS.map((c) => (
              <option key={c} value={c}>
                {CONTEXT_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        {context === "other" && (
          <Field name="context_other" label="Describe the setting" error={errors.context_other?.message}>
            <Input {...register("context_other")} {...ariaFor("context_other")} />
          </Field>
        )}

        <Field
          name="organisation"
          label={context === "company" || context === "education" ? "Organisation" : "Organisation (optional)"}
          error={errors.organisation?.message}
        >
          <Input {...register("organisation")} {...ariaFor("organisation")} autoComplete="organization" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="region" label="State, province or region" error={errors.region?.message}>
            <Input {...register("region")} {...ariaFor("region")} autoComplete="address-level1" />
          </Field>
          <Field name="country" label="Country" error={errors.country?.message}>
            <Input {...register("country")} {...ariaFor("country")} autoComplete="country-name" />
          </Field>
        </div>

        <Field name="heard_from" label="How did you hear about us? (optional)" error={errors.heard_from?.message}>
          <Input {...register("heard_from")} {...ariaFor("heard_from")} />
        </Field>

        <fieldset className="flex flex-col gap-3" aria-describedby={consentsError ? "join-consents-error" : undefined}>
          <legend className="mb-1 text-sm font-medium">Keeping in touch (optional)</legend>
          {(["webinar_email", "mailing_list"] as const).map((purpose) => {
            const name = purpose === "webinar_email" ? "consent_webinar_email" : "consent_mailing_list"
            return (
              <div key={purpose} className="flex items-start gap-2">
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <Checkbox
                      id={`join-${name}`}
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      className="mt-0.5"
                    />
                  )}
                />
                <Label htmlFor={`join-${name}`} className="font-normal leading-snug">
                  {CONSENT_WORDING[purpose]}
                </Label>
              </div>
            )
          })}
          <FieldError id="join-consents-error" message={consentsError ?? undefined} />
        </fieldset>

        {/* Honeypot: hidden from people and assistive tech; only a bot fills it. */}
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="join-website">Leave this field empty</label>
          <input id="join-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        <Button type="submit" disabled={registration.isPending} className="w-full mt-2">
          {registration.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Register your interest
        </Button>
      </form>
    )
  }

  return (
    // The same shell as the sign-in pages: brand wall, logo, form panel. It
    // reads no auth state and makes no request, so it cannot redirect anyone.
    <AuthLayout contentClassName="max-w-[560px]">
      <AuthHeader
        title="Register your interest"
        subtitle="Inspires Genius is an AI coaching platform. Leave your details below to register your interest."
      />
      {body}
    </AuthLayout>
  )
}
