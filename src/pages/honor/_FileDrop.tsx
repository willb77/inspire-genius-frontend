import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"

/**
 * Reusable drag-and-drop file field for the Honor onboarding form.
 *
 * Supports both drag-and-drop and click-to-browse, shows the selected file name,
 * and offers a clear affordance. Used for the résumé, Bio, and Additional-Info
 * uploads (and the PRISM / framework report inputs). Purely presentational — the
 * parent owns the `File | null` state and wires it through the onboarding hook.
 */
export function FileDrop({
  file,
  onFile,
  accept,
  placeholder,
  compact,
}: {
  file: File | null
  onFile: (f: File | null) => void
  accept: string
  placeholder: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const dropped = e.dataTransfer.files?.[0]
        if (dropped) onFile(dropped)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed bg-[#f6f7f9] px-3 outline-none transition-colors ${
        compact ? "py-2" : "py-2.5"
      } text-sm ${
        dragging ? "border-[#E8792B] bg-[#fdf2e9]" : "border-[#c6cdd9] hover:border-[#E8792B]"
      } ${file ? "text-[#18202f]" : "text-[#5b6678]"}`}
    >
      <Upload className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{file?.name ?? placeholder}</span>
      {file && (
        <button
          type="button"
          aria-label="Remove file"
          className="shrink-0 rounded p-0.5 text-[#9299a6] hover:text-[#c0472b]"
          onClick={(e) => {
            e.stopPropagation()
            onFile(null)
            if (inputRef.current) inputRef.current.value = ""
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
