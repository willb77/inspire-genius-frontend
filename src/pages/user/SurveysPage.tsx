/**
 * /surveys — the Survey surface.
 *
 * Two tabs:
 *   • Take  — a selector to pick a survey, then answer + submit it.
 *   • Build — author a new survey (add questions) or edit/delete existing ones.
 *
 * Data is browser-local (see `surveyStore`), so the whole surface works without
 * a backend. The layout is role-adaptive (`UnifiedLayout role={…}`) so managers,
 * practitioners, admins and users each keep their own chrome.
 */
import { useMemo, useState } from "react"
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react"

import UnifiedLayout from "@/layouts/UnifiedLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/useAuth"
import type { UserRole } from "@/types/roles"
import { useSurveys } from "@/hooks/useSurveys"
import { countResponses } from "@/lib/surveyStore"
import type { Survey } from "@/types/survey"
import SurveySelector from "@/components/survey/SurveySelector"
import SurveyTaker from "@/components/survey/SurveyTaker"
import SurveyBuilder from "@/components/survey/SurveyBuilder"

type BuilderState =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "edit"; survey: Survey }

export default function SurveysPage() {
  const { user } = useAuth()
  const role: UserRole = (user?.role as UserRole) ?? "user"

  const { surveys, upsertSurvey, removeSurvey, submitResponse } = useSurveys()

  const [tab, setTab] = useState<"take" | "build">("take")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [builder, setBuilder] = useState<BuilderState>({ mode: "list" })

  const selectedSurvey = useMemo(
    () => surveys.find((s) => s.id === selectedId) ?? null,
    [surveys, selectedId],
  )

  const handleSaveSurvey = (survey: Survey) => {
    upsertSurvey(survey)
    setBuilder({ mode: "list" })
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
              Build a survey, then select one to take.
            </p>
          </div>
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "take" | "build")}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="take">Take a survey</TabsTrigger>
            <TabsTrigger value="build">Build surveys</TabsTrigger>
          </TabsList>

          {/* -------------------------------------------------------- Take --- */}
          <TabsContent value="take" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <SurveySelector
                  surveys={surveys}
                  value={selectedId}
                  onChange={setSelectedId}
                />
              </CardContent>
            </Card>

            {selectedSurvey ? (
              <SurveyTaker
                key={selectedSurvey.id}
                survey={selectedSurvey}
                onSubmit={(answers) =>
                  submitResponse(selectedSurvey.id, answers)
                }
                onDone={() => setSelectedId(null)}
              />
            ) : (
              surveys.length > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Pick a survey above to begin.
                </p>
              )
            )}
          </TabsContent>

          {/* ------------------------------------------------------- Build --- */}
          <TabsContent value="build" className="space-y-4">
            {builder.mode === "list" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Your surveys</h2>
                  <Button onClick={() => setBuilder({ mode: "new" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    New survey
                  </Button>
                </div>

                {surveys.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No surveys yet. Click <strong>New survey</strong> to add
                      your questions.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {surveys.map((s) => (
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
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {s.questions.length}{" "}
                                {s.questions.length === 1
                                  ? "question"
                                  : "questions"}
                              </Badge>
                              <Badge variant="outline">
                                {countResponses(s.id)} responses
                              </Badge>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setBuilder({ mode: "edit", survey: s })
                              }
                              aria-label={`Edit ${s.title || "survey"}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSurvey(s.id)}
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
        </Tabs>
      </div>
    </UnifiedLayout>
  )
}
