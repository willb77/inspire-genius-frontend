import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { History, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { useDeleteConversation } from "@/hooks/agents/useDeleteConversation";
import { cn } from "@/lib/utils";

const AGENT_ID = "meridian";

type HistoryDropdownProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  activeId: string | null;
  onSelectActive: (id: string) => void;
  /**
   * Fired when the user deletes the conversation that is currently active, so
   * the host can clear the pane. Without it the chat would keep rendering a
   * transcript whose conversation no longer exists on the server.
   */
  onDeletedActive?: (id: string) => void;
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
  onDeletedActive,
  className,
}: HistoryDropdownProps) {
  const { t } = useTranslation("chat");
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

  // Delete is armed per-row (see the two-step control below), so only one row
  // can be pending confirmation at a time.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteConv = useDeleteConversation();

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteConv.mutate(
      { conversationId: id, agentId: AGENT_ID },
      {
        onSuccess: () => {
          setDeletingId(null);
          setConfirmingId(null);
          // Drop it from the review selection too — leaving a deleted id in
          // there would keep asking the chat to render a conversation the
          // server no longer has.
          if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
          }
          // If the deleted conversation was the active one, tell the host so it
          // can clear the pane rather than showing a phantom transcript.
          if (activeId === id) onDeletedActive?.(id);
          toast.success(
            t("history.deleted", { defaultValue: "Conversation deleted." }),
          );
        },
        onError: () => {
          setDeletingId(null);
          setConfirmingId(null);
          toast.error(
            t("history.deleteFailed", {
              defaultValue: "Couldn't delete that conversation. Please try again.",
            }),
          );
        },
      },
    );
  };

  const reviewCount = selectedIds.length;
  const triggerLabel =
    reviewCount > 0
      ? t("history.triggerShown", {
          defaultValue: "History ({{count}} shown)",
          count: reviewCount,
        })
      : t("history.triggerCount", {
          defaultValue: "History ({{count}})",
          count: conversations.length,
        });

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
          aria-label={t("history.triggerAria", { defaultValue: "Browse conversation history" })}
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
          {t("history.hint", {
            defaultValue:
              "Click a conversation to make it active, or check it to add to review.",
          })}
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
              {t("history.loadError", { defaultValue: "Couldn't load conversation history." })}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              {t("common.noConversations", {
                defaultValue: "No conversations yet. Send a message to start one.",
              })}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const isActive = activeId === c.id;
                const isChecked = selectedIds.includes(c.id);
                const title =
                  (c.title && c.title.trim()) ||
                  t("common.untitledConversation", { defaultValue: "Untitled conversation" });
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
                        aria-label={t("history.includeAria", {
                          defaultValue: "Include {{title}} in review",
                          title,
                        })}
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
                              {t("history.activeBadge", { defaultValue: "Active" })}
                            </span>
                          )}
                        </div>
                        {when && (
                          <span className="text-xs text-muted-foreground">
                            {when}
                          </span>
                        )}
                      </button>
                      {/* Delete — two-step, never one click. Removing a
                          conversation is irreversible and the row sits right
                          next to the one that merely opens it, so a single
                          misclick would otherwise destroy history the user
                          cannot get back. The first click arms; the second
                          confirms; anything else disarms. */}
                      {confirmingId === c.id ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="rounded px-1.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            data-testid={`history-dropdown-confirm-delete-${c.id}`}
                          >
                            {deletingId === c.id
                              ? t("history.deleting", { defaultValue: "Deleting…" })
                              : t("history.confirmDelete", { defaultValue: "Delete?" })}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId === c.id}
                            className="rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                            data-testid={`history-dropdown-cancel-delete-${c.id}`}
                          >
                            {t("common.cancel", { defaultValue: "Cancel" })}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(c.id)}
                          aria-label={t("history.deleteAria", {
                            defaultValue: "Delete {{title}}",
                            title,
                          })}
                          title={t("history.deleteAria", {
                            defaultValue: "Delete {{title}}",
                            title,
                          })}
                          className="shrink-0 rounded p-1 text-muted-foreground opacity-60 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                          data-testid={`history-dropdown-delete-${c.id}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      )}
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
              {t("history.reviewCount", {
                defaultValue: "{{count}} additional conversation{{plural}} in review",
                count: reviewCount,
                plural: reviewCount === 1 ? "" : "s",
              })}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-primary hover:underline"
            >
              {t("history.clearReview", { defaultValue: "Clear review" })}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
