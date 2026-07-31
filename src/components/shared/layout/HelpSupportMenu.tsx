import { FileText, HelpCircle, Presentation, FileType2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { GUIDE_LINKS } from "@/components/shared/layout/helpSupportLinks";

/**
 * Help / Support entry for the bottom of the left sidebar. A single button that
 * opens a small menu linking to the Coach Workbench guide (clickable web
 * version), the slide deck, and the Word document. Every target opens in a new
 * tab so the coach never loses their place in the app.
 */
export default function HelpSupportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton asChild>
          <Button
            variant="ghost"
            className="w-full justify-start"
            type="button"
            aria-label="Help and support"
          >
            <HelpCircle className="mr-2 size-4" /> Help / Support
          </Button>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-60">
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
  );
}
