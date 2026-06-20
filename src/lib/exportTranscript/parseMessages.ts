import type { ChatMessage } from "@/types/chat";
import type { TranscriptTurn } from "./types";

// Patterns that indicate conversational scaffolding inside an assistant
// turn — stripped from V2 only. We keep the assistant's substantive
// content intact (§5 rule 1: "noise removed", §10 guardrail: never
// fabricate or summarize).
const NOISE_PATTERNS: RegExp[] = [
  /\b(?:scoring|noting|reflecting)\s+silently[^.!?]*[.!?]/gi,
  /\b(?:moving|transitioning)\s+(?:on|to|now)[^.!?]*[.!?]/gi,
  /\b(?:the\s+floor\s+is\s+yours|take\s+your\s+time)[^.!?]*[.!?]/gi,
  /\bjust\s+(?:a|one)\s+(?:moment|second)[^.!?]*[.!?]/gi,
  /\bhold\s+on\s+(?:a|one)\s+(?:moment|second)[^.!?]*[.!?]/gi,
];

// Light typo cleanup of *user* turns only (§4 rule 5, §5 rule 5). The
// list is intentionally tiny — anything more aggressive starts editing
// substance.
const USER_TYPO_FIXES: Array<[RegExp, string]> = [
  [/\bdong\b/g, "doing"],
  [/\bteh\b/g, "the"],
  [/\brecieve\b/g, "receive"],
  [/\bthier\b/g, "their"],
];

export function cleanUserText(text: string): string {
  let out = text;
  for (const [pat, replacement] of USER_TYPO_FIXES) {
    out = out.replace(pat, replacement);
  }
  return out;
}

export function stripAssistantNoise(text: string): string {
  let out = text;
  for (const pat of NOISE_PATTERNS) {
    out = out.replace(pat, "");
  }
  // Collapse multiple blank lines / runs of spaces left behind.
  return out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

// Convert a ChatMessage[] to TranscriptTurn[]. Skips `processing`
// placeholders + doc-attachment bubbles (we render the chat as
// dialog only; uploaded docs are referenced rather than embedded).
export function parseMessages(messages: ChatMessage[], userLabel = "You"): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  let order = 1;

  for (const m of messages) {
    if (m.kind === "processing") continue;
    if (m.kind === "doc") {
      turns.push({
        order: order++,
        role: m.sender,
        speakerRaw: m.sender === "user" ? userLabel : "Meridian",
        timestamp: m.time,
        body: `Attached document: **${m.docName}** (${m.docKind.toUpperCase()})`,
      });
      continue;
    }
    // kind === "text"
    const bodyRaw = (m.text ?? "").toString();
    if (!bodyRaw.trim()) continue;
    const role = m.sender;
    const speakerRaw =
      role === "user" ? userLabel : (m.agent && m.agent.trim() ? m.agent : "Meridian");
    turns.push({
      order: order++,
      role,
      speakerRaw,
      timestamp: m.time,
      body: bodyRaw,
      contributingAgents: m.contributingAgents,
    });
  }

  return turns;
}
