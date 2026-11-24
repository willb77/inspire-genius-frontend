import { Suspense, lazy, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDeleteUserData, useExportUserData } from "@/hooks/privacy/usePrivacy"
import { useAuth } from "@/context/useAuth"
import { toast } from "sonner"
import { Download, Trash2, Shield, Flag } from "lucide-react"
import { Link } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { useTranslation } from "react-i18next"
import { withPrism } from "@/lib/withPrism"

// SHARE-1 (a): the same panel as /my/goals/sharing, lazily — it brings the
// consent reads with it, and Settings should not pay for them until shown.
const SharingCore = lazy(() =>
  import("@/pages/summit/SummitSharing").then((m) => ({ default: m.SharingCore })),
)

export default function PrivacySettings() {
  const { t } = useTranslation("accountUi")
  const { user, logout } = useAuth()
  const userId = user?.id ?? ""

  const deleteMutation = useDeleteUserData()
  const exportMutation = useExportUserData()
  const [confirmText, setConfirmText] = useState("")

  const handleExport = () => {
    if (!userId) return
    exportMutation.mutate(userId, {
      onSuccess: (archive) => {
        // The server already built the ZIP; save its bytes verbatim. Do not
        // re-serialise — re-encoding a binary body corrupts the archive.
        const url = URL.createObjectURL(archive.blob)
        const a = document.createElement("a")
        a.href = url
        a.download = archive.filename
        a.click()
        URL.revokeObjectURL(url)
        // An empty archive is a real answer ("we hold nothing"), but a
        // zero-byte body is not — that is a failed build reported as success.
        if (archive.blob.size === 0) {
          toast.error(t("privacySettings.theExportCameBackEmptyPlease", { defaultValue: "The export came back empty. Please try again." }))
          return
        }
        toast.success(
          archive.notified
            ? t("privacySettings.yourDataHasBeenDownloaded", { defaultValue: "Your data has been downloaded." })
            : t("privacySettings.yourDataHasBeenDownloadedNotNotified", { defaultValue: "Your data has been downloaded. (The privacy team could not be notified automatically.)" }),
        )
      },
      onError: (err) => {
        toast.error(
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? t("privacySettings.failedToExportData", { defaultValue: "Failed to export data." }),
        )
      },
    })
  }

  const handleDelete = () => {
    if (!userId) return
    deleteMutation.mutate(userId, {
      onSuccess: (resp) => {
        // A 200 means the request was handled, not that every store was
        // cleared. The server reports partial erasure via success/manifest;
        // claiming "deleted" over a partial result would tell the user their
        // data is gone when some of it is not.
        if (resp?.success === false) {
          const failed = Object.entries(resp.manifest?.stores ?? {})
            .filter(([, v]) => v?.error)
            .map(([k]) => k)
          toast.error(
            failed.length
              ? t("privacySettings.someDataCouldNotBeDeletedNamed", { defaultValue: "Some data could not be deleted: {{stores}}. Support has been notified.", stores: failed.join(", ") })
              : t("privacySettings.someDataCouldNotBeDeleted", { defaultValue: "Some data could not be deleted. Support has been notified." }),
          )
          return
        }
        toast.success(t("privacySettings.yourDataHasBeenDeletedYou", { defaultValue: "Your data has been deleted. You will be logged out." }))
        setTimeout(() => logout(), 2000)
      },
      onError: (err) => {
        toast.error(
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? t("privacySettings.failedToDeleteData", { defaultValue: "Failed to delete data." }),
        )
      },
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5" />
          {t("privacySettings.privacyData", { defaultValue: "Privacy & Data" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-left space-y-6">
        {/* Data retention policy */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium text-sm mb-2">{t("privacySettings.dataRetentionPolicy", { defaultValue: "Data Retention Policy" })}</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{t("privacySettings.conversationMessagesAreRetainedFor7", { defaultValue: "Conversation messages are retained for 7 days, then automatically deleted." })}</li>
            <li>{t("privacySettings.sessionSummariesAndCoachingProgressAre", { defaultValue: "Session summaries and coaching progress are retained for 7 days." })}</li>
            <li>{withPrism(t("privacySettings.prismAssessmentResultsAndInsightsAre", { defaultValue: "PRISM assessment results and insights are retained permanently until you request deletion." }))}</li>
            <li>{t("privacySettings.uploadedDocumentsAreRetainedUntilYou", { defaultValue: "Uploaded documents are retained until you delete them or request full account deletion." })}</li>
          </ul>
        </div>

        {/* Who can see my record — the sharing panel itself (SHARE-1), the same
            component the Goals sharing page renders. Shared per person, by your
            choice, for a fixed term; nobody sees it by rank. */}
        <div className="space-y-3" data-testid="settings-sharing">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium text-sm">{withPrism(t("privacySettings.whoCanSeeMyGoalsPrism", { defaultValue: "Who can see my goals, PRISM profile and more" }))}</h4>
              <p className="text-sm text-muted-foreground">
                {t("privacySettings.privateUntilYouShareWithA", { defaultValue: "Private until you share with a specific person. Turn each part on or off per person, or share all of it; see when it expires, and renew it." })}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to={ROUTES.MY_GOALS.SHARING}>
                <Flag className="mr-2 h-4 w-4" />
                {t("privacySettings.openTheFullPage", { defaultValue: "Open the full page" })}
              </Link>
            </Button>
          </div>
          <Suspense fallback={<p className="text-sm text-muted-foreground">{t("privacySettings.loadingYourSharingSettings", { defaultValue: "Loading your sharing settings…" })}</p>}>
            <SharingCore />
          </Suspense>
        </div>

        {/* Export data */}
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <h4 className="font-medium text-sm">{t("privacySettings.downloadMyData", { defaultValue: "Download My Data" })}</h4>
            <p className="text-sm text-muted-foreground">
              {withPrism(t("privacySettings.exportAllYourPersonalDataAs", { defaultValue: "Export all your personal data as a JSON file. Includes PRISM results, conversation history, insights, and milestones." }))}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? t("privacySettings.exporting", { defaultValue: "Exporting..." }) : t("privacySettings.download", { defaultValue: "Download" })}
          </Button>
        </div>

        {/* Delete data */}
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <h4 className="font-medium text-sm text-destructive">{t("privacySettings.deleteMyData", { defaultValue: "Delete My Data" })}</h4>
            <p className="text-sm text-muted-foreground">
              {withPrism(t("privacySettings.permanentlyDeleteAllYourPersonalData", { defaultValue: "Permanently delete all your personal data from our platform. This includes PRISM results, conversations, documents, and coaching insights. This action cannot be undone." }))}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("privacySettings.delete", { defaultValue: "Delete" })}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("privacySettings.areYouAbsolutelySure", { defaultValue: "Are you absolutely sure?" })}</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    {t("privacySettings.thisWillPermanentlyDeleteAllYour", { defaultValue: "This will permanently delete all your data from Inspire Genius, including:" })}
                  </span>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{withPrism(t("privacySettings.prismPersonalityAssessmentResults", { defaultValue: "PRISM personality assessment results" }))}</li>
                    <li>{t("privacySettings.allConversationHistoryAndSessionSummaries", { defaultValue: "All conversation history and session summaries" })}</li>
                    <li>{t("privacySettings.personalInsightsAndCoachingMilestones", { defaultValue: "Personal insights and coaching milestones" })}</li>
                    <li>{t("privacySettings.uploadedDocumentsAndTheirEmbeddings", { defaultValue: "Uploaded documents and their embeddings" })}</li>
                  </ul>
                  <span className="block font-medium">
                    {t("privacySettings.thisActionCannotBeUndoneYou", { defaultValue: "This action cannot be undone. You will be logged out after deletion." })}
                  </span>
                  <label className="block pt-2">
                    <span className="text-sm">{t("privacySettings.type", { defaultValue: "Type" })} <strong>DELETE</strong> {t("privacySettings.toConfirm", { defaultValue: "to confirm:" })}</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                    />
                  </label>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  {t("privacySettings.cancel", { defaultValue: "Cancel" })}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? t("privacySettings.deleting", { defaultValue: "Deleting..." }) : t("privacySettings.deleteAllMyData", { defaultValue: "Delete All My Data" })}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
