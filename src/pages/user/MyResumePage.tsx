/**
 * Résumé Writer — the person's OWN résumé, under My Workspace (2026-10-19).
 *
 * Request: "add Résumé Writer to every user's menu but give it a UI that
 * matches the platform under My Workspace". Résumé Writer CSA, option 1.
 *
 * Not the Honor coach tool (/vertical/honor/resume), which drafts for a Fellow
 * and keeps its own look. This page drafts for whoever is signed in, from their
 * own résumé/bio and assessments, through `/v1/agents/resume-writer/me` — the
 * server takes the subject from the token, so nothing here names anyone.
 *
 * Three honest states the page must never blur into "here is a draft":
 *   - the server switch is off           → said so, Generate disabled
 *   - today's limit is used up           → said so, Generate disabled
 *   - nothing on file to ground a draft  → asks for a résumé or bio first
 */
import { useState } from "react"
import { Copy, Download, FileUp, Loader2, ScrollText, Sparkles } from "lucide-react"
import { toast } from "sonner"
import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal"
import { useAuth } from "@/context/useAuth"
import { useGenerateResume, useResumeWriterSources } from "@/hooks/useResumeWriter"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { downloadBlob } from "@/lib/exportTranscript"
import { resumeToPlainText } from "@/lib/resume/buildResumeHtml"
import { renderResumePdf } from "@/lib/resume/exportResume"
import { cn } from "@/lib/utils"
import { isResumeWriterDisabled, type GeneratedResume } from "@/types/resumeWriter"

const RESUME_UPLOAD: AddPersonalDocTarget = { name: "Résumé", docKind: "resume" }
const BIO_UPLOAD: AddPersonalDocTarget = { name: "Bio", docKind: "bio" }

function SourceChip({ on, label }: { on: boolean; label: string }) {
  return (
    <Badge
      variant={on ? "default" : "outline"}
      className={cn(!on && "text-muted-foreground")}
      data-testid={`source-${label.toLowerCase()}`}
    >
      {label}: {on ? "on file" : "not on file"}
    </Badge>
  )
}

