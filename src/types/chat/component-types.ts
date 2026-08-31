// Chat components props types

import type { SimpleDoc, DocumentRef, HistoryGroup, ChatMessage, DocKind } from "./data-types";

// ChatWindow component props
export interface ChatWindowProps {
  coachName: string;
  coachId?: string;
  conversationId?: string;
  className?: string;
  onBack?: () => void;
  /**
   * `text` is what gets sent to the model. `displayText`, when supplied, is
   * what the user's own message bubble shows instead — for callers that wrap
   * the question in machine-generated scaffolding (e.g. Lumen appends a
   * "sources in scope" line) and shouldn't have that rendered as if the user
   * had typed it.
   */
  onSendText?: (text: string, displayText?: string) => void;
  /**
   * When set, the composer is prefilled with this text and submitted once on
   * mount (used by starter questions / the HomeV2 ask box to open the chat on a
   * live response). Fires a single time per mount.
   */
  autoSendText?: string;
  /** Display-only counterpart to `autoSendText` — see `onSendText`. */
  autoSendDisplayText?: string;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  onDocumentsSelectionChange?: (ids: string[]) => void;
  hasAudio?: boolean;
  isAudioPaused?: boolean;
  onToggleAudioPlayback?: () => void;
  // Mute control
  isMuted?: boolean;
  onToggleMute?: (next: boolean) => void;
  messages?: ChatMessage[]; // external conversation, used for logging for now
  isConnecting?: boolean;
  statusBanner?: { type: "success" | "error" | "info"; text: string };
  setMessages?: (value: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  convIsLoading?: boolean;
  convIsFetchingNext?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onExportChat?: (from: Date, to: Date) => Promise<void> | void;
  // Controlled documents props
  selectedFileIds?: string[];
  selectedDocNames?: string[];
  docSections?: Array<{ title: string; items: Array<{ id: string; name: string; kind: DocKind; url?: string; tempUrl?: string }> }>;
  docIsLoading?: boolean;
  onToggleDocSelect?: (id: string) => void;
  docOnDelete?: (id: string) => void;
  docOnDownload?: (id: string) => void;
  // Completed assistant audio playback
  audioPlayerBuffer?: AudioBuffer | null;
  onCloseAudioPlayer?: () => void;
  setShowAudioPlayer?: (open: boolean) => void;
  showAudioPlayer?: boolean;
  // Replay voice for a specific assistant message (TTS at queue tail).
  onReplayMessage?: (text: string) => void;
  /**
   * Export a single turn as Word or PDF, from the "Export ▾" link in that
   * turn's action row. Omitted → the link is not rendered, so every existing
   * consumer is unchanged.
   */
  onExportMessage?: (message: ChatMessage, format: "word" | "pdf") => void;
  /**
   * When true, render the new (HomeV2) two-tile layout: a "Compose Prompt"
   * card on top and a full-height, scrollable "Conversation" card below it —
   * instead of the classic single card with the composer pinned to the bottom.
   * Additive and default-off: every existing consumer keeps the classic layout
   * byte-for-byte. Used by MeridianChatV2 (flag-gated new user surface).
   */
  stacked?: boolean;
}

// ChatHistory component props
export interface ChatHistoryProps {
  groups: HistoryGroup[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  hasConversations?: boolean;
  onCreateNewConversation?: () => void;
  statusText?: string;
  isLoading?: boolean;
  // When true and groups are empty, surface an error state instead of empty.
  // Distinguishes "backend failed to load history" from "user has no conversations".
  isError?: boolean;
  errorMessage?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

// DocumentsPanel component props
export interface DocumentsPanelProps {
  onImportToChat: (items: SimpleDoc[]) => void;
  onPreview?: (item: DocumentRef) => void;
  onSelectionChange?: (ids: string[]) => void;
  // Controlled mode
  sections?: Array<{ title: string; items: Array<{ id: string; name: string; kind: DocKind; url?: string; tempUrl?: string }> }>;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  setupUploadOpen?: (open: boolean) => void;
}

// ExportChatModal component props
export interface ExportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (from: Date, to: Date) => Promise<void> | void;
  disableExport?: boolean;
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

