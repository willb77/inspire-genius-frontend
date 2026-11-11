import { useParams } from "react-router-dom"
import ManagerLayout from "@/layouts/ManagerLayout"
import { CounselorExerciseView } from "@/pages/practitioner/career-exercise/CounselorExerciseView"

/**
 * CX-6 — a manager's (counselor's) view of one student's career exploration
 * exercise. The same view as the practitioner's; the server decides who may
 * see the student.
 */
export default function ManagerStudentCareerExercisePage() {
  const { studentId } = useParams<{ studentId: string }>()
  return (
    <ManagerLayout>
      <div className="space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Career exploration exercise</h1>
          <p className="text-sm text-muted-foreground">
            The student's own answers, step by step. Your notes sit beside them and never change what the student wrote.
          </p>
        </header>
        <CounselorExerciseView studentId={studentId} />
      </div>
    </ManagerLayout>
  )
}
