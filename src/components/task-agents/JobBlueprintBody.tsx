/**
 * Shared body for the James (AdminAgent) job-blueprint match task agent.
 *
 * Mounted by both /manager/job-blueprint and /practitioner/job-blueprint
 * (Wave 4 Lane 4.D — P7.2). The two role pages are thin layout wrappers
 * around this component.
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { tasksService, type TaskAgentResponse } from "@/services/tasks/tasks.service"
import TaskAgentResultCard from "@/components/tasks/TaskAgentResultCard"
import CostEstimateBanner from "@/components/tasks/CostEstimateBanner"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const schema = z.object({
  role_title: z.string().min(1, "Role title is required").max(128),
  company_name: z.string().min(1, "Company name is required").max(255),
  role_responsibilities: z.string().min(1, "Responsibilities are required").max(4000),
  candidate_summary: z.string().min(1, "Candidate summary is required").max(4000),
  desired_outcomes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

/**
 * The reason a run failed, in the server's own words when it gave one.
 * axios's `err.message` is only "Request failed with status code 403"; the
 * engine's `detail` says why. FastAPI sends a string on 4xx and a list on 422.
 */
function describeMatchError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
    if (msgs.length) return msgs.join("; ")
  }
  return err instanceof Error ? err.message : ""
}

export default function JobBlueprintBody() {
  const { t } = useTranslation("studioUi")
  const [result, setResult] = useState<TaskAgentResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<Record<string, unknown>>({})

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_title: "",
      company_name: "",
      role_responsibilities: "",
      candidate_summary: "",
      desired_outcomes: "",
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.jobBlueprint,
    onSuccess: (data) => {
      setResult(data)
      toast.success(t("taskAgents.jobBlueprintBody.matchGenerated", { defaultValue: "Match generated." }))
    },
    onError: (err: unknown) => {
      const message = describeMatchError(err) || "Match failed"
      toast.error(t("taskAgents.jobBlueprintBody.jamesAdminagentFailed", { defaultValue: "James (AdminAgent) failed: {{message}}", message }))
    },
  })

  const matchErrorText = mutation.isError ? describeMatchError(mutation.error) : ""

  const onSubmit = (values: FormValues) => {
    setLastRequest(values as Record<string, unknown>)
    mutation.mutate(values)
  }

  const promptPreview = JSON.stringify(form.watch())

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <h1 className="text-2xl font-semibold">{t("taskAgents.jobBlueprintBody.jobBlueprintMatch", { defaultValue: "Role Blueprint Match" })}</h1>
        <TaskAgentResultCard
          result={result}
          onRerun={() => setResult(null)}
          taskSlug="job-blueprint"
          agentId="james"
          requestPayload={lastRequest}
          title={t("taskAgents.jobBlueprintBody.jobBlueprintMatch2", { defaultValue: "Role blueprint match" })}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{t("taskAgents.jobBlueprintBody.jobBlueprintMatch", { defaultValue: "Role Blueprint Match" })}</h1>
        <p className="text-sm text-slate-600">
          {t("taskAgents.jobBlueprintBody.matchACandidateAgainstA", { defaultValue: "Match a candidate against a role's blueprint via James (AdminAgent)." })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("taskAgents.jobBlueprintBody.inputs", { defaultValue: "Inputs" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_title">{t("taskAgents.jobBlueprintBody.roleTitle", { defaultValue: "Role title" })}</Label>
                <Input id="role_title" {...form.register("role_title")} />
                {form.formState.errors.role_title && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="company_name">{t("taskAgents.jobBlueprintBody.company", { defaultValue: "Company" })}</Label>
                <Input id="company_name" {...form.register("company_name")} />
                {form.formState.errors.company_name && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.company_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="role_responsibilities">{t("taskAgents.jobBlueprintBody.roleResponsibilities", { defaultValue: "Role responsibilities" })}</Label>
              <Textarea id="role_responsibilities" rows={5} {...form.register("role_responsibilities")} />
              {form.formState.errors.role_responsibilities && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_responsibilities.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="candidate_summary">{t("taskAgents.jobBlueprintBody.candidateSummary", { defaultValue: "Candidate summary" })}</Label>
              <Textarea id="candidate_summary" rows={5} {...form.register("candidate_summary")} />
              {form.formState.errors.candidate_summary && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.candidate_summary.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="desired_outcomes">{t("taskAgents.jobBlueprintBody.desiredOutcomesOptional", { defaultValue: "Desired outcomes (optional)" })}</Label>
              <Textarea id="desired_outcomes" rows={3} {...form.register("desired_outcomes")} />
            </div>

            <CostEstimateBanner promptText={promptPreview} />

            {/* A failed run must stay on the page, not only in a toast that
                times out (F-JAMES-1: a manager's run failed with nothing on screen). */}
            {mutation.isError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <p className="font-medium">
                  {t("taskAgents.jobBlueprintBody.matchFailedTitle", { defaultValue: "James could not produce the match. Nothing was generated." })}
                </p>
                {matchErrorText && <p className="mt-1">{matchErrorText}</p>}
                <p className="mt-1">
                  {t("taskAgents.jobBlueprintBody.matchFailedHint", { defaultValue: "Try again. If it keeps failing, ask your administrator to check that your account can use role blueprint matching." })}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("taskAgents.jobBlueprintBody.runJames", { defaultValue: "Run James" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  mutation.reset()
                }}
              >
                {t("taskAgents.jobBlueprintBody.reset", { defaultValue: "Reset" })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
