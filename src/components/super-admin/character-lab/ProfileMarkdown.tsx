import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Renders a Character Lab write-up as formatted prose.
 *
 * The analysis, comparisons and scenarios all come back as markdown. They were
 * previously rendered inside a `whitespace-pre-wrap` div, which printed the
 * `##` and `**` literally: the model's structure was there and invisible, and a
 * four-section write-up read as one undifferentiated wall.
 *
 * Styled explicitly rather than through `prose` classes. The typography plugin
 * is not in this build, so `prose prose-sm` was inert — a className that looked
 * like formatting and did nothing.
 */

const H2 = (props: ComponentPropsWithoutRef<"h2">) => (
  <h2
    className="mt-6 mb-2 border-b pb-1 text-base font-semibold tracking-tight first:mt-0"
    {...props}
  />
)

const H3 = (props: ComponentPropsWithoutRef<"h3">) => (
  <h3 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0" {...props} />
)

const P = (props: ComponentPropsWithoutRef<"p">) => (
  <p className="mb-3 text-sm leading-relaxed last:mb-0" {...props} />
)

const UL = (props: ComponentPropsWithoutRef<"ul">) => (
  <ul className="mb-3 ml-5 list-disc space-y-1.5 text-sm leading-relaxed" {...props} />
)

const OL = (props: ComponentPropsWithoutRef<"ol">) => (
  <ol className="mb-3 ml-5 list-decimal space-y-1.5 text-sm leading-relaxed" {...props} />
)

const STRONG = (props: ComponentPropsWithoutRef<"strong">) => (
  <strong className="font-semibold text-foreground" {...props} />
)

const TABLE = (props: ComponentPropsWithoutRef<"table">) => (
  // Wide tables scroll inside their own box rather than pushing the page sideways.
  <div className="my-3 overflow-x-auto">
    <table className="w-full border-collapse text-sm" {...props} />
  </div>
)

const TH = (props: ComponentPropsWithoutRef<"th">) => (
  <th className="border bg-muted px-2 py-1 text-left font-medium" {...props} />
)

const TD = (props: ComponentPropsWithoutRef<"td">) => (
  <td className="border px-2 py-1 align-top" {...props} />
)

const BLOCKQUOTE = (props: ComponentPropsWithoutRef<"blockquote">) => (
  <blockquote className="my-3 border-l-2 pl-3 text-sm italic text-muted-foreground" {...props} />
)

const COMPONENTS = {
  h1: H2,
  h2: H2,
  h3: H3,
  h4: H3,
  p: P,
  ul: UL,
  ol: OL,
  strong: STRONG,
  table: TABLE,
  th: TH,
  td: TD,
  blockquote: BLOCKQUOTE,
} as const

export default function ProfileMarkdown({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
