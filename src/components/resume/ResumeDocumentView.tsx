/**
 * RWO-2 — the draft on the page, rendered from the same `ResumeDocument` the
 * files are written from, so what the person reads is what they download.
 *
 * The provenance and disclaimer line stays HERE, under the draft (Bill's D3:
 * off the file, on the page). Interview talking points are their own panel and
 * never part of the document.
 */
import type { ResumeDocument } from "@/lib/resume/resumeDocument"

export function ResumeDocumentView({ doc, footnote }: { doc: ResumeDocument; footnote: string }) {
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
              if (b.kind === "paragraph") return <p key={i} className="text-sm leading-relaxed">{b.text}</p>
              if (b.kind === "lines")
                return (
                  <div key={i} className="space-y-0.5 text-sm">
                    {b.items.map((x) => (
                      <p key={x}>{x}</p>
                    ))}
                  </div>
                )
              if (b.kind === "bullets")
                return (
                  <ul key={i} className="list-disc space-y-0.5 pl-5 text-sm">
                    {b.items.map((x, j) => (
                      <li key={j}>{x}</li>
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
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="border-t pt-2 text-xs text-muted-foreground" data-testid="resume-footnote">
        {footnote}
      </p>
    </div>
  )
}

export function ResumeTalkingPoints({ points }: { points: string[] }) {
  if (!points.length) return null
  return (
    <section data-testid="resume-talking-points" className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm">
      <h3 className="mb-1 font-semibold">For your interview</h3>
      <p className="mb-1 text-xs text-muted-foreground">Points you can use if a gap comes up. They are not in your résumé.</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </section>
  )
}
