import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import UnifiedLayout from "@/layouts/UnifiedLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { useExamAccess } from "@/hooks/super-admin/usePrismExam"
import { PrismExamContent } from "@/pages/super-admin/PrismExam"
import type { UserRole } from "@/types/roles"

/**
 * PRISM exam for a granted user (2026-10-27): manager or above, with a grant a
 * super-admin gave on the exam page's Access tab. Lives outside `/super-admin`
 * because `ProtectedRoute` gates that prefix to super-admins; this path is
 * reachable by every signed-in role, so the page asks the server
 * (`GET /prism-exam/access`) and shows nothing it says no to. The server
 * enforces the same answer on every exam route; this is presentation only.
 *
 * A super-admin landing here is sent to their own page, which has the Access
 * tab and the active-set editor.
 */
export default function PrismExamPage() {
  const auth = useAuth()
  const role: UserRole = (auth.user?.role as UserRole) ?? "user"
  const access = useExamAccess()

  if (access.data?.super_admin) return <Navigate to={ROUTES.SUPER_ADMIN.PRISM_EXAM} replace />

  return (
    <UnifiedLayout role={role} expandOnPath={ROUTES.PRISM_EXAM}>
      {access.isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
        </p>
      ) : access.data?.allowed ? (
        <PrismExamContent superAdmin={false} access={access.data} />
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>PRISM exam</CardTitle>
              <CardDescription>
                {access.isError
                  ? `Could not check access: ${apiErrorMessage(access.error, "unknown error")}`
                  : "This account has not been given access to the PRISM exam. A super-admin can grant it."}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      )}
    </UnifiedLayout>
  )
}
