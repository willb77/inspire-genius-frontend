export interface AlexResponse {
  type:
    | "processing"
    | "transcript"
    | "response_chunk"
    | "response"
    | "audio_start"
    | "audio_complete"
    | "continuous_mode"
    | "error";
  text?: string;
  full_text?: string;
  message?: string;
  format?: string;
  status?: string;
}

export type ChatMessage = {
  id: string;
  text: string;
  sender: "assistant" | "user" | "system";
  timestamp: Date;
  isProcessing?: boolean;
  type?: "processing";
};
