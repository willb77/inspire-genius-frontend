import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SquarePen, ChevronDown, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatHistoryProps } from "@/types/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
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
};

export default function ChatHistory({ groups, selectedId, onSelect, className, onCreateNewConversation, isLoading, isAudioRunning, audioWarningText, searchValue, onSearchChange, onDeleteConversation }: ChatHistoryWithAudioProps) {

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };


  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm p-4 w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold">History</h3>
        {(() => {
          const hasEmptySelected = Boolean(
            selectedId && groups.some(g => g.items.some(it => it.id === selectedId && (it.preview ?? "").trim() !== "New Conversation"))
          );
          const newChatTooltip = hasEmptySelected ? "You already have a new conversation" : "Start a new conversation";
          const buttonEl = (
            <button
              aria-label="New Conversation"
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
          placeholder="Search.."
          value={typeof searchValue === "string" ? searchValue : searchValue}
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
                              aria-label="Open conversation actions"
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
                            <ConfirmDialog
                              title="Delete conversation"
                              description="Are you sure you want to delete this conversation? This action cannot be undone."
                              confirmText="Delete"
                              confirmVariant="destructive"
                              onConfirm={() => onDeleteConversation(it.id)}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                  <span className="text-red-600">Delete</span>
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
                                <span className="text-xs">{audioWarningText || "Switching conversations will stop current audio"}</span>
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
    </div>
  );
}
