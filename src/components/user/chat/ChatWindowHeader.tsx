import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, FileText, Upload } from "lucide-react";
import SessionObservabilityDrawer from "@/components/observability/SessionObservabilityDrawer";

type ChatWindowTab = "chat" | "documents";

type ChatWindowHeaderProps = {
  coachName: string;
  activeTab: ChatWindowTab;
  onBack?: () => void;
  onTabChange: (tab: ChatWindowTab) => void;
  onOpenDocsSidePanel: () => void;
  onOpenExport: () => void;
  conversationId?: string;
};

export default function ChatWindowHeader({
  coachName,
  activeTab,
  onBack,
  onTabChange,
  onOpenDocsSidePanel,
  onOpenExport,
  conversationId,
}: ChatWindowHeaderProps) {
  const chatTabClass = cn(
    "cursor-pointer px-2 py-1 border-b-2 text-sm",
    activeTab === "chat"
      ? "border-blue-primary text-foreground"
      : "border-transparent text-muted-foreground"
  );

  const docsTabClass = cn(
    "hidden cursor-pointer px-2 py-1 border-b-2 text-sm",
    activeTab === "documents"
      ? "border-blue-primary text-foreground"
      : "border-transparent text-muted-foreground"
  );

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          aria-label="Back"
          onClick={onBack}
          className="cursor-pointer p-1 rounded-md hover:bg-gray-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-base font-semibold">{coachName}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-4">
          <button className={chatTabClass} onClick={() => onTabChange("chat")}>
            Chat
          </button>
          <button
            disabled={false}
            className={docsTabClass}
            onClick={() => onTabChange("documents")}
          >
            Documents
          </button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-9 bg-transparent px-3 rounded-lg text-sm font-normal"
              onClick={onOpenDocsSidePanel}
              aria-label="Open documents side panel"
            >
              <FileText className="size-4 mr-1" />
              Documents
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Open documents panel to select files to add to chat
          </TooltipContent>
        </Tooltip>

        {conversationId && (
          <SessionObservabilityDrawer sessionId={conversationId} />
        )}

        <Button
          className="bg-brown-250 hover:bg-brown-250/90 text-white h-9 px-3 rounded-lg"
          variant="secondary"
          disabled={false}
          onClick={onOpenExport}
        >
          <Upload className="size-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}
