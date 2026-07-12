import { useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Sparkles, ArrowRight, ArrowLeft, Check, Search, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROUTES } from "@/constants/routes"
import { useAidIntake, useSaveAidIntake } from "@/hooks/grant/useAidIntake"
import {
  aidIntakeSchema,
  readyToSearch,
  triggerProgress,
  TRIGGER_FIELDS,
  type AidIntakeProfile,
} from "@/types/grant/intake"
import { INTAKE_STEPS, labelForAnswer, type IntakeStep } from "./steps"

/** Assistant question bubble — the conversational half of the hybrid flow. */
function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(59,91,255,0.1)]">
        <Sparkles className="h-4 w-4 text-[#3B5BFF]" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-[#f3f4f6] px-4 py-2.5 text-[#1f2937]">{children}</div>
    </div>
  )
}

/** One answered Q→A pair in the transcript; click the answer to edit it. */
function TranscriptRow({
  step,
  value,
  onEdit,
}: {
  step: IntakeStep
  value: unknown
  onEdit: () => void
}) {
  const answer = labelForAnswer(step, value)
  return (
    <div className="space-y-1.5">
      <AssistantBubble>
        <span className="text-sm">{step.question}</span>
      </AssistantBubble>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="group inline-flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-[#3B5BFF] px-4 py-2 text-sm text-white transition hover:bg-[#2f49cc]"
        >
          {answer || <span className="italic opacity-80">Skipped</span>}
          <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-80" />
        </button>
      </div>
    </div>
  )
}

export default function GrantIntakeFlow() {
  const navigate = useNavigate()
  const { data: saved } = useAidIntake()
  const saveMutation = useSaveAidIntake()
  const [stepIndex, setStepIndex] = useState(0)

  const form = useForm<AidIntakeProfile>({
    resolver: zodResolver(aidIntakeSchema),
    mode: "onTouched",
    defaultValues: {
      intended_field: "",
      city_or_county: "",
      ...saved,
    },
  })

  const values = form.watch()
  // Branching: module steps appear only once their screener gate is answered Yes.
  const visibleSteps = useMemo(
    () => INTAKE_STEPS.filter((s) => s.phase !== "module" || values[s.gate!] === true),
    [values]
  )
  const total = visibleSteps.length
  const done = stepIndex >= total
  const progress = triggerProgress(values)
  const isReady = readyToSearch(values)
  const step = done ? null : visibleSteps[stepIndex]

  // Rows already answered (or explicitly visited) before the current step.
  const transcript = useMemo(
    () => visibleSteps.slice(0, stepIndex),
    [visibleSteps, stepIndex]
  )

  async function advance() {
    if (!step) return
    const ok = await form.trigger(step.field)
    if (!ok) return
    setStepIndex((i) => i + 1)
  }

  function skip() {
    if (!step) return
    form.setValue(step.field, undefined as never, { shouldValidate: false })
    setStepIndex((i) => i + 1)
  }

  function persist(next: "dashboard" | "scholarships") {
    form.handleSubmit((data) => {
      saveMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Aid profile saved", {
            description: isReady
              ? "We'll rank your matches from these answers."
              : "You can finish the essentials anytime to unlock matches.",
          })
          navigate(next === "scholarships" ? ROUTES.GRANT.SCHOLARSHIPS : ROUTES.GRANT.DASHBOARD)
        },
        onError: () => toast.error("Couldn't save your profile. Please try again."),
      })
    })()
  }

  return (
    <div className="max-w-2xl">
      {/* Header + progress toward the search trigger */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.1)]">
            <Sparkles className="h-5 w-5 text-[#3B5BFF]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1f2937]">Build your aid profile</h1>
        </div>
        <p className="text-[#6b7280]">
          A few quick questions so we can find the grants and scholarships you actually qualify for.
        </p>

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-[#374151]">Essentials to unlock matches</span>
            <span className={cn("font-semibold", isReady ? "text-[#0f9d8c]" : "text-[#6b7280]")}>
              {progress}/{TRIGGER_FIELDS.length}
            </span>
          </div>
          <Progress value={(progress / TRIGGER_FIELDS.length) * 100} className="h-2" />
          {isReady && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgba(45,212,191,0.12)] px-3 py-2 text-sm text-[#0f766e]">
              <Check className="h-4 w-4" />
              You're ready to search — anything more just sharpens your matches.
            </div>
          )}
        </div>
      </div>

      {/* Conversational transcript */}
      <div className="space-y-4">
        {transcript.map((s, i) => (
          <TranscriptRow
            key={s.field}
            step={s}
            value={values[s.field]}
            onEdit={() => setStepIndex(i)}
          />
        ))}

        {/* Current question + structured input */}
        {step && (
          <div className="space-y-3">
            <AssistantBubble>
              <div>
                <p className="text-sm font-medium">{step.question}</p>
                {step.helper && <p className="mt-1 text-xs text-[#6b7280]">{step.helper}</p>}
              </div>
            </AssistantBubble>

            <div className="ml-11 space-y-2">
              <StepInput step={step} form={form} onEnter={advance} />
              {form.formState.errors[step.field] && (
                <p className="text-xs text-[#dc2626]">
                  {String(form.formState.errors[step.field]?.message ?? "Please check this answer")}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={advance} className="bg-[#3B5BFF] hover:bg-[#2f49cc]">
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                {step.phase !== "trigger" && (
                  <Button variant="ghost" onClick={skip} className="text-[#6b7280]">
                    Skip
                  </Button>
                )}
                {stepIndex > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setStepIndex((i) => i - 1)}
                    className="text-[#6b7280]"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Review / completion */}
        {done && (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <Check className="h-5 w-5 text-[#0f9d8c]" />
              <h2 className="text-lg font-semibold text-[#1f2937]">That's everything</h2>
            </div>
            <p className="mb-4 text-sm text-[#6b7280]">
              Save your profile to lock in your matches. You can edit any answer above.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => persist("scholarships")}
                disabled={saveMutation.isPending}
                className="bg-[#3B5BFF] hover:bg-[#2f49cc]"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1 h-4 w-4" />
                )}
                Save &amp; find scholarships
              </Button>
              <Button
                variant="outline"
                onClick={() => persist("dashboard")}
                disabled={saveMutation.isPending}
              >
                Save &amp; go to dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent early-exit once the essentials are in */}
      {isReady && !done && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-[#2DD4BF] bg-[rgba(45,212,191,0.06)] p-4">
          <span className="text-sm text-[#0f766e]">Skip the extras and search now?</span>
          <Button
            onClick={() => persist("scholarships")}
            disabled={saveMutation.isPending}
            className="bg-[#2DD4BF] text-white hover:bg-[#26b8a6]"
          >
            <Search className="mr-1 h-4 w-4" /> Search scholarships
          </Button>
        </div>
      )}
    </div>
  )
}

