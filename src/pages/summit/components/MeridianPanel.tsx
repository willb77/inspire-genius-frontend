/**
 * Summit — Meridian chat panel.
 *
 * The real Agent-Engine wiring for the Summit surface. Uses the async-jobs
 * transport (POST /v1/agents/chat/async → poll /jobs/{id}) so a full
 * goal-setting turn is not killed by the 30s API-Gateway cap on the
 * synchronous chat endpoint. Goal-setting intent is routed server-side to the
 * Summit specialist; Meridian synthesizes the reply.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { sendSummitMessage } from "@/services/summit/summitChat";
import { cn } from "@/lib/utils";
const SUMMIT_QUICK_PROMPTS = [
  "Where am I in goal-setting?",
  "Why these goals?",
  "What does my PRISM say?",
];

type Msg = { who: "m" | "u"; text: string };

const GREETING: Msg = {
  who: "m",
  text: "Hi — I'm Meridian. Behind me, Summit is mapping your goals to how you're wired. Ask me anything about your goals, or tap a suggestion below.",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued…",
  running: "Thinking…",
  thinking: "Thinking…",
};

export default function MeridianPanel() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setMessages((prev) => [...prev, { who: "u", text }]);
      setInput("");
      setBusy(true);
      setStatus("thinking");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const reply = await sendSummitMessage(text, {
          sessionId,
          signal: ctrl.signal,
          onStatus: setStatus,
        });
        setSessionId(reply.sessionId || undefined);
        setMessages((prev) => [...prev, { who: "m", text: reply.content || "…" }]);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages((prev) => [
          ...prev,
          {
            who: "m",
            text: "I couldn't reach the goal-setting engine just now. Please try again in a moment.",
          },
        ]);
      } finally {
        setBusy(false);
        setStatus("");
        abortRef.current = null;
      }
    },
    [busy, sessionId],
  );

  // Cancel any in-flight poll on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the thread scrolled to the newest message / status.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy]);

  return (
    <aside className="flex w-full flex-col border-l border-slate-200 bg-slate-50/60">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#127A8A] to-[#0E5F6B] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Meridian</div>
            <div className="text-[11px] text-slate-500">Summit · goal-setting guide</div>
          </div>
        </div>
      </div>

      <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.who === "m"
                ? "self-start rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                : "ml-auto rounded-br-sm bg-slate-800 text-slate-50",
            )}
          >
            {m.who === "m" && (
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#0E5F6B]">
                Meridian · via Summit
              </div>
            )}
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="max-w-[92%] self-start rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#0E5F6B]">
              Meridian · via Summit
            </div>
            <span className="inline-flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {STATUS_LABEL[status] ?? "Thinking…"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {SUMMIT_QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => void send(q)}
            disabled={busy}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-[#127A8A] hover:text-[#0E5F6B] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Meridian…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#127A8A]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid w-11 flex-shrink-0 place-items-center rounded-xl bg-[#127A8A] text-white transition-colors hover:bg-[#0E5F6B] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </aside>
  );
}
