import { useState } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useGiveVerdict,
  useRecordAttestation,
  useRequestValidation,
  validationErrorMessage,
} from "@/hooks/job-blueprint/useBlueprintValidation"

/** One of the role's 22 dimensions, as a key the server accepts ("behavior:3") and a label. */
export type NoteDimension = { key: string; label: string }

/** RHF field names cannot carry ":"; "behavior:3" travels as "behavior_3". */
const fieldOf = (key: string) => key.replace(":", "_")

function collectNotes(dims: NoteDimension[], notes: Record<string, string | undefined> | undefined) {
  const out: Record<string, string> = {}
  for (const d of dims) {
    const v = notes?.[fieldOf(d.key)]?.trim()
    if (v) out[d.key] = v
  }
  return Object.keys(out).length ? out : undefined
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-600">{message}</p> : null
}

function ServerError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-red-600">
      {message}
    </p>
  ) : null
}

function DimensionNotes({
  dims,
  field,
}: {
  dims: NoteDimension[]
  field: (name: string) => UseFormRegisterReturn
}) {
  if (!dims.length) return null
  return (
    <details className="rounded-md border border-[#e5e7eb] p-2">
      <summary className="cursor-pointer text-sm text-[#374151]">
        Optional: why a dimension matters in this role
      </summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {dims.map((d) => (
          <div key={d.key} className="space-y-1">
            <Label htmlFor={`note-${d.key}`} className="text-xs">
              {d.label}
            </Label>
            <Input id={`note-${d.key}`} {...field(fieldOf(d.key))} />
          </div>
        ))}
      </div>
    </details>
  )
}

// ── Request: an editor names a manager in the role's org ─────────────────────

const requestSchema = z.object({
  reviewerEmail: z.string().trim().email("Enter the reviewer's email address"),
  note: z.string().trim().max(4000).optional(),
})
type RequestValues = z.infer<typeof requestSchema>

export function RequestValidationForm({ blueprintId, onDone }: { blueprintId: string; onDone?: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const request = useRequestValidation()
  const { register, handleSubmit, formState, reset } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { reviewerEmail: "", note: "" },
  })
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await request.mutateAsync({ id: blueprintId, body: { reviewerEmail: v.reviewerEmail, note: v.note || undefined } })
      toast.success("Validation requested.")
      reset()
      onDone?.()
    } catch (err) {
      setError(validationErrorMessage(err, "Could not request validation."))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Request validation">
      <p className="text-xs text-[#6b7280]">
        The reviewer must hold the manager role in this role&apos;s organisation and have an IG account. Nothing is
        emailed: they see the request when they sign in.
      </p>
      <div className="space-y-1">
        <Label htmlFor="reviewerEmail">Reviewer&apos;s email</Label>
        <Input id="reviewerEmail" type="email" {...register("reviewerEmail")} />
        <FieldError message={formState.errors.reviewerEmail?.message} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="requestNote">Note to the reviewer (optional)</Label>
        <Textarea id="requestNote" {...register("note")} />
      </div>
      <ServerError message={error} />
      <Button type="submit" disabled={request.isPending}>
        {request.isPending ? "Requesting…" : "Request validation"}
      </Button>
    </form>
  )
}

// ── Record: an editor records an SME's attestation given outside IG ──────────

const today = () => new Date().toISOString().slice(0, 10)

const recordSchema = z.object({
  name: z.string().trim().min(1, "The SME's name is required").max(200),
  org: z.string().trim().min(1, "The SME's organisation is required").max(200),
  title: z.string().trim().max(200).optional(),
  validatedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date the SME signed")
    .refine((d) => d <= today(), "The date cannot be in the future"),
  comments: z.string().trim().max(4000).optional(),
  attest: z.boolean().refine((v) => v, "Confirm the SME attested to this benchmark"),
  notes: z.record(z.string(), z.string().optional()).optional(),
})
type RecordValues = z.infer<typeof recordSchema>

