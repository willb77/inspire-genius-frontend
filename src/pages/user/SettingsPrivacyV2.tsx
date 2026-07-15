import { useMemo } from "react"
import { Trash2, Download, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import UserLayout from "@/layouts/UserLayout"
import { V2Panel } from "@/components/v2"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import {
  useDeleteMyInsight,
  useDeleteMyMemory,
  useExportMyMemory,
  useMyMemory,
} from "@/hooks/privacy/useMemoryPrivacy"
import type { MemoryInsight, MemoryConversation } from "@/types/memory"

/**
 * SettingsPrivacyV2 — the new-design ("HomeV2" system) variant of
 * `/settings/privacy` (user-facing memory privacy & RTBF). Flag-gated
 * (new_user_surfaces) additive swap; the classic page is unchanged and remains
 * at /settings/privacy/classic. Same data/hooks/logic — only the presentation
 * is re-skinned to the cream panel + tokens + serif headings. RTL-safe.
 *
 * Three blocks:
 *  1. Insights — list of long-term insights with per-row delete.
 *  2. Conversations — count of session summaries + cross-session messages
 *     stored, plus a "Download my data" JSON export button.
 *  3. Forget everything — destructive "Delete all my coaching memory"
 *     button gated by a confirmation modal.
 */
export default function SettingsPrivacyV2() {
  const memoryQuery = useMyMemory()
  const exportMutation = useExportMyMemory()
  const deleteAllMutation = useDeleteMyMemory()
  const deleteInsightMutation = useDeleteMyInsight()

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
    <UserLayout>
      <V2Panel className="max-w-4xl">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight font-serif text-ink">Memory & Privacy</h1>
          <p className="text-sm text-body-slate">
            View, export, or delete the data Inspire Genius has stored about you. Deletion is permanent
            and applies across all four memory tiers (working, short-term, long-term, semantic).
          </p>
        </header>

        {/* Long-term insights */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-ink">What we&apos;ve learned about you</CardTitle>
            <CardDescription className="text-body-slate">
              Long-term insights extracted from your coaching sessions. Remove any item to forget that
              specific fact while keeping the rest of your memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {memoryQuery.isError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>Could not load your memory snapshot. Try refreshing the page.</span>
              </div>
            )}
            {memoryQuery.data && insights.length === 0 && (
              <p className="text-sm text-body-slate">No long-term insights stored yet.</p>
            )}
            {insights.map((insight) => (
              <div
                key={insight.id ?? insight.key}
                className="flex items-start justify-between gap-4 rounded-md border border-hairline bg-muted/40 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{insight.key}</span>
                    {insight.category && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {insight.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-body-slate break-words">{insight.value}</p>
                </div>
                <ConfirmDialog
                  title={`Forget "${insight.key}"?`}
                  description="This insight will be deleted from your long-term memory. Your other memory is unaffected."
                  confirmText="Forget"
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Forget ${insight.key}`}
                      disabled={deleteInsightMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  onConfirm={async () => {
                    try {
                      await deleteInsightMutation.mutateAsync(insight.key)
                      toast.success(`Forgot "${insight.key}"`)
                    } catch {
                      toast.error("Could not delete that insight. Please try again.")
                    }
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversation history + export */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-ink">Conversation history</CardTitle>
            <CardDescription className="text-body-slate">
              Summaries and recent messages from your sessions. Download a JSON copy of everything we
              have on file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-body-slate">
              <Badge variant="outline">{sessionSummaryCount} session summaries</Badge>
              <Badge variant="outline">
                {conversations.reduce((total, c) => total + c.messages.length, 0)} stored messages across {conversations.length} sessions
              </Badge>
              <Badge variant="outline">{semanticEntryCount} semantic entries</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportMutation.mutate(undefined, {
                  onSuccess: () => toast.success("Download started"),
                  onError: () => toast.error("Could not export your memory."),
                })
              }}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="me-2 size-4 animate-spin" />
              ) : (
                <Download className="me-2 size-4" />
              )}
              Download my data
            </Button>
          </CardContent>
        </Card>

        {/* Forget everything (RTBF) */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="font-serif text-destructive">Forget everything</CardTitle>
            <CardDescription className="text-body-slate">
              Permanently delete every memory tier we maintain about you: working state, recent
              messages, summaries, long-term insights, milestones, PRISM results, and semantic
              embeddings. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDialog
              title="Delete all my coaching memory?"
              description="This is permanent. You will start the next session with a blank slate. We recommend downloading a copy first."
              confirmText="Delete everything"
              trigger={
                <Button variant="destructive" disabled={deleteAllMutation.isPending}>
                  {deleteAllMutation.isPending ? (
                    <Loader2 className="me-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="me-2 size-4" />
                  )}
                  Delete all my memory
                </Button>
              }
              onConfirm={async () => {
                try {
                  await deleteAllMutation.mutateAsync()
                  toast.success("Your memory has been deleted")
                } catch {
                  toast.error("Could not delete your memory. Please try again.")
                }
              }}
            />
          </CardContent>
        </Card>
      </V2Panel>
    </UserLayout>
  )
}
