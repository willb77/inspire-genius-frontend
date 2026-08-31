/**
 * "Export memoir" — Copy / Print / Word / PDF for the captured life narrative.
 *
 * Reuses the platform's single-turn export builder (`exportTurn` / `printTurn`),
 * the same one Meridian chat and the Lumen coaching page use, so the printout,
 * the `.doc` and the PDF are the same document rather than three near-misses.
 *
 * The memoir markdown is produced by `useGenerateMemoir`, which prefers the
 * backend `POST /v1/agents/bio/{id}/memoir` and falls back to a client-side
 * assembly when that endpoint is absent (404) — so a missing backend never
 * breaks the button. We remember the last generated memoir per style so the four
 * actions don't each re-hit the network.
 */
import { useCallback, useRef, useState } from "react"
import { Copy, Download, Loader2, Printer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  exportTurn,
  type TurnExportFormat,
} from "@/lib/exportTranscript/exportTurn"
import { printTurn } from "@/lib/exportTranscript/printTurn"
import { useGenerateMemoir } from "@/hooks/useGenerateMemoir"
import type {
  MemberNarrative,
  MemoirResponse,
  MemoirStyle,
} from "@/types/bio"

export type MemoirExportMenuProps = {
  memberId: string
  narrative: MemberNarrative
  style?: MemoirStyle
  disabled?: boolean
}

export function MemoirExportMenu({
  memberId,
  narrative,
  style = "structured",
  disabled,
}: MemoirExportMenuProps) {
  const generate = useGenerateMemoir()
  const [busy, setBusy] = useState(false)
  // Cache the last memoir keyed by style, so Copy→Print→Word doesn't
  // regenerate three times. Invalidated implicitly when the caller passes a
  // fresh narrative (a new object identity resets the ref via the key check).
  const cacheRef = useRef<{ key: string; memoir: MemoirResponse } | null>(null)

  const resolveMemoir = useCallback(async (): Promise<MemoirResponse> => {
    const key = `${style}:${narrative.episodes.length}`
    if (cacheRef.current?.key === key) return cacheRef.current.memoir
    const memoir = await generate.mutateAsync({
      memberId,
      fallbackNarrative: narrative,
      style,
    })
    cacheRef.current = { key, memoir }
    return memoir
  }, [generate, memberId, narrative, style])

  const turnInput = (memoir: MemoirResponse) => ({
    speaker: memoir.title || "My Memoir",
    body: memoir.markdown,
    slug: `bio-memoir-${memberId}`,
  })

  const hasContent = narrative.episodes.length > 0

  const run = useCallback(
    async (action: "copy" | "print" | TurnExportFormat) => {
      if (!hasContent) {
        toast.info("Nothing to export yet — capture a memory with Chronicle first.")
        return
      }
      setBusy(true)
      try {
        const memoir = await resolveMemoir()
        if (action === "copy") {
          await navigator.clipboard.writeText(memoir.markdown)
          toast.success("Memoir copied.")
          return
        }
        if (action === "print") {
          printTurn(turnInput(memoir))
          return
        }
        await exportTurn(turnInput(memoir), action)
        toast.success(
          action === "word"
            ? "Exported your memoir as a Word document."
            : "Exported your memoir as a PDF.",
        )
      } catch {
        toast.error("Couldn't export your memoir — please try again.")
      } finally {
        setBusy(false)
      }
    },
    // resolveMemoir already closes over the relevant deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasContent, resolveMemoir],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          data-testid="memoir-export-trigger"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden />
          )}
          Export memoir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Export memoir</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("copy")}>
          <Copy className="mr-2 h-4 w-4" aria-hidden />
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("print")}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void run("word")}
          data-testid="memoir-export-word"
        >
          Word (.doc)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void run("pdf")}
          data-testid="memoir-export-pdf"
        >
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default MemoirExportMenu