/** Renders the structured control for a step, bound to the RHF field. */
function StepInput({
  step,
  form,
  onEnter,
}: {
  step: IntakeStep
  form: ReturnType<typeof useForm<AidIntakeProfile>>
  onEnter: () => void
}) {
  if (step.kind === "text") {
    return (
      <Input
        autoFocus
        placeholder={step.placeholder}
        {...form.register(step.field)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onEnter())}
        className="max-w-sm"
      />
    )
  }

  if (step.kind === "number") {
    return (
      <Controller
        control={form.control}
        name={step.field}
        render={({ field }) => (
          <div className="flex max-w-[12rem] items-center gap-2">
            <Input
              autoFocus
              type="number"
              inputMode="numeric"
              placeholder={step.placeholder}
              value={(field.value as number | undefined) ?? ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
              }
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onEnter())}
            />
            {step.suffix && <span className="text-sm text-[#6b7280]">{step.suffix}</span>}
          </div>
        )}
      />
    )
  }

  if (step.kind === "bool") {
    return (
      <Controller
        control={form.control}
        name={step.field}
        render={({ field }) => (
          <div className="flex gap-2">
            {[
              { label: "Yes", val: true },
              { label: "No", val: false },
            ].map((o) => (
              <Button
                key={o.label}
                type="button"
                variant="outline"
                onClick={() => field.onChange(o.val)}
                className={cn(
                  "min-w-[5rem]",
                  field.value === o.val && "border-[#3B5BFF] bg-[rgba(59,91,255,0.08)] text-[#3B5BFF]"
                )}
              >
                {o.label}
              </Button>
            ))}
          </div>
        )}
      />
    )
  }

  if (step.kind === "multiselect") {
    return (
      <Controller
        control={form.control}
        name={step.field}
        render={({ field }) => {
          const selected = (field.value as string[] | undefined) ?? []
          const toggle = (v: string) =>
            field.onChange(
              selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
            )
          return (
            <div className="flex max-w-lg flex-wrap gap-2">
              {step.options.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant="outline"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    selected.includes(o.value) &&
                      "border-[#3B5BFF] bg-[rgba(59,91,255,0.08)] text-[#3B5BFF]"
                  )}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          )
        }}
      />
    )
  }

  // select | state
  return (
    <Controller
      control={form.control}
      name={step.field}
      render={({ field }) => (
        <Select value={(field.value as string | undefined) ?? ""} onValueChange={field.onChange}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={step.kind === "state" ? "Select your state" : "Select one"} />
          </SelectTrigger>
          <SelectContent>
            {step.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
