/**
 * Progressive delivery — fold a partial answer into the in-flight bubble.
 *
 * Browser chat polls `GET /v1/agents/chat/jobs/{id}` every 2s. The agent
 * engine now flushes partial text onto the running `chat_jobs` row for
 * single-agent turns, so the answer can be rendered as it is written
 * rather than appearing all at once when the job goes terminal.
 *
 * Kept as a pure function so the merge rules are testable without
 * mounting the whole chat page.
 */
import type { ChatMessage } from "@/types/chat";

/**
 * Return a new message list with `partial` written into the newest
 * in-flight ("processing") bubble.
 *
 * Returns the ORIGINAL array reference when nothing should change, so
 * callers can pass this straight to `setMessages` without causing a
 * re-render on every poll.
 *
 * Rules:
 * - Empty partial → no change. A backend that has not been promoted yet
 *   leaves `content` null on running jobs, and this must be a no-op.
 * - No in-flight bubble → no change (the turn already settled).
 * - Unchanged text → same reference, no re-render.
 * - The bubble stays `kind: "processing"` so the in-progress affordance
 *   remains and the settle handler can still find and replace it.
 */
export function applyPartialToMessages(
  messages: ChatMessage[],
  partial: string,
): ChatMessage[] {
  if (!partial) return messages;

  let idx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].kind === "processing") {
      idx = i;
      break;
    }
  }
  if (idx === -1) return messages;

  // Narrow to the processing variant before spreading — ChatMessage is a
  // discriminated union and only this member carries `text` optionally.
  const target = messages[idx];
  if (target.kind !== "processing") return messages;
  if (target.text === partial) return messages;

  const next = messages.slice();
  next[idx] = { ...target, text: partial };
  return next;
}
