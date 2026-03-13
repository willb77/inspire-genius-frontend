import type { RefObject } from "react";
import { motion } from "framer-motion";
import { Copy, CirclePlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown";
import MessageFeedback from "@/components/user/chat/MessageFeedback";
import type { ChatMessage } from "@/types/chat";

const getDocKindBadgeClass = (kind?: string) => {
  if (kind === "pdf") return "bg-red-50 text-red-600";
  if (kind === "csv") return "bg-green-50 text-green-600";
  if (kind === "ppt") return "bg-orange-50 text-orange-600";
  return "bg-blue-50 text-blue-600";
};

type ChatWindowChatTabProps = {
  convIsLoading?: boolean;
  convIsFetchingNext?: boolean;
  renderMessages: ChatMessage[];
  bottomRef: RefObject<HTMLDivElement | null>;
  onCopy: (text: string) => void;
  audioPlayerBuffer?: AudioBuffer | null;
  lastMessageId?: string;
  onShowAudioPlayer: () => void;
  genericMessages: string;
  coachId?: string;
  conversationId?: string;
};

export default function ChatWindowChatTab({
  convIsLoading,
  convIsFetchingNext,
  renderMessages,
  bottomRef,
  onCopy,
  audioPlayerBuffer,
  lastMessageId,
  onShowAudioPlayer,
  genericMessages,
  coachId,
  conversationId,
}: ChatWindowChatTabProps) {
  const renderMessage = (m: ChatMessage) => {
    if (m.kind === "text") {
      const right = m.sender === "user";
      return (
        <div key={m.id} className="space-y-1">
          <div className={cn("max-w-[70%] min-w-40 w-fit ", right ? "ml-auto" : undefined)}>
            <div
              className={cn(
                "rounded-2xl p-3 text-sm text-foreground/90 shadow-sm",
                "bg-gray-100"
              )}
            >
              {m.sender === "assistant" ? (
                <AssistantMarkdown
                  text={m.text}
                  className="text-left overflow-x-auto"
                />
              ) : (
                m.text
              )}
            </div>
            <div
              className={cn(
                "max-w-full min-w-40 w-full flex items-center justify-between mt-2 px-2",
                right ? "ml-auto" : undefined
              )}
            >
              <div className="flex items-center gap-4">
                <button
                  aria-label="Copy message"
                  type="button"
                  className="cursor-pointer text-muted-foreground/60 hover:text-foreground"
                  onClick={() => onCopy(m.text)}
                >
                  <Copy className="size-4 text-black" />
                </button>
                {audioPlayerBuffer &&
                  m.sender === "assistant" &&
                  m.id === lastMessageId && (
                    <CirclePlay
                      className="size-4.5 text-blue-800 cursor-pointer"
                      onClick={onShowAudioPlayer}
                    />
                  )}
              </div>
              <div className="text-[11px] text-muted-foreground">{m.time}</div>
            </div>
            {m.sender === "assistant" && coachId && conversationId && (
              <MessageFeedback
                messageId={m.id}
                conversationId={conversationId}
                coachId={coachId}
              />
            )}
          </div>
        </div>
      );
    }

    if (m.kind === "processing") {
      return (
        <div key={m.id} className="space-y-1">
          <div
            className={cn(
              "max-w-[70%] rounded-2xl p-3 text-sm shadow-sm bg-gray-100"
            )}
          >
            <div className="flex items-center gap-1 h-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-800"
                  initial={{ opacity: 0.4, y: 0 }}
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    y: [0, -3, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </div>
          <div
            className={cn(
              "max-w-[70%] flex items-center justify-between mt-2 px-2"
            )}
          >
            <div
              className={cn(
                "text-xs text-muted-foreground",
                m.text ? "text-purple-700" : ""
              )}
            >
              {m.text ? m.text : `${genericMessages}`}
            </div>
            <div className="text-xs text-muted-foreground">{m.time}</div>
          </div>
        </div>
      );
    }

    const right = m.sender === "user";
    const kindClass = getDocKindBadgeClass(m.docKind);
    return (
      <div key={m.id} className="space-y-1">
        <div
          className={cn(
            "max-w-[70%] border rounded-2xl p-3 text-sm shadow-sm bg-white",
            right ? "ml-auto" : undefined
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-medium",
                kindClass
              )}
            >
              {m.docKind.toUpperCase()}
            </span>
            <span className="truncate">{m.docName}</span>
          </div>
        </div>
        <div
          className={cn(
            "max-w-[70%] flex items-center justify-between mt-2 px-2",
            right ? "ml-auto" : undefined
          )}
        >
          <button
            aria-label="Copy message"
            type="button"
            className="cursor-pointer text-muted-foreground/60 hover:text-foreground"
            onClick={() => onCopy(`${m.docName}`)}
          >
            <Copy className="size-4 text-black" />
          </button>
          <div className="text-xs text-muted-foreground">{m.time}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {convIsLoading && (
        <div className="space-y-4 px-4 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                i % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl p-3",
                  "bg-gray-100"
                )}
              >
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 space-y-4 mt-4">
        {renderMessages.map((m) => renderMessage(m))}
        <div ref={bottomRef} />
      </div>

      {convIsFetchingNext && (
        <div className="space-y-4 px-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`more-${i}`}
              className={cn(
                "flex",
                i % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl p-3",
                  "bg-gray-100"
                )}
              >
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
