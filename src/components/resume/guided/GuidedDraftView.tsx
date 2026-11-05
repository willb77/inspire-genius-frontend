/**
 * RWO-8 — the draft on the review step, where any line can be clicked to ask
 * about it or rewrite it (board Step4: "Click any line to ask about it or edit
 * it").
 *
 * It renders the same `ResumeDocument` as `ResumeDocumentView`, so the page still
 * shows what the files are written from. It is a separate component on purpose:
 * today's (non-guided) page keeps `ResumeDocumentView` byte for byte. Each
 * sentence-level line (a summary paragraph, a bullet, a skills line) is a button;
 * the line menu offers two things, and neither sends anything or spends a draft
 * on its own:
 *   - Ask about this line → a question in the assistant's box.
 *   - Rewrite this line → "Rewrite: “…” — " in the box, to finish and send; Apply
 *     under it then uses one draft, as every Apply does.
 */
import { useEffect, useRef, useState } from "react"
import { MessageCircleQuestion, PencilLine } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ResumeDocument } from "@/lib/resume/resumeDocument"

type LineProps = {
  /** Where the line sits; two identical bullets are still two lines. */
  at: string
  text: string
  changed?: ReadonlySet<string>
  openLine: string | null
  onOpen: (text: string | null) => void
  onAsk: (text: string) => void
  onRewrite: (text: string) => void
}

function Line({ at, text, changed, openLine, onOpen, onAsk, onRewrite }: LineProps) {
  const open = openLine === at
  const lineRef = useRef<HTMLButtonElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)
  const isChanged = changed?.has(text) ?? false

  useEffect(() => {
    if (open) firstRef.current?.focus()
  }, [open])

  const close = () => {
    onOpen(null)
    lineRef.current?.focus()
  }

  return (
    <span className="relative block">
      <button
        ref={lineRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${text} — ask about or rewrite this line`}
        onClick={() => onOpen(open ? null : at)}
        {...(isChanged ? { "data-changed": "true" } : {})}
        className={cn(
          // RWO8-F4: block, not the button default inline-block — an inline-block's
          // baseline is its LAST line, so a wrapped bullet's dot sat beside its
          // last line. No horizontal padding, so text lines up with the headings
          // as in ResumeDocumentView.
          "block w-full rounded text-left hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600",
          isChanged && "bg-teal-50",
          open && "bg-muted",
        )}
      >
        {text}
      </button>
      {open ? (
        <span
          role="menu"
          aria-label="This line"
          data-testid="guided-line-menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation()
              close()
            }
          }}
          className="mt-1 flex flex-wrap gap-1.5 rounded-md border bg-background p-1.5 shadow-sm"
        >
          <button
            ref={firstRef}
            type="button"
            role="menuitem"
            onClick={() => {
              onOpen(null)
              onAsk(text)
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs hover:bg-muted"
          >
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Ask about this line
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpen(null)
              onRewrite(text)
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs hover:bg-muted"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Rewrite this line
          </button>
        </span>
      ) : null}
    </span>
  )
}

export function GuidedDraftView({
  doc,
  footnote,
  changed,
  onAsk,
  onRewrite,
}: {
  doc: ResumeDocument
  footnote: string
  changed?: ReadonlySet<string>
  onAsk: (line: string) => void
  onRewrite: (line: string) => void
}) {
  const [openLine, setOpenLine] = useState<string | null>(null)
  const line = (at: string, text: string) => (
    <Line
      at={at}
      text={text}
      changed={changed}
      openLine={openLine}
      onOpen={setOpenLine}
      onAsk={onAsk}
      onRewrite={onRewrite}
    />
  )

  return (
    <div className="space-y-4" data-testid="resume-draft">
      <div>
        {doc.name ? <h2 className="text-xl font-semibold">{doc.name}</h2> : null}
        {doc.headline ? <p className="text-sm font-medium">{doc.headline}</p> : null}
        {doc.contactLine ? (
          <p className="text-xs text-muted-foreground" data-testid="resume-contact-line">
            {doc.contactLine}
          </p>
        ) : null}
      </div>
      {doc.sections.map((s) => (
        <section key={s.key} data-testid={`resume-section-${s.key}`}>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide">{s.heading}</h3>
          <div className="space-y-2">
            {s.blocks.map((b, i) => {
              if (b.kind === "paragraph")
                return (
                  <div key={i} className="text-sm leading-relaxed">
                    {line(`${s.key}.${i}`, b.text)}
                  </div>
                )
              if (b.kind === "lines")
                return (
                  <div key={i} className="space-y-0.5 text-sm">
                    {b.items.map((x, j) => (
                      <div key={j}>{line(`${s.key}.${i}.${j}`, x)}</div>
                    ))}
                  </div>
                )
              if (b.kind === "bullets")
                return (
                  <ul key={i} className="list-disc space-y-0.5 pl-5 text-sm">
                    {b.items.map((x, j) => (
                      <li key={j}>{line(`${s.key}.${i}.${j}`, x)}</li>
                    ))}
                  </ul>
                )
              return (
                <div key={i}>
                  <div className="text-sm font-medium">{[b.title, b.subtitle].filter(Boolean).join(", ")}</div>
                  {b.dates ? <div className="text-xs text-muted-foreground">{b.dates}</div> : null}
                  {b.bullets.length ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                      {b.bullets.map((x, j) => (
                        <li key={j}>{line(`${s.key}.${i}.${j}`, x)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-muted-foreground" data-testid="guided-line-hint">
        Highlighted: changed in your last revision. Click any line to ask about it or edit it.
      </p>
      <p className="border-t pt-2 text-xs text-muted-foreground" data-testid="resume-footnote">
        {footnote}
      </p>
    </div>
  )
}
