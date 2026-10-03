/**
 * Pure view rules for the Claude Code console (CC.3), kept out of the
 * component files so each can be tested — and mutation-tested — on its own.
 */
import type { DevConsoleJob, DevConsoleMe } from "@/types/devConsole";

/**
 * The ONE rule that decides whether the Claude Code tab exists: the access
 * probe returned a 200 with `allowed: true`. Anything else — 403, 404 on a
 * tier without the backend, a network failure, no console URL in the build —
 * and the Help & Support page renders exactly as it did before this tab.
 */
export function canSeeDevConsole(me: DevConsoleMe | null | undefined): boolean {
  return me?.allowed === true;
}

/**
 * The outcome note under a settled job. A job whose only outcome is a block
 * ends `complete` with the block visible — never an empty answer.
 */
export function outcomeNote(
  job: DevConsoleJob
): "blockedOnly" | "noAnswer" | "cancelledNote" | null {
  const hasAnswer = job.events.some((e) => e.type === "answer");
  if (hasAnswer) return null;
  if (job.status === "cancelled") return "cancelledNote";
  if (job.status !== "complete") return null;
  return job.events.some((e) => e.type === "blocked") ? "blockedOnly" : "noAnswer";
}

/**
 * Only https GitHub links are rendered as links. The URL comes from the
 * server, already pinned to the commit SHA; anything else is shown as text.
 */
export function safeCitationUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "github.com" ? u.toString() : null;
  } catch {
    return null;
  }
}
