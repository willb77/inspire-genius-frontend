// Normalized turn used by both the Conversation Log (V1) and the
// Structured Report (V2) renderers. We parse the source `ChatMessage[]`
// into this shape once and consume it twice.

export type TranscriptRole = "user" | "assistant";

export interface TranscriptTurn {
  order: number;
  role: TranscriptRole;
  // Display name as it appeared in the source (e.g. "Maven", "Forge",
  // "Meridian", "You"). Specialist names are preserved here for V1 —
  // V2 collapses them to "Meridian" at render time.
  speakerRaw: string;
  // Optional rendered timestamp ("10:32 AM", "21st Mar 26, 10:32 AM", …).
  timestamp?: string;
  // Body text. May contain inline Markdown — both renderers convert a
  // small subset (headings, lists, blockquotes, fenced code) into house
  // components inline.
  body: string;
  // Tracks which agents contributed to a synthesized Meridian response
  // (for V1 attribution + V2 noise stripping).
  contributingAgents?: string[];
}

export interface TranscriptMeta {
  sessionSubject: string;
  fromLabel: string;
  toLabel: string;
  userLabel: string;
  // Used for filename slugs.
  slug: string;
  // What V2's variant tag should say after the dot (e.g. "Coaching",
  // "Assessment", "Career Strategy"). Defaults to "Coaching".
  assistantDomain?: string;
}

export interface RenderedPdf {
  fileName: string;
  blob: Blob;
}
