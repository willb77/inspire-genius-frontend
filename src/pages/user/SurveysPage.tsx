/**
 * /surveys — the Survey surface, backed by the survey-service.
 *
 * Access is two role SETS, not a seniority rank (mirrored server-side in
 * survey-service `app/authz.py` — this file only decides what to RENDER):
 *   • author     = every role EXCEPT plain `user`  → Build + Results
 *   • respondent = every role                      → Take
 * So a plain `user` sees only Take, and everyone else sees all three tabs and
 * can answer their own survey.
 *
 * The no-access card below is consequently unreachable for the six known roles.
 * It is kept as the fallback for an unrecognised role string rather than
 * deleted, so a future role defaults to no access instead of full access.
 *
 * Tabs:
 *   • Take    — pick a survey exposed to your org, answer + submit it.
 *   • Build   — author a survey (manual, or upload/paste to auto-draft), expose
 *               it to an organization, edit/delete existing ones.
 *   • Results — pick a survey and see the compilation across all respondents
 *               plus each individual response.
 *
 * Data is server-side (React Query hooks). Plain users see only the Take tab;
 * they also reach their org's surveys from Settings → My Workspace.
 */
import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { ClipboardList, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import UnifiedLayout from "@/layouts/UnifiedLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/useAuth"
import type { UserRole } from "@/types/roles"
import {
  useCreateSurvey,
  useDeleteSurvey,
  useSubmitResponse,
  useSurveys,
  useUpdateSurvey,
} from "@/hooks/survey/useSurveys"
import type { Survey, SurveyInput } from "@/types/survey"
import SurveySelector from "@/components/survey/SurveySelector"
import SurveyTaker from "@/components/survey/SurveyTaker"
import SurveyBuilder from "@/components/survey/SurveyBuilder"
import SurveyResults from "@/components/survey/SurveyResults"
import SurveyUploadDialog from "@/components/survey/SurveyUploadDialog"

type BuilderState =
  | { mode: "list" }
  | { mode: "new"; draft?: Survey }
  | { mode: "edit"; survey: Survey }

function toInput(s: Survey): SurveyInput {
  return {
    title: s.title,
    description: s.description,
    questions: s.questions,
    orgId: s.orgId ?? undefined,
    enabled: s.enabled,
  }
}

export default function SurveysPage() {
  const auth = useAuth()
  const role: UserRole = (auth.user?.role as UserRole) ?? "user"
  // Explicit sets rather than `isAtLeast`. The values currently coincide with a
  // rank test, but membership here is a product decision that has changed three
  // times in a day — a set states which roles are intended, where `>=` states
  // only "senior enough" and silently absorbs any role added to the hierarchy.
  const AUTHOR_ROLES: readonly string[] = [
    "manager",
    "company-admin",
    "practitioner",
    "distributor",
    "super-admin",
  ]
  const RESPONDENT_ROLES: readonly string[] = ["user", ...AUTHOR_ROLES]
  const isAuthor = AUTHOR_ROLES.includes(role)
  const canTake = RESPONDENT_ROLES.includes(role)
  const hasAnyAccess = isAuthor || canTake

  // An author who cannot take (manager / company-admin / practitioner) has no
  // Take trigger, so defaulting to "take" would render the Take PANEL with no
  // tab selected above it — content without a handle. Open on Build instead.
  const [tab, setTab] = useState<"take" | "build" | "results">(
    canTake ? "take" : "build",
  )

  const takeQuery = useSurveys("take", canTake)
  const manageQuery = useSurveys("manage", isAuthor)
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()
  const submitResponse = useSubmitResponse()

  const takeSurveys = useMemo(() => takeQuery.data ?? [], [takeQuery.data])
  const manageSurveys = useMemo(() => manageQuery.data ?? [], [manageQuery.data])

  // Preselect a survey when arriving from Settings → My Workspace.
  const location = useLocation()
  const seededSurveyId = (location.state as { surveyId?: string } | null)?.surveyId ?? null
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(seededSurveyId)
  const [selectedResultsId, setSelectedResultsId] = useState<string | null>(null)

  useEffect(() => {
    // A deep link to a survey to answer only makes sense for a respondent;
    // for a non-taking author it would switch to a tab they do not have.
    if (seededSurveyId && canTake) {
      setSelectedTakeId(seededSurveyId)
      setTab("take")
    }
  }, [seededSurveyId, canTake])
  const [builder, setBuilder] = useState<BuilderState>({ mode: "list" })
  const [uploadOpen, setUploadOpen] = useState(false)

  const selectedTake = useMemo(
    () => takeSurveys.find((s) => s.id === selectedTakeId) ?? null,
    [takeSurveys, selectedTakeId],
  )
  const selectedResults = useMemo(
    () => manageSurveys.find((s) => s.id === selectedResultsId) ?? null,
    [manageSurveys, selectedResultsId],
  )

  const handleSaveSurvey = (s: Survey) => {
    const input = toInput(s)
    const isExisting = builder.mode === "edit"
    const mut = isExisting
      ? updateSurvey.mutateAsync({ id: (builder as { survey: Survey }).survey.id, input })
      : createSurvey.mutateAsync(input)
    mut
      .then(() => {
        toast.success(isExisting ? "Survey updated." : "Survey created.")
        setBuilder({ mode: "list" })
      })
      .catch(() => toast.error("Could not save the survey."))
  }

  const handleDelete = (id: string) => {
    deleteSurvey
      .mutateAsync(id)
      .then(() => toast.success("Survey deleted."))
      .catch(() => toast.error("Could not delete the survey."))
  }

  const handleToggleEnabled = (s: Survey) => {
    const next = !s.enabled
    updateSurvey
      .mutateAsync({ id: s.id, input: { ...toInput(s), enabled: next } })
      .then(() => toast.success(next ? "Survey is now available." : "Survey hidden."))
      .catch(() => toast.error("Could not change availability."))
  }

  const handleSubmitResponse = (surveyId: string, answers: Record<string, unknown>) => {
    submitResponse.mutate({ surveyId, answers: answers as never })
  }

  if (!hasAnyAccess) {
    return (
      <UnifiedLayout role={role} expandOnPath="/surveys">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" aria-hidden />
                Surveys aren&apos;t available for your role
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your account&apos;s role is not recognised by the survey surface,
              so there is nothing to show here.
            </CardContent>
          </Card>
        </div>
      </UnifiedLayout>
    )
  }

  return (
    <UnifiedLayout role={role} expandOnPath="/surveys">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Surveys</h1>
            <p className="text-sm text-muted-foreground">
              {isAuthor
                ? "Build a survey, expose it to your organization, and see the results."
                : "Take the surveys shared with your organization."}
            </p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="mb-4">
            {canTake && <TabsTrigger value="take">Take a survey</TabsTrigger>}
            {isAuthor && <TabsTrigger value="build">Build surveys</TabsTrigger>}
            {isAuthor && <TabsTrigger value="results">Results</TabsTrigger>}
          </TabsList>

          {/* -------------------------------------------------------- Take --- */}
          <TabsContent value="take" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {takeQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading surveys…
                  </div>
                ) : (
                  <SurveySelector
                    surveys={takeSurveys}
                    value={selectedTakeId}
                    onChange={setSelectedTakeId}
                  />
                )}
              </CardContent>
            </Card>

            {selectedTake ? (
              <SurveyTaker
                key={selectedTake.id}
                survey={selectedTake}
                onSubmit={(answers) => handleSubmitResponse(selectedTake.id, answers)}
                onDone={() => setSelectedTakeId(null)}
              />
            ) : (
              takeSurveys.length > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Pick a survey above to begin.
                </p>
              )
            )}
          </TabsContent>

          {/* ------------------------------------------------------- Build --- */}
          {isAuthor && (
            <TabsContent value="build" className="space-y-4">
              {builder.mode === "list" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">Your surveys</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setUploadOpen(true)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upload / paste
                      </Button>
                      <Button onClick={() => setBuilder({ mode: "new" })}>
                        <Plus className="mr-2 h-4 w-4" />
                        New survey
                      </Button>
                    </div>
                  </div>

                  {manageQuery.isLoading ? (
                    <Card>
                      <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </CardContent>
                    </Card>
                  ) : manageSurveys.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        No surveys yet. Click <strong>New survey</strong> to add your
                        questions, or <strong>Upload / paste</strong> to build one from
                        text.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {manageSurveys.map((s) => (
                        <Card key={s.id} data-testid={`survey-row-${s.id}`}>
                          <CardHeader className="flex flex-row items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-base">
                                {s.title || "Untitled survey"}
                              </CardTitle>
                              {s.description && (
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                  {s.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant={s.enabled ? "default" : "outline"}>
                                  {s.enabled ? "Available" : "Off"}
                                </Badge>
                                <Badge variant="secondary">
                                  {s.questions.length}{" "}
                                  {s.questions.length === 1 ? "question" : "questions"}
                                </Badge>
                                <Badge variant="outline">
                                  {s.responseCount ?? 0} responses
                                </Badge>
                                {s.orgId && (
                                  <Badge variant="outline">org: {s.orgId}</Badge>
                                )}
                              </div>
                              {(s.createdByName || s.createdByEmail) && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Created by {s.createdByName || "—"}
                                  {s.createdByEmail ? ` · ${s.createdByEmail}` : ""}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Switch
                                checked={!!s.enabled}
                                onCheckedChange={() => handleToggleEnabled(s)}
                                aria-label={`Toggle availability for ${s.title || "survey"}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBuilder({ mode: "edit", survey: s })}
                                aria-label={`Edit ${s.title || "survey"}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(s.id)}
                                aria-label={`Delete ${s.title || "survey"}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              {builder.mode === "new" && (
                <SurveyBuilder
                  initial={builder.draft}
                  onSave={handleSaveSurvey}
                  onCancel={() => setBuilder({ mode: "list" })}
                />
              )}

              {builder.mode === "edit" && (
                <SurveyBuilder
                  initial={builder.survey}
                  onSave={handleSaveSurvey}
                  onCancel={() => setBuilder({ mode: "list" })}
                />
              )}
            </TabsContent>
          )}

          {/* ----------------------------------------------------- Results --- */}
          {isAuthor && (
            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <SurveySelector
                    surveys={manageSurveys}
                    value={selectedResultsId}
                    onChange={setSelectedResultsId}
                    label="Select a survey to see results"
                    id="results-selector"
                  />
                </CardContent>
              </Card>
              {selectedResults ? (
                <SurveyResults key={selectedResults.id} survey={selectedResults} />
              ) : (
                manageSurveys.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Pick a survey above to see its results.
                  </p>
                )
              )}
            </TabsContent>
          )}
        </Tabs>

        <SurveyUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onDraft={(draft) => {
            setBuilder({ mode: "new", draft })
            setTab("build")
          }}
        />
      </div>
    </UnifiedLayout>
  )
}
