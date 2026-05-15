/**
 * /manager/job-blueprint — James (AdminAgent) job-blueprint match (Combined Plan §A.E3.4).
 *
 * Wave 4 Lane 4.D (P7.2) — body extracted to components/task-agents/JobBlueprintBody.tsx
 * and reused by /practitioner/job-blueprint.
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import JobBlueprintBody from "@/components/task-agents/JobBlueprintBody"

export default function JobBlueprintPage() {
  return (
    <ManagerLayout>
      <JobBlueprintBody />
    </ManagerLayout>
  )
}
