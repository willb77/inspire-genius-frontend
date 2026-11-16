import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { CounselorExerciseView } from "./CounselorExerciseView"

/**
 * CX-6 — a practitioner's view of one student's career exploration exercise.
 * Visible only when the student shares their development with this
 * practitioner and the practitioner is their counselor (the server decides).
 */
export default function PractitionerStudentCareerExercisePage() {
  const { t } = useTranslation("practitionerPages")
  const { studentId } = useParams<{ studentId: string }>()
  return (
    <PractitionerLayout>
      <div className="space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{t("careerExercise.title", { defaultValue: "Career exploration exercise" })}</h1>
          <p className="text-sm text-muted-foreground">
            {t("careerExercise.subtitle", { defaultValue: "The student's own answers, step by step. Your notes sit beside them and never change what the student wrote." })}
          </p>
        </header>
        <CounselorExerciseView studentId={studentId} />
      </div>
    </PractitionerLayout>
  )
}
