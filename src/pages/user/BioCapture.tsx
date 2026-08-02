/**
 * Bio Capture — the member-facing home for the Chronicle life-narrative agent.
 *
 * Two columns: the narrative viewer (chapters, coverage, episode timeline) on
 * the left, and the Chronicle chat on the right. Talking to Chronicle distils
 * new episodes; when a turn settles the chat tells this page, which refetches the
 * narrative so the left column stays in step with the conversation beside it.
 *
 * "Export memoir" prefers the backend memoir endpoint and falls back to a
 * client-side assembly when it is absent — see `useGenerateMemoir`.
 */
import { useCallback, useRef } from "react"
import { AlertCircle, BookOpenText } from "lucide-react"
import UserLayout from "@/layouts/UserLayout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/useAuth"
import { useBioNarrative } from "@/hooks/useBioNarrative"
import NarrativeViewer from "@/components/user/bio/NarrativeViewer"
import ChronicleChatPanel from "@/components/user/bio/ChronicleChatPanel"
import MemoirExportMenu from "@/components/user/bio/MemoirExportMenu"

export default function BioCapture() {
  const { user } = useAuth()
  const memberId = user?.id ?? ""
  const { data: narrative, isLoading, isError, refetch } =
    useBioNarrative(memberId || null)

  // Bridge the viewer's "Continue with Chronicle" CTA to the chat input. The
  // chat panel owns its own send loop and registers a seed function here on
  // mount; the viewer calls it through `startSuggested`.
  const seedChatRef = useRef<((moduleType: string) => void) | null>(null)
  const registerSeed = useCallback(
    (seed: ((moduleType: string) => void) | null) => {
      seedChatRef.current = seed
    },
    [],
  )
  const startSuggested = useCallback((moduleType: string) => {
    seedChatRef.current?.(moduleType)
  }, [])
  const handleTurnSettled = useCallback(() => {
    void refetch()
  }, [refetch])

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpenText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Bio Capture</h1>
              <p className="text-sm text-muted-foreground">
                Tell your story with Chronicle, one memory at a time.
              </p>
            </div>
          </div>
          {narrative && (
            <MemoirExportMenu memberId={memberId} narrative={narrative} />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            )}

            {isError && (
              <Card>
                <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
                  We couldn&apos;t load your story just now. Please refresh to try
                  again.
                </CardContent>
              </Card>
            )}

            {narrative && (
              <NarrativeViewer
                narrative={narrative}
                onStartSuggested={startSuggested}
              />
            )}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            {memberId ? (
              <ChronicleChatPanel
                memberId={memberId}
                suggestedModule={narrative?.nextSuggestedModule}
                onTurnSettled={handleTurnSettled}
                registerSeed={registerSeed}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Sign in to talk to Chronicle.
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </UserLayout>
  )
}