export function RecordAttestationForm({
  blueprintId,
  dims,
  onDone,
}: {
  blueprintId: string
  dims: NoteDimension[]
  onDone?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const record = useRecordAttestation()
  const { register, handleSubmit, formState } = useForm<RecordValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { name: "", org: "", title: "", validatedOn: "", comments: "", attest: false },
  })
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await record.mutateAsync({
        id: blueprintId,
        body: {
          name: v.name,
          org: v.org,
          title: v.title || undefined,
          validatedOn: v.validatedOn,
          comments: v.comments || undefined,
          dimensionNotes: collectNotes(dims, v.notes),
          attest: v.attest,
        },
      })
      toast.success("Attestation recorded.")
      onDone?.()
    } catch (err) {
      setError(validationErrorMessage(err, "Could not record the attestation."))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Record an attestation">
      <p className="text-xs text-[#6b7280]">
        For an employer or subject-matter expert with no IG account who signed off outside IG. The report says it
        was recorded by you and that the SME did not sign in IG. Their name, organisation and title are kept for 90
        days.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="smeName">SME name</Label>
          <Input id="smeName" {...register("name")} />
          <FieldError message={formState.errors.name?.message} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="smeOrg">Organisation</Label>
          <Input id="smeOrg" {...register("org")} />
          <FieldError message={formState.errors.org?.message} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="smeTitle">Title (optional)</Label>
          <Input id="smeTitle" {...register("title")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="smeDate">Date signed</Label>
          <Input id="smeDate" type="date" {...register("validatedOn")} />
          <FieldError message={formState.errors.validatedOn?.message} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="smeComments">Comments (optional)</Label>
        <Textarea id="smeComments" {...register("comments")} />
      </div>
      <DimensionNotes dims={dims} field={(f) => register(`notes.${f}`)} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" {...register("attest")} />
        <span>The SME reviewed this version&apos;s benchmark and attested that it reflects the role.</span>
      </label>
      <FieldError message={formState.errors.attest?.message} />
      <ServerError message={error} />
      <Button type="submit" disabled={record.isPending}>
        {record.isPending ? "Recording…" : "Record attestation"}
      </Button>
    </form>
  )
}

// ── Verdict: the named reviewer, signed in ───────────────────────────────────

const verdictSchema = z
  .object({
    verdict: z.enum(["validated", "changes_requested"]),
    name: z.string().trim().max(200).optional(),
    org: z.string().trim().max(200).optional(),
    title: z.string().trim().max(200).optional(),
    comments: z.string().trim().max(4000).optional(),
    notes: z.record(z.string(), z.string().optional()).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.verdict === "validated") {
      if (!v.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Your name as it should appear on the report" })
      if (!v.org) ctx.addIssue({ code: "custom", path: ["org"], message: "Your organisation" })
    } else if (!v.comments) {
      ctx.addIssue({ code: "custom", path: ["comments"], message: "Say what needs to change" })
    }
  })
type VerdictValues = z.infer<typeof verdictSchema>

export function VerdictForm({
  blueprintId,
  dims,
  onDone,
}: {
  blueprintId: string
  dims: NoteDimension[]
  onDone?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const verdict = useGiveVerdict()
  const { register, handleSubmit, formState, watch } = useForm<VerdictValues>({
    resolver: zodResolver(verdictSchema),
    defaultValues: { verdict: "validated", name: "", org: "", title: "", comments: "" },
  })
  const choice = watch("verdict")
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await verdict.mutateAsync({
        id: blueprintId,
        body: {
          verdict: v.verdict,
          name: v.name || undefined,
          org: v.org || undefined,
          title: v.title || undefined,
          comments: v.comments || undefined,
          dimensionNotes: collectNotes(dims, v.notes),
        },
      })
      toast.success(v.verdict === "validated" ? "Validated." : "Changes requested.")
      onDone?.()
    } catch (err) {
      setError(validationErrorMessage(err, "Could not save your verdict."))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Your verdict">
      <fieldset className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" value="validated" {...register("verdict")} /> It reflects the role — validate
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" value="changes_requested" {...register("verdict")} /> Changes needed
        </label>
      </fieldset>
      {choice === "validated" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="vName">Your name</Label>
            <Input id="vName" {...register("name")} />
            <FieldError message={formState.errors.name?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vOrg">Organisation</Label>
            <Input id="vOrg" {...register("org")} />
            <FieldError message={formState.errors.org?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vTitle">Title (optional)</Label>
            <Input id="vTitle" {...register("title")} />
          </div>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="vComments">{choice === "validated" ? "Comments (optional)" : "What needs to change"}</Label>
        <Textarea id="vComments" {...register("comments")} />
        <FieldError message={formState.errors.comments?.message} />
      </div>
      <DimensionNotes dims={dims} field={(f) => register(`notes.${f}`)} />
      <ServerError message={error} />
      <Button type="submit" disabled={verdict.isPending}>
        {verdict.isPending ? "Saving…" : "Submit verdict"}
      </Button>
    </form>
  )
}
