/**
 * /onboarding/wizard — Forge (OnboardingAgent) onboarding flow (Combined Plan §A.E3.4).
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
  new_hire_name: z.string().min(1).max(255),
  new_hire_role: z.string().min(1).max(128),
  company_name: z.string().min(1).max(255),
  company_culture_notes: z.string().max(4000).optional(),
  week_number: z.coerce.number().int().min(1).max(12).default(1),
})

type FormValues = z.input<typeof schema>

export default function OnboardingWizardPage() {
  const [result, setResult] = useState<TaskAgentResponse | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      new_hire_name: "",
      new_hire_role: "",
      company_name: "",
      company_culture_notes: "",
      week_number: 1,
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.onboarding,
    onSuccess: (data) => {
      setResult(data)
      toast.success("Onboarding plan generated.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Plan generation failed"
      toast.error(`Forge (OnboardingAgent) failed: ${message}`)
    },
  })

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values)
    mutation.mutate(parsed)
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Onboarding Wizard</h1>
        <TaskAgentResultCard result={result} onRerun={() => setResult(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Onboarding Wizard</h1>
        <p className="text-sm text-slate-600">
          Generate a tailored onboarding plan for a new hire with Forge (OnboardingAgent).
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
                <Label htmlFor="new_hire_name">New hire name</Label>
                <Input id="new_hire_name" {...form.register("new_hire_name")} />
              </div>
              <div>
                <Label htmlFor="new_hire_role">Role</Label>
                <Input id="new_hire_role" {...form.register("new_hire_role")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company</Label>
                <Input id="company_name" {...form.register("company_name")} />
              </div>
              <div>
                <Label htmlFor="week_number">Week number (1-12)</Label>
                <Input id="week_number" type="number" min={1} max={12} {...form.register("week_number")} />
              </div>
            </div>

            <div>
              <Label htmlFor="company_culture_notes">Company culture notes (optional)</Label>
              <Textarea id="company_culture_notes" rows={4} {...form.register("company_culture_notes")} />
            </div>

            <CostEstimateBanner promptText={JSON.stringify(form.watch())} />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Forge
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