function ResumeView({ resume, name }: { resume: GeneratedResume; name: string }) {
  return (
    <div className="space-y-4" data-testid="resume-draft">
      <div>
        <h2 className="text-xl font-semibold">{name}</h2>
        {resume.headline ? <p className="text-sm font-medium text-teal-700">{resume.headline}</p> : null}
        {resume.target ? (
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Target — {resume.target}</p>
        ) : null}
      </div>
      {resume.summary ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Professional summary</h3>
          <p className="text-sm leading-relaxed">{resume.summary}</p>
        </section>
      ) : null}
      {resume.competencies.length ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Core competencies</h3>
          <div className="flex flex-wrap gap-1.5">
            {resume.competencies.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
      {resume.experience.length ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Experience</h3>
          <div className="space-y-3">
            {resume.experience.map((e, i) => (
              <div key={`${e.title}-${i}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{e.title}</span>
                  <span className="text-xs text-muted-foreground">{e.dates}</span>
                </div>
                {e.organization ? <div className="text-xs text-teal-700">{e.organization}</div> : null}
                {e.bullets.length ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {[
        ["Education", resume.education],
        ["Certifications", resume.certifications],
      ].map(([title, items]) =>
        (items as string[]).length ? (
          <section key={title as string}>
            <h3 className="mb-1 text-sm font-semibold">{title as string}</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {(items as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      <p className="border-t pt-2 text-xs text-muted-foreground">
        {resume.sources.length ? `Drafted from: ${resume.sources.join(" · ")}. ` : ""}
        {resume.disclaimer}
      </p>
    </div>
  )
}

export default function MyResumePage() {
  const { user } = useAuth()
  const sources = useResumeWriterSources()
  const generate = useGenerateResume()
  const [role, setRole] = useState("")
  const [careerArea, setCareerArea] = useState("")
  const [positionText, setPositionText] = useState("")
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [uploadTarget, setUploadTarget] = useState<AddPersonalDocTarget | null>(null)
  const [exporting, setExporting] = useState(false)

  const name = user?.fullName || "My résumé"
  const data = sources.data
  const result = generate.data
  const draft = result && !isResumeWriterDisabled(result) ? result : null
  const switchedOff = data?.enabled === false || isResumeWriterDisabled(result)
  const used = draft?.usedToday ?? data?.usedToday ?? 0
  const limit = draft?.dailyLimit ?? data?.dailyLimit ?? 0
  const left = Math.max(0, limit - used)
  const limitReached = !!data && limit > 0 && used >= limit
  const hasText = !!data && (data.sources.resume || data.sources.bio)
  const hasAnything = hasText || (data?.sources.assessments.length ?? 0) > 0 || documentIds.length > 0
  const canGenerate = !!data && !switchedOff && !limitReached && hasAnything && !generate.isPending

  const toggleDoc = (id: string, on: boolean) =>
    setDocumentIds((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))

  const onGenerate = () => {
    generate.mutate({
      role: role.trim() || undefined,
      careerArea: careerArea.trim() || undefined,
      positionText: positionText.trim() || undefined,
      documentIds: documentIds.length ? documentIds : undefined,
    })
  }

  const onCopy = async () => {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(resumeToPlainText(draft, name))
      toast.success("Résumé copied.")
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.")
    }
  }

  const onDownload = async () => {
    if (!draft) return
    setExporting(true)
    try {
      const { fileName, blob } = await renderResumePdf(draft, name)
      downloadBlob(fileName, blob)
    } catch {
      toast.error("Couldn't build the PDF. Try again, or use Copy.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <header className="flex items-start gap-3">
          <ScrollText className="mt-1 h-6 w-6 text-teal-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Résumé Writer</h1>
            <p className="text-sm text-muted-foreground">
              Draft your résumé from the résumé, bio and assessments you have on file, aimed at the role you want.
            </p>
          </div>
        </header>

        {sources.isError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiErrorMessage(sources.error, "Couldn't load what you have on file. Try again in a moment.")}
          </div>
        ) : null}

        {switchedOff ? (
          <div
            role="status"
            data-testid="resume-writer-off"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            Résumé Writer is turned off right now. Your documents are still on file; try again later.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What&apos;s on file</CardTitle>
                <CardDescription>Your draft is written only from these. Nothing is invented.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : data ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <SourceChip on={data.sources.resume} label="Résumé" />
                      <SourceChip on={data.sources.bio} label="Bio" />
                      <SourceChip on={data.sources.assessments.length > 0} label="Assessments" />
                    </div>
                    {data.sources.assessments.length ? (
                      <p className="text-xs text-muted-foreground">
                        Assessments: {data.sources.assessments.join(", ")}
                      </p>
                    ) : null}
                    {!hasText ? (
                      <div data-testid="resume-no-source" className="rounded-md border border-dashed p-3 text-sm">
                        <p className="font-medium">Add your résumé or bio first</p>
                        <p className="mt-1 text-muted-foreground">
                          With neither on file, a draft would rest on your assessments alone and could not list your
                          experience.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setUploadTarget(RESUME_UPLOAD)}>
                            <FileUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Add your résumé
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setUploadTarget(BIO_UPLOAD)}>
                            Add a bio
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {data.documents.length ? (
                      <fieldset className="space-y-2">
                        <legend className="text-xs font-medium text-muted-foreground">
                          Also use these documents (optional)
                        </legend>
                        {data.documents.map((d) => (
                          <div key={d.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`doc-${d.id}`}
                              checked={documentIds.includes(d.id)}
                              onCheckedChange={(v) => toggleDoc(d.id, v === true)}
                            />
                            <Label htmlFor={`doc-${d.id}`} className="text-sm font-normal">
                              {d.filename}
                            </Label>
                          </div>
                        ))}
                      </fieldset>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Target</CardTitle>
                <CardDescription>Optional. Without one, the draft follows your own background.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="rw-role">Role</Label>
                  <Input
                    id="rw-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Operations Manager"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rw-area">Career area</Label>
                  <Input
                    id="rw-area"
                    value={careerArea}
                    onChange={(e) => setCareerArea(e.target.value)}
                    placeholder="e.g. Healthcare administration"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rw-jd">Job description</Label>
                  <Textarea
                    id="rw-jd"
                    rows={5}
                    value={positionText}
                    onChange={(e) => setPositionText(e.target.value)}
                    placeholder="Paste a job posting to aim the draft at it"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button onClick={onGenerate} disabled={!canGenerate}>
                    {generate.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    )}
                    {generate.isPending ? "Drafting…" : "Generate résumé"}
                  </Button>
                  {data && limit > 0 ? (
                    <span className="text-xs text-muted-foreground" data-testid="resume-left-today">
                      {left} of {limit} left today
                    </span>
                  ) : null}
                </div>
                {limitReached ? (
                  <p role="status" data-testid="resume-limit-reached" className="text-xs text-amber-700">
                    You&apos;ve used today&apos;s {limit} drafts. You can draft again tomorrow.
                  </p>
                ) : null}
                {generate.isError ? (
                  <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {apiErrorMessage(generate.error, "The draft couldn't be written. Try again in a moment.")}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[24rem]">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Your draft</CardTitle>
                <CardDescription>Review it before you use it. You can generate again any time today.</CardDescription>
              </div>
              {draft ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={onCopy}>
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Copy
                  </Button>
                  <Button size="sm" onClick={onDownload} disabled={exporting}>
                    <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {exporting ? "Building…" : "Download PDF"}
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {draft ? (
                <ResumeView resume={draft} name={name} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {generate.isPending ? "Drafting your résumé…" : "Your draft will appear here."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AddPersonalDocModal
        target={uploadTarget}
        onOpenChange={(open) => {
          if (!open) setUploadTarget(null)
        }}
        onUploaded={() => {
          void sources.refetch()
        }}
      />
    </UserLayout>
  )
}
