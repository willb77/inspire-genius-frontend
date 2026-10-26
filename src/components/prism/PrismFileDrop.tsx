import { useRef, useState } from "react"
import type { JSX } from "react"
import { FileText, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { prismFileKind, type PrismFileKind } from "@/lib/prism/prismUpload"

interface PrismFileDropProps {
  pdf: File | null
  csv: File | null
  onChange: (next: { pdf: File | null; csv: File | null }) => void
  /** Which kinds this drop zone takes. A dropped file of any other kind is refused. */
  accepts: PrismFileKind[]
  disabled?: boolean
}

/**
 * Drag-and-drop (or click-to-browse) for a PRISM report PDF and/or the PRISM
 * scores CSV. One zone takes both: each file is sorted into its slot by type,
 * and a file this zone does not accept is refused with a message instead of
 * being silently dropped — the browser's `accept` filter does not apply to a
 * drop, so the check lives here.
 *
 * Presentational: the parent owns the two `File | null` values.
 */
export function PrismFileDrop({
  pdf,
  csv,
  onChange,
  accepts,
  disabled,
}: PrismFileDropProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  const take = (files: FileList | File[] | null | undefined): void => {
    if (!files) return
    let nextPdf = pdf
    let nextCsv = csv
    const rejected: string[] = []
    for (const f of Array.from(files)) {
      const kind = prismFileKind(f)
      if (kind === "pdf" && accepts.includes("pdf")) nextPdf = f
      else if (kind === "csv" && accepts.includes("csv")) nextCsv = f
      else rejected.push(f.name)
    }
    setRefused(
      rejected.length
        ? `Not added: ${rejected.join(", ")}. Use a ${accepts
            .map((k) => (k === "pdf" ? "PRISM report PDF" : "PRISM scores CSV"))
            .join(" or a ")}.`
        : null,
    )
    onChange({ pdf: nextPdf, csv: nextCsv })
  }

  const acceptAttr = accepts
    .map((k) => (k === "pdf" ? "application/pdf,.pdf" : ".csv,text/csv"))
    .join(",")
  const prompt =
    accepts.length === 2
      ? "Drop your PRISM report PDF and/or scores CSV here, or click to choose"
      : accepts[0] === "pdf"
        ? "Drop your PRISM report PDF here, or click to choose"
        : "Drop your PRISM scores CSV here, or click to choose"

  const slot = (kind: PrismFileKind, file: File | null): JSX.Element | null =>
    file ? (
      <li
        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm"
        data-testid={`prism-drop-${kind}-file`}
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-xs font-medium uppercase text-muted-foreground">{kind}</span>
        <span className="flex-1 truncate">{file.name}</span>
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          disabled={disabled}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
          onClick={() => onChange(kind === "pdf" ? { pdf: null, csv } : { pdf, csv: null })}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    ) : null

  return (
    <div className="space-y-2">
      <div
        data-testid="prism-drop-zone"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={prompt}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) take(e.dataTransfer?.files)
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "border-primary bg-primary/5" : "border-input hover:border-primary/60",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-muted-foreground">{prompt}</span>
        <input
          ref={inputRef}
          type="file"
          multiple={accepts.length > 1}
          accept={acceptAttr}
          className="hidden"
          data-testid="prism-drop-input"
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {refused && (
        <p className="text-xs text-destructive" role="alert" data-testid="prism-drop-refused">
          {refused}
        </p>
      )}

      {(pdf || csv) && (
        <ul className="space-y-1.5">
          {slot("pdf", pdf)}
          {slot("csv", csv)}
        </ul>
      )}
    </div>
  )
}
