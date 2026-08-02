/**
 * InterviewFrameForm — set the frame for a practice interview.
 *
 * Meridian asks the candidate to confirm the seat they're practising for before
 * the questions start. Five required fields + a few optional ones; on confirm
 * the frame is passed into coaching so Alex tailors questions + feedback to the
 * specific role, reporting line, and scope.
 */
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  type InterviewFrame,
  DEFAULT_LENGTH_PREF,
} from "@/services/interview/practice.service"

const schema = z.object({
  company: z.string().min(1, "Company is required").max(255),
  industry: z.string().min(1, "Industry / sector is required").max(160),
  roleTitle: z.string().min(1, "Role title is required").max(160),
  reportingLine: z.string().min(1, "Reporting line is required").max(200),
  scope: z.string().min(1, "Scope of responsibility is required").max(600),
  candidateType: z.enum(["", "external", "internal"]).optional(),
  weightedFocus: z.string().max(600).optional(),
  lengthPref: z.string().max(300).optional(),
})

type FormValues = z.infer<typeof schema>

export default function InterviewFrameForm({
  initial,
  onConfirm,
}: {
  initial?: InterviewFrame | null
  onConfirm: (frame: InterviewFrame) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: initial?.company ?? "",
      industry: initial?.industry ?? "",
      roleTitle: initial?.roleTitle ?? "",
      reportingLine: initial?.reportingLine ?? "",
      scope: initial?.scope ?? "",
      candidateType: initial?.candidateType ?? "",
      weightedFocus: initial?.weightedFocus ?? "",
      lengthPref: initial?.lengthPref ?? "",
    },
  })

  const err = (k: keyof FormValues) =>
    form.formState.errors[k] ? (
      <p className="mt-1 text-xs text-red-600">{form.formState.errors[k]?.message as string}</p>
    ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Set up your practice interview</CardTitle>
        <p className="text-sm text-slate-600">
          Before we begin, please confirm a few things so the questions and coaching
          fit the actual seat you're preparing for.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => onConfirm(v as InterviewFrame))} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Please confirm five things</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="company">Company (the hiring organization)</Label>
              <Input id="company" {...form.register("company")} />
              {err("company")}
            </div>
            <div>
              <Label htmlFor="industry">Industry / sector</Label>
              <Input id="industry" {...form.register("industry")} />
              {err("industry")}
            </div>
            <div>
              <Label htmlFor="roleTitle">Role title being interviewed for</Label>
              <Input id="roleTitle" {...form.register("roleTitle")} />
              {err("roleTitle")}
            </div>
            <div>
              <Label htmlFor="reportingLine">Reporting line (who this role reports to)</Label>
              <Input id="reportingLine" {...form.register("reportingLine")} />
              {err("reportingLine")}
            </div>
          </div>
          <div>
            <Label htmlFor="scope">Scope of responsibility (team size, budget, P&amp;L, geography — whatever defines the seat)</Label>
            <Textarea id="scope" rows={2} {...form.register("scope")} />
            {err("scope")}
          </div>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional but useful</p>
          <div>
            <Label>Is this an external candidate or internal promotion?</Label>
            <div className="mt-1 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" value="external" {...form.register("candidateType")} /> External candidate
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="internal" {...form.register("candidateType")} /> Internal promotion
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="weightedFocus">
              Any competencies or risks to weight more heavily? (e.g. turnaround experience, M&amp;A integration, regulatory exposure)
            </Label>
            <Textarea id="weightedFocus" rows={2} {...form.register("weightedFocus")} />
          </div>
          <div>
            <Label htmlFor="lengthPref">Interview length preference</Label>
            <Input id="lengthPref" placeholder={DEFAULT_LENGTH_PREF} {...form.register("lengthPref")} />
            <p className="mt-1 text-xs text-slate-500">
              Default is {DEFAULT_LENGTH_PREF}. Leave blank to accept, or adjust.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit">Confirm &amp; start practicing</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
