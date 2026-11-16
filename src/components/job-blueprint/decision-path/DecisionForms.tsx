import { useState } from "react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  decisionPathErrorMessage,
  useOpenDecisionCase,
  useRecordDecision,
} from "@/hooks/job-blueprint/useDecisionPath"
import type {
  DecisionAnswers,
  DecisionPathStatus,
  DecisionRule,
  DecisionRuleSet,
  FinalRoute,
  JobDNA,
  RecommendedRoute,
} from "@/types/job-blueprint"
import { routeLabel } from "./labels"

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

const BLANK = ""

/** One answer per rule, keyed by rule id; "" means "not answered yet". */
function toAnswers(rules: DecisionRule[], raw: Record<string, string>): DecisionAnswers {
  const out: DecisionAnswers = {}
  for (const r of rules) {
    const v = raw[r.id]
    if (v === undefined || v === BLANK) continue
    out[r.id] = r.kind === "attested_requirement" ? v === "yes" : v
  }
  return out
}

function AnswerInput({
  rule,
  status,
  value,
  onChange,
}: {
  rule: DecisionRule
  status: DecisionPathStatus
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const id = `answer-${rule.id}`
  const options =
    rule.kind === "degree"
      ? status.degreeLevels
      : rule.kind === "background_check_status"
        ? status.backgroundStatuses
        : rule.kind === "attested_requirement"
          ? ["yes", "no"]
          : null
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {rule.label} <span className="text-xs text-[#6b7280]">({rule.sourceRef})</span>
      </Label>
      {options ? (
        <select
          id={id}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value={BLANK}>{t("forms.notAnswered", { defaultValue: "Not answered yet" })}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o === "yes" ? t("forms.yes", { defaultValue: "yes" }) : o === "no" ? t("forms.no", { defaultValue: "no" }) : o.replace("_", " ")}
            </option>
          ))}
        </select>
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// ── Intake ───────────────────────────────────────────────────────────────────

const makeIntakeSchema = (t: TFunction) =>
  z.object({
    blueprintId: z.string().min(1, t("forms.intake.chooseRole", { defaultValue: "Choose the role" })),
    ruleSetId: z.string().min(1, t("forms.intake.chooseRuleSet", { defaultValue: "Choose the rule set" })),
    candidateName: z.string().trim().min(1, t("forms.intake.giveName", { defaultValue: "Give the candidate's name" })).max(200),
    candidateEmail: z.union([
      z.literal(""),
      z.string().trim().email(t("forms.intake.validEmail", { defaultValue: "Enter a valid email address" })),
    ]),
    attest: z.boolean().refine((v) => v, t("forms.intake.confirmAnswers", { defaultValue: "Confirm the answers are as your records show" })),
  })
type IntakeValues = z.input<ReturnType<typeof makeIntakeSchema>>

export function IntakeForm({
  status,
  roles,
  ruleSets,
  onOpened,
}: {
  status: DecisionPathStatus
  roles: JobDNA[]
  ruleSets: DecisionRuleSet[]
  onOpened?: (caseId: string) => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const open = useOpenDecisionCase()
  const active = ruleSets.filter((r) => r.status === "active")
  const { register, handleSubmit, formState, watch } = useForm<IntakeValues>({
    resolver: zodResolver(makeIntakeSchema(t)),
    defaultValues: { blueprintId: "", ruleSetId: "", candidateName: "", candidateEmail: "", attest: false },
  })
  const chosen = active.find((r) => r.id === watch("ruleSetId"))
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      const view = await open.mutateAsync({
        blueprintId: v.blueprintId,
        ruleSetId: v.ruleSetId,
        candidateName: v.candidateName,
        candidateEmail: v.candidateEmail || undefined,
        answers: chosen ? toAnswers(chosen.rules, answers) : {},
        attest: true,
      })
      toast.success(t("forms.intake.opened", { defaultValue: "Case opened." }))
      if (view?.id) onOpened?.(view.id)
    } catch (err) {
      setError(decisionPathErrorMessage(err, t("forms.intake.openFailed", { defaultValue: "Could not open the case." })))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label={t("forms.intake.formLabel", { defaultValue: "Candidate intake" })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="blueprintId">{t("forms.intake.role", { defaultValue: "Role" })}</Label>
          <select id="blueprintId" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register("blueprintId")}>
            <option value="">{t("forms.intake.selectRole", { defaultValue: "Select a role…" })}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roleTitle}
              </option>
            ))}
          </select>
          <FieldError message={formState.errors.blueprintId?.message} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ruleSetId">{t("forms.intake.ruleSet", { defaultValue: "Minimum standard (rule set)" })}</Label>
          <select id="ruleSetId" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register("ruleSetId")}>
            <option value="">{t("forms.intake.selectRuleSet", { defaultValue: "Select a rule set…" })}</option>
            {active.map((r) => (
              <option key={r.id} value={r.id}>
                {t("forms.intake.ruleSetOption", { defaultValue: "{{name}} (version {{version}})", name: r.name, version: r.version })}
              </option>
            ))}
          </select>
          <FieldError message={formState.errors.ruleSetId?.message} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="candidateName">{t("forms.intake.candidateName", { defaultValue: "Candidate's name" })}</Label>
          <Input id="candidateName" {...register("candidateName")} />
          <FieldError message={formState.errors.candidateName?.message} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="candidateEmail">{t("forms.intake.candidateEmail", { defaultValue: "Candidate's email (optional)" })}</Label>
          <Input id="candidateEmail" type="email" {...register("candidateEmail")} />
          <FieldError message={formState.errors.candidateEmail?.message} />
        </div>
      </div>
      {chosen ? (
        <fieldset className="space-y-2 rounded-md border border-[#e5e7eb] p-3">
          <legend className="px-1 text-sm font-medium">{t("forms.intake.answersLegend", { defaultValue: "Answers against the written standard" })}</legend>
          {chosen.rules.map((rule) => (
            <AnswerInput
              key={rule.id}
              rule={rule}
              status={status}
              value={answers[rule.id] ?? BLANK}
              onChange={(v) => setAnswers((a) => ({ ...a, [rule.id]: v }))}
            />
          ))}
          <p className="text-xs text-[#6b7280]">
            {t("forms.intake.missingAnswer", { defaultValue: "A missing answer holds the case; it is never a reason to refer." })} {status.backgroundCheckNote}
          </p>
        </fieldset>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" {...register("attest")} />
        <span>{t("forms.intake.attest", { defaultValue: "These answers are as the district's records show." })}</span>
      </label>
      <FieldError message={formState.errors.attest?.message} />
      <ServerError message={error} />
      <Button type="submit" disabled={open.isPending}>
        {open.isPending ? t("forms.intake.opening", { defaultValue: "Opening…" }) : t("forms.intake.submit", { defaultValue: "Open case and check" })}
      </Button>
    </form>
  )
}

