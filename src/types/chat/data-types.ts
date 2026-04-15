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

// Chat message types
export type ChatMessage =
  | {
      id: string;
      kind: "text";
      sender: "assistant" | "user";
      text: string;
      time: string;
      agent?: string;
      domain?: string;
    }
  | {
      id: string;
      kind: "doc";
      sender: "assistant" | "user";
      docName: string;
      docKind: DocKind;
      time: string;
    }
  | {
      id: string;
      kind: "processing";
      sender: "assistant";
      time: string;
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

