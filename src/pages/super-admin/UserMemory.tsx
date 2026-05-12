import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Trash2, Download, AlertTriangle, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import {
  useDeleteUserInsight,
  useDeleteUserMemory,
  useExportUserMemory,
  useUserMemory,
} from "@/hooks/privacy/useMemoryPrivacy"
import type { MemoryConversation, MemoryInsight } from "@/types/memory"

/**
 * `/super-admin/users/:userId/memory` — operator view of a target user's stored memory.
 *
 * Mirrors `SettingsPrivacy.tsx` but uses the super-admin endpoints so the
 * audit emit attributes the action to the operator's `sub` and the target
 * user's id. Used for support and GDPR / RTBF response flows.
 */
export default function UserMemoryPage() {
  const { userId = "" } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const memoryQuery = useUserMemory(userId)
  const exportMutation = useExportUserMemory()
  const deleteAllMutation = useDeleteUserMemory()
  const deleteInsightMutation = useDeleteUserInsight()

  const insights: MemoryInsight[] = useMemo(
    () => memoryQuery.data?.tiers.long_term?.insights ?? [],
    [memoryQuery.data],
  )
  const conversations: MemoryConversation[] = useMemo(
    () => memoryQuery.data?.tiers.short_term?.conversation_history ?? [],
    [memoryQuery.data],
  )
  const sessionSummaryCount =
    memoryQuery.data?.tiers.short_term?.session_summaries.length ?? 0
  const semanticEntryCount = memoryQuery.data?.tiers.semantic?.count ?? 0

  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
        </div>

        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldAlert className="size-5 text-amber-600" />
            Memory for user
            <span className="font-mono text-base text-muted-foreground">{userId}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Operator view of another user&apos;s stored memory. Every action here is audited and
            attributed to your account. Delete only on user request or to satisfy a verified RTBF
            response.
          </p>
        </header>

        {/* Long-term insights */}
        <Card>
          <CardHeader>
            <CardTitle>Long-term insights</CardTitle>
            <CardDescription>
              Stored facts about this user. Remove individual entries from the long-term tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {memoryQuery.isError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>Could not load this user&apos;s memory snapshot.</span>
              </div>
            )}
            {memoryQuery.data && insights.length === 0 && (
              <p className="text-sm text-muted-foreground">No long-term insights stored.</p>
            )}
            {insights.map((insight) => (
              <div
                key={insight.id ?? insight.key}
                className="flex items-start justify-between gap-4 rounded-md border bg-muted/40 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{insight.key}</span>
                    {insight.category && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {insight.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{insight.value}</p>
                </div>
                <ConfirmDialog
                  title={`Delete insight "${insight.key}" for ${userId}?`}
                  description="This will be recorded in the audit log under your operator id."
                  confirmText="Delete"
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${insight.key}`}
                      disabled={deleteInsightMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  onConfirm={async () => {
                    try {
                      await deleteInsightMutation.mutateAsync({
                        userId,
                        key: insight.key,
                      })
                      toast.success(`Deleted "${insight.key}"`)
                    } catch {
                      toast.error("Could not delete that insight.")
                    }
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Counts + export */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation history</CardTitle>
            <CardDescription>Per-tier counts for what is stored about this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{sessionSummaryCount} session summaries</Badge>
              <Badge variant="outline">
                {conversations.reduce((total, c) => total + c.messages.length, 0)} stored messages across {conversations.length} sessions
              </Badge>
              <Badge variant="outline">{semanticEntryCount} semantic entries</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportMutation.mutate(userId, {
                  onSuccess: () => toast.success("Download started"),
                  onError: () => toast.error("Could not export this user&apos;s memory."),
                })
              }}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Download user data
            </Button>
          </CardContent>
        </Card>

        {/* Forget everything */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Forget everything for this user</CardTitle>
            <CardDescription>
              Wipes every memory tier. Use only to satisfy a verified RTBF / GDPR request.
              Audit-logged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDialog
              title={`Delete ALL memory for ${userId}?`}
              description="This is permanent and audited. The user will start the next session with no history."
              confirmText="Delete everything"
              trigger={
                <Button variant="destructive" disabled={deleteAllMutation.isPending}>
                  {deleteAllMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-4" />
                  )}
                  Delete all memory
                </Button>
              }
              onConfirm={async () => {
                try {
                  await deleteAllMutation.mutateAsync(userId)
                  toast.success("User memory deleted")
                } catch {
                  toast.error("Could not delete this user&apos;s memory.")
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  )
}
