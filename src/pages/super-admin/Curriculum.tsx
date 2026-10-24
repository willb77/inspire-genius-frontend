import { useSearchParams } from "react-router-dom"
import { GraduationCap } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { CatalogYearsPanel } from "@/components/super-admin/curriculum/CatalogYearsPanel"
import { CurriculumGate } from "@/components/super-admin/curriculum/CurriculumGate"
import { SchoolsPanel } from "@/components/super-admin/curriculum/SchoolsPanel"
import { useCurriculumInstitutions } from "@/hooks/curriculum/useCurriculumAdmin"

/**
 * Administration → Curriculum (CUR-2): schools → catalog years.
 *
 * Super-admin only (decision E2) — the route sits under the role-gated
 * `/super-admin` prefix, and every curriculum API route checks the role
 * server-side. While the `curriculum` switch is off the page says so.
 */
function SchoolsAndYears() {
  const [params, setParams] = useSearchParams()
  const selected = params.get("school")
  const { data } = useCurriculumInstitutions(true)
  const school = data?.find((s) => s.id === selected)

  return (
    <div className="space-y-8">
      <SchoolsPanel selectedId={selected} onSelect={(id) => setParams({ school: id })} />
      {selected && <CatalogYearsPanel institutionId={selected} schoolName={school?.name} />}
    </div>
  )
}

export default function Curriculum() {
  return (
    <SuperAdminLayout>
      <div className="mb-6 flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-[#111827]" />
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Curriculum</h1>
          <p className="text-sm text-muted-foreground">
            Schools, their catalog years, programs, courses and prerequisites.
          </p>
        </div>
      </div>
      <CurriculumGate>
        <SchoolsAndYears />
      </CurriculumGate>
    </SuperAdminLayout>
  )
}
