/**
 * /practitioner/job-blueprint — James (AdminAgent) job-blueprint match.
 *
 * Wave 4 Lane 4.D (P7.2) — mirrors /manager/job-blueprint with the
 * practitioner layout. Form body lives in components/task-agents/JobBlueprintBody.tsx.
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import JobBlueprintBody from "@/components/task-agents/JobBlueprintBody"

export default function PractitionerJobBlueprintPage() {
  return (
    <PractitionerLayout>
      <JobBlueprintBody />
    </PractitionerLayout>
  )
}
