import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useCoachRoster } from "@/hooks/grant/useCoachRoster"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import GrantIntakeFlow from "../intake/GrantIntakeFlow"

/**
 * Coach surface — opens a roster student into the EXISTING aid questionnaire,
 * bound to that student's id. The name comes from the roster cache when
 * available (no extra fetch), falling back to the student profile.
 */
export default function StudentIntakePage() {
  const { studentId = "" } = useParams<{ studentId: string }>()
  const { data: roster } = useCoachRoster()
  const rosterName = roster?.find((s) => s.id === studentId)?.fullName
  const { data: profile } = useStudentProfile(studentId, {
    enabled: studentId !== "" && !rosterName,
  })
  const name = rosterName ?? profile?.fullName ?? "Student"

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          to={ROUTES.GRANT.COACH_STUDENTS}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3B5BFF] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to roster
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
          Aid profile for
        </p>
        <p className="text-lg font-semibold text-[#1f2937]">{name}</p>
      </div>

      <GrantIntakeFlow studentId={studentId} />
    </div>
  )
}
