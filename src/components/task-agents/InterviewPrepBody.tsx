/**
 * Shared body for the Maven (InterviewAgent) interview prep task agent.
 *
 * Mounted by both /manager/interview-prep and /practitioner/interview-prep
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { tasksService, type InterviewPrepRequest, type TaskAgentResponse } from "@/services/tasks/tasks.service"
import TaskAgentResultCard from "@/components/tasks/TaskAgentResultCard"
import CostEstimateBanner from "@/components/tasks/CostEstimateBanner"
import QuestionBankPanel from "@/components/task-agents/QuestionBankPanel"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const schema = z.object({
  company_name: z.string().min(1, "Company name is required").max(255),
  industry: z.string().min(1, "Industry is required").max(128),
  role_title: z.string().min(1, "Role title is required").max(128),
  candidate_name: z.string().max(255).optional(),
  interview_focus: z.string().max(2000).optional(),
  // The interview frame. Caps match the engine's InterviewPrepRequest.
  reporting_line: z.string().max(255).optional(),
  scope: z.string().max(2000).optional(),
  topic: z.string().max(255).optional(),
})

type FormValues = z.infer<typeof schema>

/**
 * The reason a run failed, in the server's own words when it gave one.
 * axios's `err.message` is only "Request failed with status code 403"; the
 * engine's `detail` says why. FastAPI sends a string on 4xx and a list on 422.
 */
