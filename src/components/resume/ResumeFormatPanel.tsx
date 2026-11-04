/**
 * RWO-2 — pick a résumé format and bullet style (2026-11-03).
 *
 * Rendered only while the server's `resume_writer_options` switch is on. Every
 * word about a format comes from the server's catalogue (`GET /me` → `options`),
 * so the page and the server can never describe a format differently, and no
 * prompt text lives in this (public) repository.
 */
import { useState } from "react"
import { Check, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  situationsFor,
  USES,
  inputLabel,
  recommendFormat,
  type Recommendation,
  type Situation,
  type UseWhere,
} from "@/lib/resume/formatSelector"
import type { BulletStyleView, ResumeOptionView } from "@/types/resumeWriter"

export type FormatChoice = { optionId: string; styleId: string; disclosure: string; federalDetails: string }

export interface ResumeFormatPanelProps {
  options: ResumeOptionView[]
  styles: BulletStyleView[]
  value: FormatChoice
  onChange: (next: FormatChoice) => void
  defaultOption: string
  /** What is already on file, for the input checklist. */
  onFile: { resume: boolean; bio: boolean; assessments: boolean }
}

const SELECT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

export function ResumeFormatPanel({ options, styles, value, onChange, defaultOption, onFile }: ResumeFormatPanelProps) {
  const [situation, setSituation] = useState<Situation | "">("")
  const [where, setWhere] = useState<UseWhere>("online")
  const [hasPosting, setHasPosting] = useState(false)
  const [rec, setRec] = useState<Recommendation | null>(null)

  const chosen = options.find((o) => o.id === value.optionId) ?? options[0]
  const nameOf = (id?: string) => options.find((o) => o.id === id)?.name ?? ""

  const recommend = () => {
    if (!situation) return
    const r = recommendFormat(situation, where, hasPosting, options.map((o) => o.id), defaultOption)
    setRec(r)
    onChange({ ...value, optionId: r.optionId })
  }

  const onFileFor = (key: string): boolean | null => {
    if (key === "work_history" || key === "skills" || key === "education") return onFile.resume || onFile.bio
    if (key === "prism_report") return onFile.assessments
    return null
  }

  return (
    <div className="space-y-4" data-testid="resume-format-panel">
      <fieldset className="space-y-2 rounded-md border border-dashed p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Not sure? Answer two questions</legend>
        <div className="space-y-1">
          <Label htmlFor="rw-situation">You are…</Label>
          <select
            id="rw-situation"
            className={SELECT}
            value={situation}
            onChange={(e) => setSituation(e.target.value as Situation)}
          >
            <option value="">Choose one</option>
            {situationsFor(options.map((o) => o.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rw-where">This résumé is for…</Label>
          <select id="rw-where" className={SELECT} value={where} onChange={(e) => setWhere(e.target.value as UseWhere)}>
            {USES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasPosting} onChange={(e) => setHasPosting(e.target.checked)} />
          I have the job posting
        </label>
        <Button size="sm" variant="outline" onClick={recommend} disabled={!situation}>
          <Wand2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Recommend a format
        </Button>
        {rec ? (
          <div data-testid="resume-format-recommendation" className="space-y-1 rounded-md bg-teal-50 p-2 text-xs">
            <p>
              <span className="font-medium">Recommended: {nameOf(rec.optionId)}.</span> {rec.why}
              {rec.alternativeId ? ` Alternative: ${nameOf(rec.alternativeId)}.` : ""}
            </p>
            {rec.notes.map((n) => (
              <p key={n} className="text-muted-foreground">
                {n}
              </p>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div role="radiogroup" aria-label="Résumé format" className="space-y-2">
        {options.map((o) => {
          const on = o.id === chosen?.id
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`resume-format-${o.id}`}
              onClick={() => onChange({ ...value, optionId: o.id })}
              className={cn(
                "w-full rounded-md border p-2 text-left text-sm transition-colors",
                on ? "border-teal-600 bg-teal-50" : "hover:bg-muted/50",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {o.number}. {o.name}
                </span>
                {on ? <Check className="h-4 w-4 text-teal-700" aria-hidden="true" /> : null}
              </span>
              <span className="block text-xs text-muted-foreground">{o.useWhen}</span>
            </button>
          )
        })}
      </div>

      {chosen ? (
        <div data-testid="resume-format-detail" className="space-y-1 rounded-md bg-muted/40 p-3 text-xs">
          <p>
            <span className="font-medium">You get:</span> {chosen.expect}
          </p>
          <p>
            <span className="font-medium">Avoid when:</span> {chosen.avoidWhen}
          </p>
          <div className="pt-1">
            <p className="font-medium">To get the best draft, have on file:</p>
            <ul className="mt-0.5 space-y-0.5" data-testid="resume-format-inputs">
              {[...chosen.requiredInputs, ...chosen.recommendedInputs].map((k, i) => {
                const known = onFileFor(k)
                return (
                  <li key={`${k}-${i}`} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full",
                        known === true ? "bg-teal-600" : known === false ? "bg-amber-500" : "bg-slate-400",
                      )}
                    />
                    {inputLabel(k)}
                    {i < chosen.requiredInputs.length ? "" : " (helps)"}
                  </li>
                )
              })}
            </ul>
            <p className="pt-1 text-muted-foreground">
              Numbers matter most — an estimate is fine if your résumé says it is one. Nothing is invented.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="rw-style">Bullet style</Label>
        <select
          id="rw-style"
          className={SELECT}
          value={value.styleId}
          onChange={(e) => onChange({ ...value, styleId: e.target.value })}
        >
          {styles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.structure}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{styles.find((s) => s.id === value.styleId)?.bestFor}</p>
      </div>

      {chosen?.takesDisclosure ? (
        <div className="space-y-1">
          <Label htmlFor="rw-disclosure">How should a gap or program be described? (optional)</Label>
          <Textarea
            id="rw-disclosure"
            rows={2}
            maxLength={300}
            value={value.disclosure}
            onChange={(e) => onChange({ ...value, disclosure: e.target.value })}
            placeholder="e.g. Kitchen Worker, State Workforce Program, 2019–2023"
          />
          <p className="text-xs text-muted-foreground">Used for this draft only. Not saved.</p>
        </div>
      ) : null}

      {chosen?.takesFederalDetails ? (
        <div className="space-y-1" data-testid="resume-federal-details">
          <Label htmlFor="rw-federal">Federal details</Label>
          <Textarea
            id="rw-federal"
            rows={3}
            maxLength={600}
            value={value.federalDetails}
            onChange={(e) => onChange({ ...value, federalDetails: e.target.value })}
            placeholder="For each job: hours per week. For any federal job: series and grade (e.g. GS-0343-09). Any current security clearance."
          />
          <p className="text-xs text-muted-foreground">
            USAJOBS asks for these. Anything not here or in your résumé is left off. Used for this draft only — not saved.
          </p>
          <p className="text-xs text-muted-foreground">
            Paste the announcement — at least its Qualifications section — in Job description.
            {chosen.pageLimit ? ` USAJOBS accepts ${chosen.pageLimit} pages at most.` : ""}
          </p>
        </div>
      ) : null}
    </div>
  )
}
