import { useSearchParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegistrationsTab } from "./intake/RegistrationsTab"
import { WebinarsTab } from "./intake/WebinarsTab"

/**
 * Super-admin → Intake (IN-3).
 *
 * People who signed up through the public intake form (inspiresgenius.com/join),
 * and the webinar sessions offered to them. Two tabs only: the Mailing list and
 * Settings tabs are phase 2 and Reports is IN-7, so they are not rendered as
 * empty placeholders.
 *
 * The left menu's HR / Recruiters / Companies / Coaches entries open the
 * Registrations tab with filters in the URL (see `@/constants/intake`).
 *
 * Super-admin only: the route sits under `/super-admin/*`, which
 * `ProtectedRoute` gates by role, and intake-service checks the role again on
 * every route. A failed load is shown as an error, never as an empty list.
 */
type Tab = "registrations" | "webinars"

export default function Intake() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get("tab") === "webinars" ? "webinars" : "registrations"
  const setTab = (next: string) => {
    const p = new URLSearchParams(searchParams)
    if (next === "webinars") p.set("tab", "webinars")
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
          </TabsList>
          <TabsContent value="registrations" className="mt-4">
            <RegistrationsTab />
          </TabsContent>
          <TabsContent value="webinars" className="mt-4">
            <WebinarsTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
