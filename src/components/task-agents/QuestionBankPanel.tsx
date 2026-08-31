/**
 * QuestionBankPanel — reviewer-facing browser for the shared STAR interview bank.
 *
 * Renders the 3-section framework (Vision / Behavioral / Productivity) with each
 * competency's primary STAR question, its probes, and the score-anchored
 * "listen-for" exemplars (strong / baseline / weak). Sourced from the agent-engine
 * question-bank endpoint — the same bank Maven scores against and James builds
 * candidate guides from. Mounted as a tab inside InterviewPrepBody.
 */
import { useState } from "react"
import { ChevronDown, Loader2, Target } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useQuestionBank } from "@/hooks/interview/useQuestionBank"
import type { StarCompetency } from "@/services/interview/interview.service"

function ExemplarRow({ label, text, tone }: { label: string; text: string; tone: string }) {
  if (!text) return null
  return (
    <div className="flex gap-2 text-xs">
      <span className={cn("mt-0.5 shrink-0 font-semibold", tone)}>{label}</span>
      <span className="text-slate-600">{text}</span>
    </div>
  )
}

function CompetencyCard({ c }: { c: StarCompetency }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-1">{c.competency}</Badge>
          <p className="text-sm font-medium text-slate-900">{c.question}</p>
        </div>
      </div>

      {c.starProbes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {c.starProbes.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-500">
              <span aria-hidden>↳</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}

      {c.exemplars && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            <Target className="h-3.5 w-3.5" />
            What to listen for (scoring anchors)
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5">
            <ExemplarRow label="Strong (5)" text={c.exemplars.strong} tone="text-emerald-600" />
            <ExemplarRow label="Baseline (3)" text={c.exemplars.baseline} tone="text-amber-600" />
            <ExemplarRow label="Weak (1)" text={c.exemplars.weak} tone="text-rose-600" />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export default function QuestionBankPanel() {
  const { data, isLoading, isError, error } = useQuestionBank({ includeExemplars: true })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading question bank…
      </div>
    )
  }

  if (isError || !data) {
    const message = error instanceof Error ? error.message : "Failed to load the question bank."
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">{message}</CardContent>
      </Card>
    )
  }

  const defaultTab = data.sections[0]?.key ?? "vision"

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">STAR interview question bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{data.guidance}</p>

          <Tabs defaultValue={defaultTab}>
            <TabsList>
              {data.sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  {s.section} · {s.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {data.sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="space-y-3 pt-2">
                {s.competencies.map((c) => (
                  <CompetencyCard key={c.id} c={c} />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