// ── Decision ─────────────────────────────────────────────────────────────────

/**
 * The decision form. There is NO default route: nothing is pre-selected, and
 * the reason must be longer when the route departs from the recommendation —
 * the server enforces both; the form says so before it sends.
 */
export function DecisionForm({
  caseId,
  recommended,
  current,
  status,
  amend = false,
}: {
  caseId: string
  recommended: RecommendedRoute | null
  current?: FinalRoute | null
  status: Pick<DecisionPathStatus, "minReason" | "minOverrideReason" | "finalRoutes">
  amend?: boolean
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const [error, setError] = useState<string | null>(null)
  const record = useRecordDecision()
  const schema = z
    .object({
      finalRoute: z.enum(["apprentice", "residency", "refer"], { message: t("forms.decision.chooseRoute", { defaultValue: "Choose a route. There is no default." }) }),
      reason: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      const override = amend || v.finalRoute !== recommended
      const min = override ? status.minOverrideReason : status.minReason
      if (v.reason.length < min) {
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: override
            ? amend
              ? t("forms.decision.departRecorded", { defaultValue: "Say why you are departing from the recorded decision (at least {{min}} characters).", min })
              : t("forms.decision.departRecommendation", { defaultValue: "Say why you are departing from the recommendation (at least {{min}} characters).", min })
            : t("forms.decision.giveReason", { defaultValue: "Give a reason (at least {{min}} characters).", min }),
        })
      }
      if (amend && v.finalRoute === current) {
        ctx.addIssue({ code: "custom", path: ["finalRoute"], message: t("forms.decision.mustChange", { defaultValue: "An amendment must change the route." }) })
      }
    })
  type Values = z.input<typeof schema>
  const { register, handleSubmit, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { finalRoute: undefined, reason: "" },
  })
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await record.mutateAsync({ id: caseId, body: { finalRoute: v.finalRoute as FinalRoute, reason: v.reason }, amend })
      toast.success(amend ? t("forms.decision.amended", { defaultValue: "Amendment recorded." }) : t("forms.decision.recorded", { defaultValue: "Decision recorded." }))
      reset()
    } catch (err) {
      setError(decisionPathErrorMessage(err, t("forms.decision.recordFailed", { defaultValue: "Could not record the decision." })))
    }
  })
  const title = amend ? t("forms.decision.amendTitle", { defaultValue: "Amend the decision" }) : t("forms.decision.recordTitle", { defaultValue: "Record the decision" })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label={title}>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">{title}</legend>
        {status.finalRoutes.map((r) => (
          <label key={r} className="mr-4 inline-flex items-center gap-1 text-sm">
            <input type="radio" value={r} {...register("finalRoute")} />
            {routeLabel(t, r)}
          </label>
        ))}
        <FieldError message={formState.errors.finalRoute?.message} />
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor={`reason-${amend ? "amend" : "decide"}`}>{t("forms.decision.reason", { defaultValue: "Reason" })}</Label>
        <Textarea id={`reason-${amend ? "amend" : "decide"}`} {...register("reason")} />
        <FieldError message={formState.errors.reason?.message} />
      </div>
      <ServerError message={error} />
      <Button type="submit" disabled={record.isPending}>
        {record.isPending ? t("forms.decision.recording", { defaultValue: "Recording…" }) : title}
      </Button>
    </form>
  )
}
