// Chat components props types

import type { SimpleDoc, DocumentRef, HistoryGroup } from "./data-types";

// ChatWindow component props
export interface ChatWindowProps {
  coachName: string;
  className?: string;
  onBack?: () => void;
  onSendText?: (text: string) => void;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  onDocumentsSelectionChange?: (ids: string[]) => void;
  hasAudio?: boolean;
  isAudioPaused?: boolean;
  onToggleAudioPlayback?: () => void;
}

// ChatHistory component props
export interface ChatHistoryProps {
  groups: HistoryGroup[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

// DocumentsPanel component props
export interface DocumentsPanelProps {
  onImportToChat: (items: SimpleDoc[]) => void;
  onPreview?: (item: DocumentRef) => void;
  onSelectionChange?: (ids: string[]) => void;
}

// ExportChatModal component props
export interface ExportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// DocumentViewerModal component props
export interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName?: string;
  onDelete?: () => void;
  onDownload?: () => void;
}

