import { LifeBuoy, FileText, Presentation, FileType2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GUIDE_LINKS } from "@/components/shared/layout/helpSupportLinks"

/**
 * Help / Support control for the Honor (THF) Coach Workbench sidebar footer.
 *
 * HonorShell is a self-contained navy chrome with its own Tailwind styling and
 * NO shadcn SidebarProvider, so the shared `HelpSupportMenu` (which renders a
 * `SidebarMenuButton`) cannot drop in here. This is the THF-styled twin: a
 * footer button matching "Back to Inspire Genius" that opens a small menu
 * linking to the Coach Workbench guide (clickable web version), the slide deck,
 * and the Word document. It reuses the SAME `GUIDE_LINKS` source of truth as the
 * shared menu, so both surfaces always point at the same assets.
 *
 * Links are app-relative under /docs/guides/ (deployed to the frontend's own
 * S3/CloudFront origin), so they resolve on dev, staging-b, or local. Each opens
 * in a new tab so the coach never loses their place.
 */
export default function HonorHelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Help and support"
          className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[12.5px] text-slate-200 transition-colors hover:bg-white/10"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> Help / Support
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel>Coach Workbench guide</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={GUIDE_LINKS.html} target="_blank" rel="noopener noreferrer">
            <FileText className="mr-2 size-4" /> User guide (web)
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={GUIDE_LINKS.pptx} target="_blank" rel="noopener noreferrer">
            <Presentation className="mr-2 size-4" /> Slide deck (PowerPoint)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={GUIDE_LINKS.docx} target="_blank" rel="noopener noreferrer">
            <FileType2 className="mr-2 size-4" /> Word version (.docx)
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
