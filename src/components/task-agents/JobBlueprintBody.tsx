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

const schema = z.object({
  role_title: z.string().min(1, "Role title is required").max(128),
  company_name: z.string().min(1, "Company name is required").max(255),
  role_responsibilities: z.string().min(1, "Responsibilities are required").max(4000),
  candidate_summary: z.string().min(1, "Candidate summary is required").max(4000),
  desired_outcomes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export default function JobBlueprintBody() {
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
      toast.success("Match generated.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Match failed"
      toast.error(`James (AdminAgent) failed: ${message}`)
    },
  })

  const onSubmit = (values: FormValues) => {
    setLastRequest(values as Record<string, unknown>)
    mutation.mutate(values)
  }

  const promptPreview = JSON.stringify(form.watch())

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Job Blueprint Match</h1>
        <TaskAgentResultCard
          result={result}
          onRerun={() => setResult(null)}
          taskSlug="job-blueprint"
          agentId="james"
          requestPayload={lastRequest}
          title="Job blueprint match"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Job Blueprint Match</h1>
        <p className="text-sm text-slate-600">
          Match a candidate against a role's blueprint via James (AdminAgent).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_title">Role title</Label>
                <Input id="role_title" {...form.register("role_title")} />
                {form.formState.errors.role_title && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="company_name">Company</Label>
                <Input id="company_name" {...form.register("company_name")} />
                {form.formState.errors.company_name && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.company_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="role_responsibilities">Role responsibilities</Label>
              <Textarea id="role_responsibilities" rows={5} {...form.register("role_responsibilities")} />
              {form.formState.errors.role_responsibilities && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_responsibilities.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="candidate_summary">Candidate summary</Label>
              <Textarea id="candidate_summary" rows={5} {...form.register("candidate_summary")} />
              {form.formState.errors.candidate_summary && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.candidate_summary.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="desired_outcomes">Desired outcomes (optional)</Label>
              <Textarea id="desired_outcomes" rows={3} {...form.register("desired_outcomes")} />
            </div>

            <CostEstimateBanner promptText={promptPreview} />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run James
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
