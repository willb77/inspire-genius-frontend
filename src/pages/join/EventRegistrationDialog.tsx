import { useContext, useMemo, useState, type ReactNode } from "react"
import { Controller, useForm, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TurnstileWidget } from "@/components/shared/TurnstileWidget"
import { AuthContext } from "@/context/auth-context"
import { useEventRegistration } from "@/hooks/intake/useEventRegistration"
import { classifyEventRegistrationError } from "@/services/intake/eventRegistration.service"
import type { EventOption, EventRegistrationFailure } from "@/types/eventRegistration"
import { EVENT_REG_MESSAGES, EVENT_REG_NOT_OPEN, EVENT_REG_NO_CHECK, splitName } from "./eventRegistration"
import { INTAKE_CONTEXTS, INTAKE_PRISM_ACCREDITED, INTAKE_ROLES } from "@/types/intake"
import { formatEventTime } from "./eventTime"
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
 * Register for one event from `/events` (monorepo CSA 2026-11-16, R4).
 *
 * The same fields as `/join`, so the segment can be recorded; a signed-in
 * InspiresGenius account fills name and email, and the visitor can overwrite them.
 * Nothing is looked up by email and nothing is trusted from the prefill: the
 * server validates every value like any manual entry. A Turnstile check is
 * required; its token is single-use, so the widget is re-rendered after any
 * submit that did not succeed.
 */

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive md:text-sm"

function Field({ name, label, error, children }: { name: string; label: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`evreg-${name}`}>{label}</Label>
      {children}
      {error && (
        <p id={`evreg-${name}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function EventRegistrationDialog({ event, onClose }: { event: EventOption; onClose: () => void }) {
  // Not useAuth(): that throws without a provider, and this page must render either way.
  const user = useContext(AuthContext)?.user ?? null
  const prefilled = Boolean(user?.email)
  const defaults = useMemo<JoinFormValues>(() => {
    const [first, last] = splitName(user?.fullName ?? user?.name)
    return { ...JOIN_DEFAULTS, first_name: first, last_name: last, email: user?.email ?? "" }
  }, [user])

  const registration = useEventRegistration()
  const [failure, setFailure] = useState<EventRegistrationFailure | null>(null)
  const [consentsError, setConsentsError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [checkUnavailable, setCheckUnavailable] = useState(false)

  const form = useForm<JoinFormValues>({ resolver: zodResolver(joinSchema), defaultValues: defaults, mode: "onSubmit" })
  const { register, handleSubmit, watch, setError, control, formState } = form
  const errors = formState.errors
  const role = watch("role")
  const context = watch("context")
  const prism = watch("prism_accredited")

  const ariaFor = (name: keyof JoinFormValues) => ({
    id: `evreg-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `evreg-${name}-error` : undefined,
  })

  const onSubmit = (values: JoinFormValues) => {
    if (!token) return
    setFailure(null)
    setConsentsError(null)
    registration.mutate(
      { ...toPayload(values), webinar_id: event.id, turnstile_token: token },
      {
        onError: (err) => {
          // The token is spent whatever the answer was: a fresh challenge every time.
          setToken(null)
          setResetKey((k) => k + 1)
          const f = classifyEventRegistrationError(err)
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
      },
    )
  }

  let body: ReactNode
  if (registration.isSuccess) {
    body = (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h3 className="text-lg font-semibold">You're registered</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          We've recorded your registration for {event.title}. Thank you.
        </p>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  } else if (failure?.kind === "not_open") {
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{EVENT_REG_NOT_OPEN}</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  } else if (checkUnavailable) {
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{EVENT_REG_NO_CHECK}</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  } else {
    body = (
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" aria-label={`Register for ${event.title}`}>
        {prefilled && (
          <p className="text-sm text-muted-foreground">
            Signed in as {user?.email}. We've filled in your name and email; change anything below.
          </p>
        )}
        {failure && failure.kind !== "invalid" && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{EVENT_REG_MESSAGES[failure.kind]}</span>
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

        <Field name="context" label="Where would you use InspiresGenius?" error={errors.context?.message}>
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

        <fieldset className="flex flex-col gap-3" aria-describedby={consentsError ? "evreg-consents-error" : undefined}>
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
                      id={`evreg-${name}`}
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      className="mt-0.5"
                    />
                  )}
                />
                <Label htmlFor={`evreg-${name}`} className="font-normal leading-snug">
                  {CONSENT_WORDING[purpose]}
                </Label>
              </div>
            )
          })}
          {consentsError && (
            <p id="evreg-consents-error" role="alert" className="text-sm text-red-700">
              {consentsError}
            </p>
          )}
        </fieldset>

        {/* Honeypot: hidden from people and assistive tech; only a bot fills it. */}
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="evreg-website">Leave this field empty</label>
          <input id="evreg-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        <TurnstileWidget onToken={setToken} onUnavailable={() => setCheckUnavailable(true)} resetKey={resetKey} />

        <Button type="submit" disabled={registration.isPending || !token} className="w-full">
          {registration.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Register for this event
        </Button>
      </form>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            <time dateTime={event.starts_at}>{formatEventTime(event.starts_at, event.time_zone)}</time>
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
