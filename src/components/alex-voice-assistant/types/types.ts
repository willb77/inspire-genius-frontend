export interface AlexResponse {
  type:
    | "processing"
    | "transcript"
    | "response_chunk"
    | "response"
    | "complete"
    | "connected"
    | "init_success"
    | "audio_start"
    | "audio_complete"
    | "continuous_mode"
    | "error";
  text?: string;
  full_text?: string;
  /** Used by Agent Engine WS proxy "complete" messages */
  content?: string;
  /** Agent name from Agent Engine responses */
  agent?: string;
  /** Session ID from "connected" and "complete" messages */
  session_id?: string;
  message?: string;
  format?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export type ChatMessage = {
  id: string;
  text: string;
  sender: "assistant" | "user" | "system";
  timestamp: Date;
  isProcessing?: boolean;
  type?: "processing";
};
