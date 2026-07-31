import { Copy, Download, Loader2, MessagesSquare, Printer } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import { exportTurn, type TurnExportFormat } from "@/lib/exportTranscript/exportTurn"
import { printTurn } from "@/lib/exportTranscript/printTurn"
import { formatFullTimestamp } from "@/lib/dateFormatters"
import type { CoachAnswer } from "@/hooks/lumen/useCoachAnswer"

/**
 * The response window — coaching answers rendered **on the Lumen page**, each
 * one keepable on its own.
 *
 * Answers arrive as Markdown, so they render through `AssistantMarkdown` (the
 * same renderer the chat surface uses) rather than as pre-wrapped plain text:
 * a coaching answer is mostly headings and lists, and flattening it to a single
 * grey paragraph is what makes an inline answer feel like a downgrade from the
 * chat.
 *
 * Copy / Print / Export ▾ mirror the per-turn action row in Meridian chat, and
 * Print and Export share one document builder — so the printout, the `.doc` and
 * the PDF are the same artefact, not three near-misses.
 */

function slugFor(item: CoachAnswer): string {
  const stem = item.question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 8)
    .join("-")
  return `lumen-coaching-${stem || "answer"}`
}

/**
 * The exported document leads with the question, because a downloaded answer
 * read a week later is meaningless without it — the on-screen card has the
 * question directly above, but the file has no such context.
 */
function exportInput(item: CoachAnswer) {
  return {
    speaker: "Personal coaching",
    body: `**${item.question}**\n\n${item.answer}`,
    timestamp: formatFullTimestamp(item.askedAt),
    contributingAgents: item.agents,
    slug: slugFor(item),
  }
}

function AnswerActions({ item }: { item: CoachAnswer }) {
  const handleExport = async (format: TurnExportFormat) => {
    try {
      await exportTurn(exportInput(item), format)
      toast.success(
        format === "word"
          ? "Exported this answer as a Word document."
          : "Exported this answer as a PDF."
      )
    } catch {
      toast.error("Couldn't export this answer — please try again.")
    }
  }

  const handlePrint = () => {
    try {
      printTurn(exportInput(item))
    } catch {
      toast.error("Couldn't print this answer — please try again.")
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${item.question}\n\n${item.answer}`)
      toast.success("Answer copied.")
    } catch {
      toast.error("Couldn't copy the answer.")
    }
  }

  return (
    <div className="mt-3 flex items-center gap-4 border-t pt-2">
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label="Copy this answer"
        title="Copy this answer"
        className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-4 w-4" aria-hidden />
        <span>Copy</span>
      </button>
      <button
        type="button"
        onClick={handlePrint}
        aria-label="Print this answer"
        title="Print this answer"
        className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Printer className="h-4 w-4" aria-hidden />
        <span>Print</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Export this answer"
            title="Export this answer"
            data-testid="coaching-export-trigger"
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span>Export</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-36">
          <DropdownMenuItem
            onSelect={() => void handleExport("word")}
            data-testid="coaching-export-word"
          >
            Word (.doc)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleExport("pdf")}
            data-testid="coaching-export-pdf"
          >
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function CoachingAnswers({
  answers,
  pendingQuestion,
  isError,
}: {
  answers: CoachAnswer[]
  pendingQuestion: string | null
  isError: boolean
}) {
  if (answers.length === 0 && !pendingQuestion && !isError) return null

  return (
    <Card data-testid="coaching-answers">
      <CardContent className="space-y-4 pt-6">
        {answers.map((item) => (
          <article key={item.id} className="rounded-lg border bg-muted/30 p-4">
            <h3 className="flex items-start gap-2 text-sm font-medium">
              <MessagesSquare
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{item.question}</span>
            </h3>
            <div className="mt-2 pl-6 text-sm leading-relaxed">
              <AssistantMarkdown text={item.answer} className="text-left" />
            </div>
            <div className="pl-6">
              <AnswerActions item={item} />
            </div>
          </article>
        ))}

        {pendingQuestion && (
          <div className="rounded-lg border border-dashed p-4">
            <h3 className="flex items-start gap-2 text-sm font-medium text-muted-foreground">
              <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{pendingQuestion}</span>
            </h3>
            <p className="mt-2 flex items-center gap-2 pl-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Working through this with your profile… this usually takes a few seconds.
            </p>
          </div>
        )}

        {isError && !pendingQuestion && (
          <p className="text-sm text-destructive">
            That didn&apos;t go through — please try again in a moment.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default CoachingAnswers
