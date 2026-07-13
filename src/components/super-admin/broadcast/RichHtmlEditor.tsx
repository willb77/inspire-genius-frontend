/**
 * Lightweight contentEditable HTML editor for composing branded alert bodies.
 *
 * Deliberately dependency-free (no TipTap/Quill) — a `contentEditable` surface
 * with a formatting toolbar (document.execCommand) plus a raw-HTML toggle for
 * power users. Output is sanitized with DOMPurify by the parent before it is
 * previewed or sent. Emits sanitized HTML via `onChange`.
 */
import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Code2,
  Palette,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { sanitizeBodyHtml } from "@/lib/sanitizeHtml"

type Props = {
  value: string
  onChange: (html: string) => void
  className?: string
}

type ToolbarButton = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  command: string
  arg?: string
}

const TOOLBAR: ToolbarButton[] = [
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: Underline, label: "Underline", command: "underline" },
  { icon: Heading1, label: "Heading 1", command: "formatBlock", arg: "H1" },
  { icon: Heading2, label: "Heading 2", command: "formatBlock", arg: "H2" },
  { icon: List, label: "Bulleted list", command: "insertUnorderedList" },
  { icon: ListOrdered, label: "Numbered list", command: "insertOrderedList" },
]

const SWATCHES = ["#111827", "#3B5BFF", "#10B981", "#D97706", "#EF4444", "#8B5CF6"]

export default function RichHtmlEditor({ value, onChange, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [rawMode, setRawMode] = useState(false)
  const [showColors, setShowColors] = useState(false)

  // Keep the contentEditable DOM in sync when `value` changes externally
  // (e.g. reset after send) without clobbering the caret during typing.
  useEffect(() => {
    if (rawMode) return
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value, rawMode])

  function emit() {
    if (ref.current) onChange(sanitizeBodyHtml(ref.current.innerHTML))
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus()
    // execCommand is deprecated but universally supported and by far the
    // simplest path for a self-contained editor with no dependencies.
    document.execCommand(cmd, false, arg)
    emit()
  }

  function applyLink() {
    const url = window.prompt("Link URL (https://…)")
    if (url) exec("createLink", url)
  }

  function applyColor(color: string) {
    exec("foreColor", color)
    setShowColors(false)
  }

  if (rawMode) {
    return (
      <div className={cn("rounded-lg border border-[#e5e7eb] bg-white", className)}>
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-3 py-2">
          <span className="text-xs font-medium text-[#6b7280]">Raw HTML</span>
          <button
            type="button"
            onClick={() => setRawMode(false)}
            className="rounded px-2 py-1 text-xs font-medium text-[#3B5BFF] hover:bg-[#eef2ff]"
          >
            Visual editor
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(sanitizeBodyHtml(e.target.value))}
          spellCheck={false}
          className="h-56 w-full resize-y rounded-b-lg bg-white p-3 font-mono text-[13px] text-[#111827] outline-none"
          placeholder="<p>Your HTML…</p>"
        />
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-[#e5e7eb] bg-white", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[#e5e7eb] px-2 py-1.5">
        {TOOLBAR.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            onClick={() => exec(b.command, b.arg)}
            className="flex h-8 w-8 items-center justify-center rounded text-[#4b5563] hover:bg-[#f3f4f6]"
          >
            <b.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onClick={applyLink}
          className="flex h-8 w-8 items-center justify-center rounded text-[#4b5563] hover:bg-[#f3f4f6]"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <div className="relative">
          <button
            type="button"
            title="Text color"
            aria-label="Text color"
            onClick={() => setShowColors((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded text-[#4b5563] hover:bg-[#f3f4f6]"
          >
            <Palette className="h-4 w-4" />
          </button>
          {showColors && (
            <div className="absolute z-20 mt-1 flex gap-1 rounded-md border border-[#e5e7eb] bg-white p-2 shadow-md">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => applyColor(c)}
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setRawMode(true)}
            title="Edit raw HTML"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            <Code2 className="h-3.5 w-3.5" /> HTML
          </button>
        </div>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="prose-sm min-h-[220px] max-w-none px-3 py-3 text-[15px] leading-relaxed text-[#111827] outline-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#3B5BFF] [&_a]:underline"
      />
    </div>
  )
}