function describePrepError(err: unknown): string {
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

/** The optional frame fields. Each is sent only when it carries text. */
const FRAME_FIELDS = ["reporting_line", "scope", "topic"] as const

/**
 * The request body. The required fields, candidate_name and interview_focus go
 * as before; a blank frame field is omitted rather than sent as "".
 */
function buildPrepRequest(values: FormValues): InterviewPrepRequest {
  const body: InterviewPrepRequest = {
    company_name: values.company_name,
    industry: values.industry,
    role_title: values.role_title,
    candidate_name: values.candidate_name,
    interview_focus: values.interview_focus,
  }
  for (const key of FRAME_FIELDS) {
    const v = values[key]?.trim()
    if (v) body[key] = v
  }
  return body
}

type PrepFailureKind = "forbidden" | "timeout" | "other"

/**
 * Why a run failed, for the hint under the alert. Only a 403 is an access
 * problem. A gateway 502/503/504, or a request that got no response at all
 * (the gateway's own 503 can arrive without CORS headers, so the browser
 * reports a bare network error), means the plan took too long to prepare.
 */
function prepFailureKind(err: unknown): PrepFailureKind {
  const response = (err as { response?: { status?: unknown } } | null)?.response
  const status = response?.status
  if (status === 403) return "forbidden"
  if (status === 502 || status === 503 || status === 504) return "timeout"
  if (!response) return "timeout"
  return "other"
}

export default function InterviewPrepBody() {
  const { t } = useTranslation("studioUi")
  const [result, setResult] = useState<TaskAgentResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<Record<string, unknown>>({})

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      industry: "",
      role_title: "",
      candidate_name: "",
      interview_focus: "",
      reporting_line: "",
      scope: "",
      topic: "",
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.interviewPrep,
    onSuccess: (data) => {
      setResult(data)
      toast.success(t("taskAgents.interviewPrepBody.interviewPrepGenerated", { defaultValue: "Interview prep generated." }))
    },
    onError: (err: unknown) => {
      const message = describePrepError(err) || "Prep failed"
      toast.error(t("taskAgents.interviewPrepBody.mavenInterviewagentFailed", { defaultValue: "Maven (InterviewAgent) failed: {{message}}", message }))
    },
  })

  const prepErrorText = mutation.isError ? describePrepError(mutation.error) : ""
  const failureKind = mutation.isError ? prepFailureKind(mutation.error) : null

  const onSubmit = (values: FormValues) => {
    const body = buildPrepRequest(values)
    setLastRequest({ ...body })
    mutation.mutate(body)
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <h1 className="text-2xl font-semibold">{t("taskAgents.interviewPrepBody.interviewPrep", { defaultValue: "Interview Prep" })}</h1>
        <TaskAgentResultCard
          result={result}
          onRerun={() => setResult(null)}
          taskSlug="interview-prep"
          agentId="maven"
          requestPayload={lastRequest}
          title={t("taskAgents.interviewPrepBody.interviewPrep2", { defaultValue: "Interview prep" })}
          renderMarkdown
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{t("taskAgents.interviewPrepBody.interviewPrep", { defaultValue: "Interview Prep" })}</h1>
        <p className="text-sm text-slate-600">
          {t("taskAgents.interviewPrepBody.getAStructured3Section", { defaultValue: "Get a structured 3-section interview plan from Maven (InterviewAgent), or browse the shared STAR question bank with scoring anchors." })}
        </p>
      </header>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">{t("taskAgents.interviewPrepBody.generatePrep", { defaultValue: "Generate prep" })}</TabsTrigger>
          <TabsTrigger value="bank">{t("taskAgents.interviewPrepBody.questionBank", { defaultValue: "Question bank" })}</TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="pt-4">
          <QuestionBankPanel />
        </TabsContent>

        <TabsContent value="generate" className="pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("taskAgents.interviewPrepBody.inputs", { defaultValue: "Inputs" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">{t("taskAgents.interviewPrepBody.company", { defaultValue: "Company" })}</Label>
                <Input id="company_name" {...form.register("company_name")} />
                {form.formState.errors.company_name && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.company_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="industry">{t("taskAgents.interviewPrepBody.industry", { defaultValue: "Industry" })}</Label>
                <Input id="industry" {...form.register("industry")} />
                {form.formState.errors.industry && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.industry.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_title">{t("taskAgents.interviewPrepBody.roleTitle", { defaultValue: "Role title" })}</Label>
                <Input id="role_title" {...form.register("role_title")} />
                {form.formState.errors.role_title && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="candidate_name">{t("taskAgents.interviewPrepBody.candidateNameOptional", { defaultValue: "Candidate name (optional)" })}</Label>
                <Input id="candidate_name" {...form.register("candidate_name")} />
              </div>
            </div>

            <div>
              <Label htmlFor="interview_focus">{t("taskAgents.interviewPrepBody.interviewFocusOptional", { defaultValue: "Interview focus (optional)" })}</Label>
              <Textarea id="interview_focus" rows={3} {...form.register("interview_focus")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reporting_line">{t("taskAgents.interviewPrepBody.reportingLineOptional", { defaultValue: "Reporting line (optional)" })}</Label>
                <Input id="reporting_line" maxLength={255} {...form.register("reporting_line")} />
                {form.formState.errors.reporting_line && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.reporting_line.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="topic">{t("taskAgents.interviewPrepBody.topicOptional", { defaultValue: "Career or education topic (optional)" })}</Label>
                <Input id="topic" maxLength={255} {...form.register("topic")} />
                {form.formState.errors.topic && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.topic.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="scope">{t("taskAgents.interviewPrepBody.scopeOptional", { defaultValue: "Scope (optional)" })}</Label>
              <Textarea id="scope" rows={3} maxLength={2000} {...form.register("scope")} />
              {form.formState.errors.scope && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.scope.message}</p>
              )}
            </div>

            <CostEstimateBanner promptText={JSON.stringify(form.watch())} />

            {/* W6: a failed run must stay on the page, not only in a toast that
                times out — a manager saw a 403 here and nothing on screen. */}
            {mutation.isError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <p className="font-medium">
                  {t("taskAgents.interviewPrepBody.prepFailedTitle", { defaultValue: "Maven could not prepare the questions. Nothing was generated." })}
                </p>
                {prepErrorText && <p className="mt-1">{prepErrorText}</p>}
                <p className="mt-1">
                  {failureKind === "forbidden"
                    ? t("taskAgents.interviewPrepBody.prepFailedHint", { defaultValue: "Try again. If it keeps failing, ask your administrator to check that your account can use interview prep." })
                    : failureKind === "timeout"
                      ? t("taskAgents.interviewPrepBody.prepTimedOutHint", { defaultValue: "This took too long to prepare. Try again, or narrow the scope." })
                      : t("taskAgents.interviewPrepBody.prepFailedRetryHint", { defaultValue: "Try again in a moment." })}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("taskAgents.interviewPrepBody.runMaven", { defaultValue: "Run Maven" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  mutation.reset()
                }}
              >
                {t("taskAgents.interviewPrepBody.reset", { defaultValue: "Reset" })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
