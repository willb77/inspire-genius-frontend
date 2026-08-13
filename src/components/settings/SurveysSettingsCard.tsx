/**
 * SurveysSettingsCard — "My Workspace → Surveys" inside the user Settings page.
 *
 * Lists the surveys exposed to the signed-in user's organization (the take
 * list). Each row links into `/surveys` (Take tab, preselected). This is the
 * user-role entry point to surveys, since the left nav is intentionally frozen
 * for that role.
 */
import { useNavigate } from "react-router-dom"
import { ClipboardList, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ROUTES } from "@/constants/routes"
import { useSurveys } from "@/hooks/survey/useSurveys"

export default function SurveysSettingsCard() {
  const navigate = useNavigate()
  const { data: surveys = [], isLoading } = useSurveys("take")

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardList className="h-5 w-5" aria-hidden />
          Surveys
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Surveys shared with your organization.
        </p>
      </CardHeader>
      <CardContent className="text-left">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : surveys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No surveys have been shared with your organization yet.
          </p>
        ) : (
          <ul className="divide-y">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {s.title || "Untitled survey"}
                  </p>
                  <Badge variant="secondary" className="mt-0.5">
                    {s.questions.length}{" "}
                    {s.questions.length === 1 ? "question" : "questions"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(ROUTES.SURVEYS, { state: { surveyId: s.id } })
                  }
                >
                  Take
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
