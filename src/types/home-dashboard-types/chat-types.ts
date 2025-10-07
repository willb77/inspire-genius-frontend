// Chat related types
// These are for components inside the src/components/user/chat folder

// Document types (used across multiple chat components)
export type DocKind = "pdf" | "csv" | "ppt" | "doc";

export type SimpleDoc = { 
  name: string; 
  kind: DocKind;
};

export type DocumentRef = { 
  name: string; 
  kind: DocKind; 
  url?: string;
};

// Chat message types (from ChatWindow.tsx)
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

// ChatWindow component props (from src/components/user/chat/ChatWindow.tsx)
export interface ChatWindowProps {
  coachName: string;
  className?: string;
  onBack?: () => void;
}

// ChatHistory component types (from src/components/user/chat/ChatHistory.tsx)
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

export interface ChatHistoryProps {
  groups: HistoryGroup[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

// DocumentsPanel component props (from src/components/user/chat/DocumentsPanel.tsx)
export interface DocumentsPanelProps {
  onImportToChat: (items: SimpleDoc[]) => void;
  onPreview?: (item: DocumentRef) => void;
}

// ExportChatModal component props (from src/components/user/chat/ExportChatModal.tsx)
export interface ExportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// DocumentViewerModal component props (from src/components/user/chat/DocumentViewerModal.tsx)
export interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName?: string;
  onDelete?: () => void;
  onDownload?: () => void;
}
