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
      direction: "in" | "out";
      text: string;
      time: string;
    }
  | {
      id: string;
      kind: "doc";
      direction: "in" | "out";
      docName: string;
      docKind: DocKind;
      time: string;
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

