/**
 * Shared body for the Atlas (DashboardAgent) team composition task agent.
 *
 * Mounted by both /manager/team-composition and /practitioner/team-composition
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
  team_name: z.string().min(1, "Team name is required").max(255),
  team_purpose: z.string().min(1, "Team purpose is required").max(2000),
  member_summaries: z.string().min(1, "At least one member summary is required"),
  target_skills: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function TeamCompositionBody() {
  const [result, setResult] = useState<TaskAgentResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<Record<string, unknown>>({})

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      team_name: "",
      team_purpose: "",
      member_summaries: "",
      target_skills: "",
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.teamComposition,
    onSuccess: (data) => {
      setResult(data)
      toast.success("Team composition analysis ready.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Analysis failed"
      toast.error(`Atlas (DashboardAgent) failed: ${message}`)
    },
  })

  const onSubmit = (values: FormValues) => {
    const memberSummaries = values.member_summaries
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    const targetSkills = values.target_skills
      ? values.target_skills.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    if (memberSummaries.length === 0) {
      toast.error("At least one member summary is required")
      return
    }
    const payload = {
      team_name: values.team_name,
      team_purpose: values.team_purpose,
      member_summaries: memberSummaries,
      target_skills: targetSkills,
    }
    setLastRequest(payload as Record<string, unknown>)
    mutation.mutate(payload)
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Team Composition</h1>
        <TaskAgentResultCard
          result={result}
          onRerun={() => setResult(null)}
          taskSlug="team-composition"
          agentId="atlas"
          requestPayload={lastRequest}
          title="Team composition"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Team Composition</h1>
        <p className="text-sm text-slate-600">
          Analyse a team's PRISM mix, skills, and gaps with Atlas (DashboardAgent).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="team_name">Team name</Label>
              <Input id="team_name" {...form.register("team_name")} />
              {form.formState.errors.team_name && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.team_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="team_purpose">Team purpose</Label>
              <Textarea id="team_purpose" rows={3} {...form.register("team_purpose")} />
              {form.formState.errors.team_purpose && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.team_purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="member_summaries">
                Member summaries (one per line)
              </Label>
              <Textarea
                id="member_summaries"
                rows={6}
                placeholder={"Jane Doe — Senior PM, Gold/Green, 4 yrs\nJohn Smith — Eng Lead, Blue/Orange, 6 yrs"}
                {...form.register("member_summaries")}
              />
              {form.formState.errors.member_summaries && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.member_summaries.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="target_skills">Target skills (comma-separated, optional)</Label>
              <Input
                id="target_skills"
                placeholder="strategic thinking, async comms, data fluency"
                {...form.register("target_skills")}
              />
            </div>

            <CostEstimateBanner promptText={JSON.stringify(form.watch())} />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Atlas
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
