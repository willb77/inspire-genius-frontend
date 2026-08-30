import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Mail,
  Loader2,
} from "lucide-react"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY } from "./_format"

/**
 * Honor — Invite Composer.
 *
 * A dependency-free rich-text composer for the coach's acknowledgement message.
 * Fellows are NOT IG login users; this message is folded into the confirmation /
 * acknowledgement email the BACKEND sends (subject + intro are server-owned — the
 * composer only produces the coach's message BODY as sanitised-ready HTML).
 *
 * Formatting is `document.execCommand` over a `contentEditable` surface (Bold,
 * Italic, Underline, bullet / numbered lists, link) so no editor dependency is
 * pulled in. The live Preview mirrors exactly what will render in the email.
 */

/** A sensible default the coach can edit before sending. */
export const DEFAULT_INVITE_HTML =
  "<p>Congratulations, and welcome to your transition journey with The Honor Foundation.</p>" +
  "<p>Your coach has prepared your profile and will be guiding you through the next steps. " +
  "We're honored to support you.</p>"

type ToolButton = {
  label: string
  icon: typeof Bold
  command: string
  /** When set, the command is a formatBlock / list command needing no value prompt. */
  block?: boolean
}

const TOOLBAR: ToolButton[] = [
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Bullet list", icon: List, command: "insertUnorderedList", block: true },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList", block: true },
]

export default function InviteComposer({
  open,
  recipientCount,
  defaultHtml = DEFAULT_INVITE_HTML,
  onCancel,
  onSend,
  pending = false,
}: {
  open: boolean
  recipientCount: number
  defaultHtml?: string
  onCancel: () => void
  onSend: (html: string) => void
  pending?: boolean
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(defaultHtml)

  // Seed the editor when opened (and whenever the default changes while closed).
  useEffect(() => {
    if (!open) return
    setHtml(defaultHtml)
    // Defer so the contentEditable node exists before we write into it.
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = defaultHtml
    })
  }, [open, defaultHtml])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  function sync() {
    if (editorRef.current) setHtml(editorRef.current.innerHTML)
  }

  function exec(command: string) {
    editorRef.current?.focus()
    document.execCommand(command, false)
    sync()
  }

  function insertLink() {
    editorRef.current?.focus()
    const url = window.prompt("Link URL", "https://")
    if (!url) return
    document.execCommand("createLink", false, url)
    sync()
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compose invitation message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#18202f]">Compose invitation message</h2>
            <p className="mt-0.5 text-sm text-[#5b6678]">
              This message is included in the confirmation email sent to{" "}
              <span className="font-medium text-[#18202f]">
                {recipientCount} fellow{recipientCount === 1 ? "" : "s"}
              </span>
              . The subject and intro are added automatically.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-[#5b6678] hover:bg-[#f1f3f7] hover:text-[#18202f]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Editor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Your message</label>
            <div className="overflow-hidden rounded-lg border border-[#dfe4ec]">
              <div
                role="toolbar"
                aria-label="Formatting"
                className="flex flex-wrap items-center gap-0.5 border-b border-[#dfe4ec] bg-[#f8fafc] px-1.5 py-1"
              >
                {TOOLBAR.map((t) => (
                  <button
                    key={t.command}
                    type="button"
                    aria-label={t.label}
                    title={t.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec(t.command)}
                    className="rounded p-1.5 text-[#374151] hover:bg-[#e9edf3] hover:text-[#18202f]"
                  >
                    <t.icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Link"
                  title="Link"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertLink}
                  className="rounded p-1.5 text-[#374151] hover:bg-[#e9edf3] hover:text-[#18202f]"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
              <div
                ref={editorRef}
                role="textbox"
                aria-label="Message body"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                onInput={sync}
                className="honor-invite-editor min-h-[180px] max-h-[320px] overflow-auto px-3 py-2 text-sm leading-relaxed text-[#18202f] outline-none"
              />
            </div>
            <p className="mt-1.5 text-xs text-[#9299a6]">
              Use the toolbar to format. Fellows are not app users — this is a one-way
              acknowledgement.
            </p>
          </div>

          {/* Preview */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Preview</label>
            <div
              aria-label="Email preview"
              className="honor-invite-preview min-h-[180px] rounded-lg border border-[#e6e9ef] bg-[#fbfcfe] px-4 py-3 text-sm leading-relaxed text-[#18202f]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <p className="mt-1.5 text-xs text-[#9299a6]">
              This is exactly how your message appears in the email body.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" className={HONOR_BTN_OUTLINE} onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={HONOR_BTN_PRIMARY}
            onClick={() => onSend(html)}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {pending ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
