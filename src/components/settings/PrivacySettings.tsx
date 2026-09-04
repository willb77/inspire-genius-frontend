import { useState } from "react"
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

export default function PrivacySettings() {
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
          toast.error("The export came back empty. Please try again.")
          return
        }
        toast.success(
          archive.notified
            ? "Your data has been downloaded."
            : "Your data has been downloaded. (The privacy team could not be notified automatically.)",
        )
      },
      onError: (err) => {
        toast.error(
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Failed to export data.",
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
            `Some data could not be deleted${failed.length ? `: ${failed.join(", ")}` : ""}. Support has been notified.`,
          )
          return
        }
        toast.success("Your data has been deleted. You will be logged out.")
        setTimeout(() => logout(), 2000)
      },
      onError: (err) => {
        toast.error(
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Failed to delete data.",
        )
      },
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5" />
          Privacy & Data
        </CardTitle>
      </CardHeader>
      <CardContent className="text-left space-y-6">
        {/* Data retention policy */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium text-sm mb-2">Data Retention Policy</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Conversation messages are retained for 7 days, then automatically deleted.</li>
            <li>Session summaries and coaching progress are retained for 7 days.</li>
            <li>PRISM assessment results and insights are retained permanently until you request deletion.</li>
            <li>Uploaded documents are retained until you delete them or request full account deletion.</li>
          </ul>
        </div>

        {/* Who can see my goals — the sharing panel (Goals offering, Phase 3).
            Goals are shared per person, by your choice, for a fixed term;
            nobody sees them by rank. */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-sm">Who can see my goals</h4>
            <p className="text-sm text-muted-foreground">
              Your goals are private until you share them with a specific person.
              Turn sharing on or off per person, see when it expires, and renew it.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={ROUTES.MY_GOALS.SHARING}>
              <Flag className="mr-2 h-4 w-4" />
              Manage sharing
            </Link>
          </Button>
        </div>

        {/* Export data */}
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <h4 className="font-medium text-sm">Download My Data</h4>
            <p className="text-sm text-muted-foreground">
              Export all your personal data as a JSON file. Includes PRISM results,
              conversation history, insights, and milestones.
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
            {exportMutation.isPending ? "Exporting..." : "Download"}
          </Button>
        </div>

        {/* Delete data */}
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <h4 className="font-medium text-sm text-destructive">Delete My Data</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete all your personal data from our platform. This includes
              PRISM results, conversations, documents, and coaching insights. This action
              cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This will permanently delete all your data from Inspire Genius,
                    including:
                  </span>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>PRISM personality assessment results</li>
                    <li>All conversation history and session summaries</li>
                    <li>Personal insights and coaching milestones</li>
                    <li>Uploaded documents and their embeddings</li>
                  </ul>
                  <span className="block font-medium">
                    This action cannot be undone. You will be logged out after deletion.
                  </span>
                  <label className="block pt-2">
                    <span className="text-sm">Type <strong>DELETE</strong> to confirm:</span>
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
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete All My Data"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
