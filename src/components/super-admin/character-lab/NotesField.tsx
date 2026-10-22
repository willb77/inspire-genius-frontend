import { useRef, useState } from "react"
import { toast } from "sonner"
import { FileUp, Loader2, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ACCEPTED_ROLE_FILE_TYPES,
  MAX_EXTRACTED_CHARS,
  extractRoleText,
} from "@/lib/extractRoleText"
import { CHARACTER_LIMITS, notesLength, notesOverLimit } from "./limits"

const fmt = (n: number) => n.toLocaleString("en-US")

function Counter({ notes, position }: { notes: string; position: "top" | "bottom" }) {
  const used = notesLength(notes)
  const over = used - CHARACTER_LIMITS.notes
  return (
    <p
      data-testid={`notes-counter-${position}`}
      aria-live={position === "bottom" ? "polite" : undefined}
      className={cn(
        "text-xs tabular-nums",
        over > 0 ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {fmt(used)} / {fmt(CHARACTER_LIMITS.notes)} characters
      {over > 0 ? ` — ${fmt(over)} over the limit` : ""}
    </p>
  )
}

type NotesFieldProps = {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

/**
 * Notes for a character: a counter above and below the box, a document upload
 * that adds the document's text, and an explicit trim when it is over the limit.
 *
 * Deliberately NOT `maxLength` on the textarea: that silently cuts a paste or
 * an upload at 4,000 characters, so the reading would rest on part of what the
 * operator gave it without anyone being told. Over the limit, the counters turn
 * red, Build is blocked by the page, and the operator chooses to trim.
 */
export default function NotesField({ value, onChange, disabled }: NotesFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const over = notesOverLimit(value)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Cleared so choosing the same file again still fires a change.
    e.target.value = ""
    if (!file) return
    setReading(true)
    try {
      const { text } = await extractRoleText(file)
      onChange(value.trim() ? `${value.trimEnd()}\n\n${text}` : text)
      if (text.length >= MAX_EXTRACTED_CHARS) {
        toast.warning(
          `Only the first ${fmt(MAX_EXTRACTED_CHARS)} characters of ${file.name} were read.`,
        )
      } else {
        toast.success(`Added ${fmt(text.length)} characters from ${file.name}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.")
    } finally {
      setReading(false)
    }
  }

  function trimToLimit() {
    onChange(value.trim().slice(0, CHARACTER_LIMITS.notes))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor="cl-notes">Notes (optional)</Label>
        <div className="flex items-center gap-3">
          <Counter notes={value} position="top" />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_ROLE_FILE_TYPES}
            className="hidden"
            data-testid="notes-file-input"
            onChange={onFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || reading}
            onClick={() => fileRef.current?.click()}
          >
            {reading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
            )}
            {reading ? "Reading…" : "Upload a document"}
          </Button>
        </div>
      </div>
      <Textarea
        id="cl-notes"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={over || undefined}
        className={cn(over && "border-destructive focus-visible:ring-destructive")}
        placeholder="Scenes, behaviour or context to ground the reading. Treated as evidence about the character."
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Counter notes={value} position="bottom" />
        {over && (
          <Button type="button" variant="outline" size="sm" onClick={trimToLimit}>
            <Scissors className="mr-1.5 h-3.5 w-3.5" />
            Keep the first {fmt(CHARACTER_LIMITS.notes)} characters
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Upload a .txt, .md, .pdf or Word (.docx) file to add its text to the notes. Up to{" "}
        {fmt(CHARACTER_LIMITS.notes)} characters can be sent; shorten anything longer before
        building.
      </p>
    </div>
  )
}
