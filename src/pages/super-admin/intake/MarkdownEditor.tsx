import { useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "tiptap-markdown"
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  ariaDescribedBy?: string
}

/**
 * A rich-text editor that stores MARKDOWN, not HTML. What the admin types is
 * serialised to Markdown on every change; the public events page renders that
 * Markdown through an allow-list (see `EventDescription`). Headings, code,
 * quotes and images are switched off so the editor cannot produce anything the
 * public page would drop.
 */
export function MarkdownEditor({ id, value, onChange, placeholder, ariaDescribedBy }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState("")
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: false },
      }),
      Markdown.configure({ html: false, linkify: false, breaks: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Public description",
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        "data-placeholder": placeholder ?? "",
        class: "min-h-[96px] px-3 py-2 text-sm outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline",
      },
    },
    onUpdate: ({ editor: e }) => {
      const md = (e.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()
      onChange(md)
    },
  })

  if (!editor) return null

  const tool = (label: string, active: boolean, run: () => void, icon: React.ReactNode) => (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-8"
      aria-label={label}
      aria-pressed={active}
      onClick={run}
    >
      {icon}
    </Button>
  )

  const applyLink = () => {
    const url = href.trim()
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run()
    else if (/^(https?:\/\/|mailto:)/i.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    else return
    setLinkOpen(false)
    setHref("")
  }

  return (
    <div className={cn("rounded-md border bg-background")}>
      <div className="flex flex-wrap items-center gap-1 border-b p-1" role="toolbar" aria-label="Formatting">
        {tool("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />)}
        {tool("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />)}
        {tool("Bulleted list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />)}
        {tool("Numbered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />)}
        {tool(
          "Link",
          editor.isActive("link"),
          () => {
            setHref((editor.getAttributes("link").href as string | undefined) ?? "")
            setLinkOpen((o) => !o)
          },
          <LinkIcon className="h-4 w-4" />,
        )}
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b p-2">
          <Input
            aria-label="Link address"
            placeholder="https://"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                applyLink()
              }
            }}
          />
          <Button type="button" size="sm" onClick={applyLink}>
            Apply
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
