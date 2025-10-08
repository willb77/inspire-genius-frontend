import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PencilLine, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatHistoryProps } from "@/types/chat-types";

export default function ChatHistory({ groups, selectedId, onSelect, className }: ChatHistoryProps) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm p-4 w-full", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">History</h3>
        <button aria-label="Edit History" className="text-muted-foreground hover:text-foreground">
          <PencilLine className="size-4" />
        </button>
      </div>
      <div className="mb-3">
        <Input
          placeholder="Search.."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-3"
        />
      </div>
      <div className="space-y-4 overflow-auto max-h-[calc(100vh-14rem)]">
        {groups.map((group) => {
          const isOpen = openGroups[group.label] ?? true;
          const filtered = group.items.filter(
            (it) =>
              it.title.toLowerCase().includes(query.toLowerCase()) ||
              it.preview.toLowerCase().includes(query.toLowerCase())
          );
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
                  {filtered.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => onSelect?.(it.id)}
                        className={cn(
                          "w-full text-left rounded-xl px-3 py-2",
                          selectedId === it.id
                            ? "bg-blue-primary text-white"
                            : "bg-transparent text-foreground hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{it.title}</span>
                          <span className={cn("text-xs", selectedId === it.id ? "text-white/80" : "text-muted-foreground")}>{it.timeLabel}</span>
                        </div>
                        <div className={cn("text-xs truncate", selectedId === it.id ? "text-white/90" : "text-muted-foreground")}>{it.preview}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
