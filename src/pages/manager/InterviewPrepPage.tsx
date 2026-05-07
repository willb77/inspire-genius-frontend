/**
 * /manager/interview-prep — Maven (InterviewAgent) interview prep (Combined Plan §A.E3.4).
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import ManagerLayout from "@/layouts/ManagerLayout"
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
  company_name: z.string().min(1, "Company name is required").max(255),
  industry: z.string().min(1, "Industry is required").max(128),
  role_title: z.string().min(1, "Role title is required").max(128),
  candidate_name: z.string().max(255).optional(),
  interview_focus: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export default function InterviewPrepPage() {
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
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.interviewPrep,
    onSuccess: (data) => {
      setResult(data)
      toast.success("Interview prep generated.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Prep failed"
      toast.error(`Maven (InterviewAgent) failed: ${message}`)
    },
  })

  const onSubmit = (values: FormValues) => {
    setLastRequest(values as Record<string, unknown>)
    mutation.mutate(values)
  }

  if (result) {
    return (
      <ManagerLayout>
        <div className="mx-auto max-w-3xl py-8 space-y-4">
          <h1 className="text-2xl font-semibold">Interview Prep</h1>
          <TaskAgentResultCard
            result={result}
            onRerun={() => setResult(null)}
            taskSlug="interview-prep"
            agentId="maven"
            requestPayload={lastRequest}
            title="Interview prep"
          />
        </div>
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Interview Prep</h1>
          <p className="text-sm text-slate-600">
            Get a structured 3-section interview plan from Maven (InterviewAgent).
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
                  <Label htmlFor="company_name">Company</Label>
                  <Input id="company_name" {...form.register("company_name")} />
                  {form.formState.errors.company_name && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.company_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" {...form.register("industry")} />
                  {form.formState.errors.industry && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.industry.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role_title">Role title</Label>
                  <Input id="role_title" {...form.register("role_title")} />
                  {form.formState.errors.role_title && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.role_title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="candidate_name">Candidate name (optional)</Label>
                  <Input id="candidate_name" {...form.register("candidate_name")} />
                </div>
              </div>

              <div>
                <Label htmlFor="interview_focus">Interview focus (optional)</Label>
                <Textarea id="interview_focus" rows={3} {...form.register("interview_focus")} />
              </div>

              <CostEstimateBanner promptText={JSON.stringify(form.watch())} />

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Maven
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}
