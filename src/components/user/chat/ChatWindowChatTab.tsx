import { type RefObject, useState } from "react";
import { motion } from "framer-motion";
import { Copy, CirclePlay, FileText, ChevronDown, ChevronUp, Users, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { agentApi } from "@/lib/agentApi";
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown";
import MessageFeedback from "@/components/user/chat/MessageFeedback";
import ObservabilityPanel from "@/components/observability/ObservabilityPanel";
import type { ChatMessage, RAGSource } from "@/types/chat";

async function openSourceDocument(documentId: string, filename: string) {
  // P3 — open source document via the existing per-user download
  // endpoint. We fetch the presigned URL with our auth headers (the
  // axios interceptor injects access-token) and then window.open() it.
  // A plain <a href> would not carry the JWT, and a global presigned
  // URL in the chat metadata would expose document access to anyone
  // who can read the chat payload.
  try {
    const resp = await agentApi.get<{ status: boolean; url: string }>(
      `/v1/documents/${documentId}/download`,
    );
    if (resp.data?.url) {
      window.open(resp.data.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error(`Couldn't open "${filename}" — backend returned no URL.`);
    }
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      toast.error(`Couldn't open "${filename}" — document not found or access denied.`);
    } else {
      toast.error(`Couldn't open "${filename}" — please try again.`);
    }
  }
}

function SourceAttribution({ sources }: { sources: RAGSource[] }) {
  const [expanded, setExpanded] = useState(false);
  // Dedup on (document_id, filename) so two tenants who happen to have
  // files with the same name don't collapse into one row. document_id
  // is server-side (UUID); when absent we fall back to filename alone.
  const unique = Object.values(
    sources.reduce<Record<string, RAGSource>>((acc, s) => {
      const key = `${s.document_id ?? ""}::${s.filename}`;
      if (!acc[key] || acc[key].similarity < s.similarity) {
        acc[key] = s;
      }
      return acc;
    }, {}),
  ).sort((a, b) => b.similarity - a.similarity);

  if (unique.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="h-3 w-3" />
        <span>Sources ({unique.length})</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-1 flex flex-wrap gap-1">
          {unique.map((s) => {
            const sharedKey = `${s.document_id ?? ""}::${s.filename}`;
            const sharedClass =
              "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground";
            const contents = (
              <>
                <FileText className="h-3 w-3" />
                {s.filename}
                <span className="text-[10px] opacity-70">
                  ({Math.round(s.similarity * 100)}%)
                </span>
              </>
            );
            // When the backend knows the document_id, render as a
            // clickable button that opens the per-user presigned URL.
            // Otherwise (legacy / global-only sources) show as a chip.
            if (s.document_id) {
              return (
                <button
                  key={sharedKey}
                  type="button"
                  onClick={() => openSourceDocument(s.document_id as string, s.filename)}
                  className={`${sharedClass} hover:bg-accent hover:text-foreground cursor-pointer`}
                  title={`Open ${s.filename}`}
                >
                  {contents}
                </button>
              );
            }
            return (
              <span key={sharedKey} className={sharedClass}>
                {contents}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollaborationBadge({ agents }: { agents: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (agents.length < 2) return null;

  const summary = agents.join(", ");
  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Users className="h-3 w-3" />
        <span>Collaborative response ({agents.length} agents)</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="opacity-80">Synthesized from {summary}</span>
        </div>
      )}
    </div>
  );
}

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
  onReplayMessage?: (text: string) => void;
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
  onReplayMessage,
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
                {m.sender === "assistant" && onReplayMessage && m.text && (
                  <button
                    aria-label="Replay voice"
                    title="Replay voice"
                    type="button"
                    className="cursor-pointer text-muted-foreground/60 hover:text-foreground"
                    onClick={() => onReplayMessage(m.text)}
                  >
                    <Volume2 className="size-4 text-black" />
                  </button>
                )}
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
            {m.kind === "text" && m.sender === "assistant" && m.agent && (
              <p className="mt-1 text-xs text-muted-foreground">
                via {m.agent}
              </p>
            )}
            {m.kind === "text" && m.sender === "assistant" && m.ragSources && m.ragSources.length > 0 && (
              <SourceAttribution sources={m.ragSources} />
            )}
            {m.kind === "text" &&
              m.sender === "assistant" &&
              m.synthesized === true &&
              m.contributingAgents &&
              m.contributingAgents.length >= 2 && (
                <CollaborationBadge agents={m.contributingAgents} />
              )}
            {m.sender === "assistant" && coachId && conversationId && (
              <MessageFeedback
                messageId={m.id}
                conversationId={conversationId}
                coachId={coachId}
              />
            )}
            {m.sender === "assistant" && (
              <ObservabilityPanel messageId={m.id} />
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
