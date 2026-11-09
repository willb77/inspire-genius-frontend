import { useSearchParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegistrationsTab } from "./intake/RegistrationsTab"
import { ReportsTab } from "./intake/ReportsTab"
import { WebinarsTab } from "./intake/WebinarsTab"

/**
 * Super-admin → Intake (IN-3).
 *
 * People who signed up through the public intake form (inspiresgenius.com/join),
 * and the webinar sessions offered to them. Three tabs: Registrations, Webinars
 * and Reports (IN-7, counts only). The Mailing list and Settings tabs are
 * phase 2, so they are not rendered as empty placeholders.
 *
 * The left menu's HR / Recruiters / Companies / Coaches entries open the
 * Reports tab with filters in the URL (see `@/constants/intake`). The
 * Registrations tab reads the same `role` / `segment_context` keys, so
 * switching to it keeps the preset's filter.
 *
 * Super-admin only: the route sits under `/super-admin/*`, which
 * `ProtectedRoute` gates by role, and intake-service checks the role again on
 * every route. A failed load is shown as an error, never as an empty list.
 */
type Tab = "registrations" | "webinars" | "reports"
const URL_TABS: readonly Tab[] = ["webinars", "reports"]

export default function Intake() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fromUrl = searchParams.get("tab")
  const tab: Tab = URL_TABS.find((t) => t === fromUrl) ?? "registrations"
  const setTab = (next: string) => {
    const p = new URLSearchParams(searchParams)
    const known = URL_TABS.find((t) => t === next)
    if (known) p.set("tab", known)
    else p.delete("tab")
    setSearchParams(p)
  }

  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Intake</h1>
          <p className="text-sm text-muted-foreground">
            People who signed up through the public form, and the webinar sessions offered to them.
          </p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="webinars">Webinars</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="registrations" className="mt-4">
            <RegistrationsTab />
          </TabsContent>
          <TabsContent value="webinars" className="mt-4">
            <WebinarsTab />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
