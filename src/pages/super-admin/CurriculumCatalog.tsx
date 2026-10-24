import { Link, useParams } from "react-router-dom"
import { ArrowLeft, RefreshCw } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CatalogImport } from "@/components/super-admin/curriculum/CatalogImport"
import { StatusBadge } from "@/components/super-admin/curriculum/CatalogYearsPanel"
import { CourseEditor } from "@/components/super-admin/curriculum/CourseEditor"
import { CurriculumGate } from "@/components/super-admin/curriculum/CurriculumGate"
import { CurriculumErrorPanel } from "@/components/super-admin/curriculum/CurriculumReportView"
import { PrerequisiteGraph } from "@/components/super-admin/curriculum/PrerequisiteGraph"
import { ProgramEditor } from "@/components/super-admin/curriculum/ProgramEditor"
import { PublishPanel } from "@/components/super-admin/curriculum/PublishPanel"
import { ROUTES } from "@/constants/routes"
import { useCurriculumCatalog } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError } from "@/services/curriculum/curriculumErrors"

function CatalogBody({ catalogId }: { catalogId: string }) {
  const { data, isLoading, error, refetch } = useCurriculumCatalog(catalogId, true)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (error || !data) {
    return (
      <div className="space-y-2">
        <CurriculumErrorPanel error={curriculumError(error, "Could not load this catalog.")} />
        <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  const { catalog, courses, programs } = data
  const editable = catalog.status === "draft"
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`${ROUTES.SUPER_ADMIN.CURRICULUM}?school=${encodeURIComponent(catalog.institutionId)}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Catalog years
        </Link>
        <h2 className="text-lg font-semibold">
          Catalog {catalog.catalogYear} · v{catalog.version}
        </h2>
        <StatusBadge status={catalog.status} />
      </div>
      {!editable && (
        <p role="status" className="rounded-md border bg-slate-50 p-2 text-sm">
          Read-only: published catalogs are never edited. Use Publish → “Start a new version” to make a change.
        </p>
      )}
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="import">CSV import</TabsTrigger>
          <TabsTrigger value="graph">Prerequisite graph</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
          <CourseEditor catalogId={catalog.id} courses={courses} editable={editable} />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramEditor catalogId={catalog.id} programs={programs} courses={courses} editable={editable} />
        </TabsContent>
        <TabsContent value="import">
          <CatalogImport catalogId={catalog.id} editable={editable} />
        </TabsContent>
        <TabsContent value="graph">
          <PrerequisiteGraph programs={programs} courses={courses} />
        </TabsContent>
        <TabsContent value="publish">
          <PublishPanel detail={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Administration → Curriculum → one catalog (CUR-2). */
export default function CurriculumCatalog() {
  const { catalogId } = useParams<{ catalogId: string }>()
  return (
    <SuperAdminLayout>
      <h1 className="mb-4 text-xl font-bold text-[#111827]">Curriculum</h1>
      <CurriculumGate>{catalogId ? <CatalogBody catalogId={catalogId} /> : null}</CurriculumGate>
    </SuperAdminLayout>
  )
}
