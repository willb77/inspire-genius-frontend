import { useMemo } from "react";
import { History, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { cn } from "@/lib/utils";

const AGENT_ID = "meridian";

type HistoryDropdownProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  activeId: string | null;
  onSelectActive: (id: string) => void;
  className?: string;
};

type ConversationRow = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

type ConversationListResponse = {
  data?: {
    conversations?: ConversationRow[];
  };
};

function formatRelative(input?: string): string {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

/**
 * T5 — History dropdown for MeridianChat.
 *
 * Replaces the dedicated History side panel with an inline dropdown.
 * Each conversation row has two click targets:
 *   • Click the row body  → `onSelectActive(id)` makes it editable.
 *   • Toggle the checkbox → `onChange` includes it in the read-only
 *     review pane alongside the active conversation.
 * The active conversation is marked with an "Active" badge.
 */
export default function HistoryDropdown({
  selectedIds,
  onChange,
  activeId,
  onSelectActive,
  className,
}: HistoryDropdownProps) {
  const { data, isLoading, isError } = useAgentConversation(AGENT_ID, {
    page: 1,
    limit: 50,
  });

  const conversations = useMemo<ConversationRow[]>(() => {
    const resp = data as ConversationListResponse | undefined;
    const list = resp?.data?.conversations;
    if (!Array.isArray(list)) return [];
    // Sort by updated_at / created_at descending so recently-active
    // conversations rise to the top of the dropdown.
    return [...list].sort((a, b) => {
      const aT = new Date(a.updated_at || a.created_at || 0).getTime();
      const bT = new Date(b.updated_at || b.created_at || 0).getTime();
      return bT - aT;
    });
  }, [data]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const reviewCount = selectedIds.length;
  const triggerLabel =
    reviewCount > 0
      ? `History (${reviewCount} shown)`
      : `History (${conversations.length})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 px-3 rounded-lg text-sm font-normal flex items-center gap-2",
            className,
          )}
          aria-label="Browse conversation history"
        >
          <History className="size-4" />
          <span>{triggerLabel}</span>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[28rem] max-w-[calc(100vw-2rem)] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          Click a conversation to make it active, or check it to add to review.
        </div>
        <div
          className="max-h-80 overflow-y-auto p-2"
          data-testid="history-dropdown-list"
        >
          {isLoading ? (
            <div
              className="space-y-2 p-1"
              data-testid="history-dropdown-loading"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2">
                  <Skeleton className="size-4 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-3 text-sm text-destructive">
              Couldn't load conversation history.
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No conversations yet. Send a message to start one.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const isActive = activeId === c.id;
                const isChecked = selectedIds.includes(c.id);
                const title =
                  (c.title && c.title.trim()) || "Untitled conversation";
                const when = formatRelative(c.updated_at || c.created_at);
                return (
                  <li key={c.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted",
                        isActive && "bg-primary/5",
                      )}
                      data-testid={`history-dropdown-row-${c.id}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(c.id)}
                        aria-label={`Include ${title} in review`}
                        data-testid={`history-dropdown-checkbox-${c.id}`}
                      />
                      <button
                        type="button"
                        onClick={() => onSelectActive(c.id)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                        data-testid={`history-dropdown-select-${c.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate text-sm font-medium"
                            title={title}
                          >
                            {title}
                          </span>
                          {isActive && (
                            <span
                              className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                              data-testid={`history-dropdown-active-${c.id}`}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        {when && (
                          <span className="text-xs text-muted-foreground">
                            {when}
                          </span>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!isLoading && !isError && conversations.length > 0 && reviewCount > 0 && (
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              {reviewCount} additional conversation{reviewCount === 1 ? "" : "s"} in review
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-primary hover:underline"
            >
              Clear review
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
