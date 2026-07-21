// Chat components data types

// Document types used in chat
export type DocKind = "pdf" | "csv" | "ppt" | "doc";

export interface SimpleDoc {
  name: string;
  kind: DocKind;
}

export interface DocumentRef {
  name: string;
  kind: DocKind;
  url?: string;
}

// A file the assistant generated this turn (e.g. a branded Word/PDF/PowerPoint
// document from the IG Core document-generation skill). Carries a presigned,
// time-limited download URL. Shaped to match the backend `attachments` entry
// on the chat response (also present under `metadata.attachments`).
export interface ChatAttachment {
  kind: string; // e.g. "document"
  filename: string;
  url: string; // presigned download URL (expires — see expires_in)
  format?: string; // docx | pdf | pptx | xlsx | csv | md | html | txt
  content_type?: string;
  size_bytes?: number;
  expires_in?: number; // seconds the URL stays valid
}

// RAG source attribution
export interface RAGSource {
  filename: string;
  similarity: number;
  // Server-side document id (UUID). Used to dedupe Sources when two
  // tenants happen to have files with the same name (defense in depth
  // — the backend already filters by user_id at the WHERE clause), and
  // to underpin a future "click through to source" UX.
  document_id?: string | null;
}

// Chat message types
export type ChatMessage =
  | {
      id: string;
      kind: "text";
      sender: "assistant" | "user";
      text: string;
      time: string;
      ts?: number;
      agent?: string;
      domain?: string;
      ragSources?: RAGSource[];
      contributingAgents?: string[];
      synthesized?: boolean;
      attachments?: ChatAttachment[];
    }
  | {
      id: string;
      kind: "doc";
      sender: "assistant" | "user";
      docName: string;
      docKind: DocKind;
      time: string;
      ts?: number;
    }
  | {
      id: string;
      kind: "processing";
      sender: "assistant";
      time: string;
      ts?: number;
      // for compatibility with Alex style flags
      isProcessing?: true;
      type?: "processing";
      text?: string;
    };

// Chat history types
export interface HistoryItem {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
}

export interface HistoryGroup {
  label: string;
  items: HistoryItem[];
}

