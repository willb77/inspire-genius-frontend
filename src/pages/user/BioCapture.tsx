/**
 * Bio Capture — the member-facing home for the Chronicle life-narrative agent.
 *
 * Single column, top to bottom:
 *   1. a thin "suggested next" bar + a compact 2×3 grid of the six chapters
 *      (`BioChaptersStrip`) — orientation, at a glance;
 *   2. the Chronicle interview tile (`ChronicleChatPanel`) — the interactive,
 *      optionally-spoken interview, with the captured results, live insight and
 *      the end-of-session recap all rendered inside its own scroll area.
 *
 * Talking to Chronicle distils new episodes; when a turn settles the tile tells
 * this page, which refetches the narrative so the chapters strip stays in step.
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
import BioChaptersStrip from "@/components/user/bio/BioChaptersStrip"
import BioFirstRunCard from "@/components/user/bio/BioFirstRunCard"
import ChronicleChatPanel from "@/components/user/bio/ChronicleChatPanel"
import MemoirExportMenu from "@/components/user/bio/MemoirExportMenu"
import { useTranslation } from "react-i18next"

export default function BioCapture() {
  const { t } = useTranslation("userPages")
  const { user } = useAuth()
  const memberId = user?.id ?? ""
  const { data: narrative, isLoading, isError, refetch } =
    useBioNarrative(memberId || null)

  // Bridge the chapters strip's tiles to the interview input. The interview
  // panel owns its own send loop and registers a seed function here on mount;
  // the strip calls it through `startSuggested`.
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

  // Nothing captured yet: lead with the introduction and one action, instead of
  // a suggested-next bar, a chapters grid and starter prompts all at once.
  const isFirstRun =
    !!narrative && !narrative.bioStarted && narrative.episodes.length === 0

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpenText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">{t("bioCapture.bioCapture", "Bio Capture")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("bioCapture.tellYourStoryWithChronicleOne", "Tell your story with Chronicle, one memory at a time.")}
              </p>
            </div>
          </div>
          {narrative && (
            <MemoirExportMenu memberId={memberId} narrative={narrative} />
          )}
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-[34rem] w-full" />
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              {t("bioCapture.weCouldntLoadYourStoryJust", "We couldn't load your story just now. Please refresh to try again.")}
            </CardContent>
          </Card>
        )}

        {narrative && (
          <div className="space-y-5">
            {isFirstRun && (
              <BioFirstRunCard
                suggestedModule={narrative.nextSuggestedModule}
                onStart={startSuggested}
              />
            )}
            <BioChaptersStrip
              narrative={narrative}
              onStartSuggested={startSuggested}
              hideSuggestedBar={isFirstRun}
            />

            {memberId ? (
              <ChronicleChatPanel
                memberId={memberId}
                suggestedModule={narrative.nextSuggestedModule}
                onTurnSettled={handleTurnSettled}
                registerSeed={registerSeed}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {t("bioCapture.signInToTalkToChronicle", "Sign in to talk to Chronicle.")}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </UserLayout>
  )
}
