import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SquarePen, ChevronDown, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatHistoryProps } from "@/types/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChatHistoryWithAudioProps = ChatHistoryProps & {
  isAudioRunning?: boolean;
  audioWarningText?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onDeleteConversation?: (conversationId: string) => void | Promise<void>;
  onRenameConversation?: (conversationId: string, title: string) => void | Promise<void>;
  renameIsPending?: boolean;
};

export default function ChatHistory({ groups, selectedId, onSelect, className, onCreateNewConversation, isLoading, isError, errorMessage, isAudioRunning, audioWarningText, searchValue, onSearchChange, onDeleteConversation, onRenameConversation, renameIsPending }: ChatHistoryWithAudioProps) {

  const { t } = useTranslation("chat");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const conversationTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      for (const it of g.items) {
        map.set(it.id, it.title);
      }
    }
    return map;
  }, [groups]);

  const openRenameDialog = (conversationId: string) => {
    const currentTitle = conversationTitleById.get(conversationId) ?? "";
    setRenameId(conversationId);
    setRenameValue(currentTitle);
    setRenameOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!renameId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;
    await onRenameConversation?.(renameId, nextTitle);
    setRenameOpen(false);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };


  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm p-4 w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold">{t("history.title", { defaultValue: "History" })}</h3>
        {(() => {
          const hasEmptySelected = Boolean(
            selectedId && groups.some(g => g.items.some(it => it.id === selectedId && (it.preview ?? "").trim() !== "New Conversation"))
          );
          const newChatTooltip = hasEmptySelected
            ? t("history.newChatTooltipExisting", { defaultValue: "You already have a new conversation" })
            : t("history.newChatTooltip", { defaultValue: "Start a new conversation" });
          const buttonEl = (
            <button
              aria-label={t("history.newConversationLabel", { defaultValue: "New Conversation" })}
              disabled={false}
              className="cursor-pointer text-sm flex items-center gap-2 text-gray-600 hover:text-foreground"
              onClick={() => {
                onCreateNewConversation?.();
              }}
            >
              New Chat <SquarePen className="size-4" />
            </button>
          );
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {buttonEl}
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">{newChatTooltip}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })()}
      </div>
      
      <div className="mb-3">
        <Input
          placeholder={t("history.searchPlaceholder", { defaultValue: "Search.." })}
          value={searchValue}
          disabled={false}
          onChange={(e) => {
            const val = e.target.value;
            onSearchChange?.(val);
          }}
          className="pl-3"
        />
      </div>
      <div className="space-y-4 overflow-auto max-h-[calc(100vh-14rem)]">
        {isLoading ? (
          <div className="space-y-4">
            {[0,1].map((g) => (
              <div key={g}>
                <div className="flex items-center gap-2 text-sm text-foreground/80 mb-2">
                  <Skeleton className="h-4 w-24" />
                </div>
                <ul className="mt-2 space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={`sk-${g}-${i}`}>
                      <div className="w-full rounded-xl px-3 py-2 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="mt-1">
                          <Skeleton className="h-3 w-56" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        {!isLoading && isError && groups.every((g) => g.items.length === 0) ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage ?? t("history.loadErrorDetailed", { defaultValue: "Couldn't load conversation history — the backend may be unavailable. Refresh to retry." })}
          </div>
        ) : null}
        {groups.map((group) => {
          const isOpen = openGroups[group.label] ?? true;
          const filtered = group?.items;
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-2 text-sm text-foreground/80"
                aria-expanded={isOpen}
              >
                <span>{group.label}</span>
                <ChevronDown className={cn("size-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
              </button>
              {isOpen && (
                <ul className="mt-2 space-y-1">
                  {filtered.map((it) => {
                    const menu = onDeleteConversation ? (
                      <div
                        className={cn(
                          "absolute right-2 top-2 opacity-0 transition-opacity",
                          "group-hover:opacity-100 group-focus-within:opacity-100",
                          undefined
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t("history.openActions", { defaultValue: "Open conversation actions" })}
                              className={cn(
                                "cursor-pointer rounded-md p-1",
                                selectedId === it.id
                                  ? "text-white/90 hover:bg-white/10"
                                  : "text-muted-foreground hover:bg-gray-100"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {onRenameConversation ? (
                              <DropdownMenuItem
                                onSelect={() => {
                                  openRenameDialog(it.id);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>{t("history.rename", { defaultValue: "Rename" })}</span>
                              </DropdownMenuItem>
                            ) : null}

                            <ConfirmDialog
                              title={t("history.deleteTitle", { defaultValue: "Delete conversation" })}
                              description={t("history.deleteDescription", { defaultValue: "Are you sure you want to delete this conversation? This action cannot be undone." })}
                              confirmText={t("common.delete", { defaultValue: "Delete" })}
                              confirmVariant="destructive"
                              onConfirm={() => onDeleteConversation(it.id)}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                  <span className="text-red-600">{t("common.delete", { defaultValue: "Delete" })}</span>
                                </DropdownMenuItem>
                              }
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null;

                    const btn = (
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={false}
                          onClick={() => onSelect?.(it.id)}
                          className={cn(
                            "w-full text-left rounded-xl px-3 py-2 pr-9",
                            selectedId === it.id
                              ? "bg-blue-primary text-white"
                              : "bg-transparent text-foreground hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{it.title}</span>
                          </div>
                          <span className={cn("text-xs", selectedId === it.id ? "text-white/80" : "text-muted-foreground")}>{it.timeLabel}</span>
                        </button>
                        {menu}
                      </div>
                    );
                    if (isAudioRunning) {
                      return (
                        <li key={it.id}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {btn}
                              </TooltipTrigger>
                              <TooltipContent className="bg-red-500 text-white border-red-500">
                                <span className="text-xs">{audioWarningText || t("history.audioWarning", { defaultValue: "Switching conversations will stop current audio" })}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </li>
                      );
                    }
                    return (
                      <li key={it.id}>{btn}</li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.renameDialogTitle", { defaultValue: "Rename conversation" })}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={t("history.renamePlaceholder", { defaultValue: "Conversation title" })}
            autoFocus
            disabled={!!renameIsPending}
          />
       
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <iframe
                src="https://lottie.host/embed/593a4db4-30f8-4c24-8860-6a34b8fd84f4/5CkhhSNGH0.lottie"
                title={t("history.renameAnimationTitle", { defaultValue: "Renaming animation" })}
                className="h-32 w-32"
                allow="autoplay"
              />
              <p className="text-xs text-muted-foreground">
                {renameIsPending
                  ? t("history.renamePending", { defaultValue: "Shaping your conversation’s identity… ✨" })
                  : t("history.renameHint", { defaultValue: "Give your conversation a name — make it easy to remember 🚀" })}
              </p>
            </div>
      
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={!!renameIsPending}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!renameValue.trim() || !!renameIsPending}
            >
              {t("common.save", { defaultValue: "Save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
