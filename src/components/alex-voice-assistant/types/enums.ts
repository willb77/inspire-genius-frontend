export const MessageType = {
  TEXT: "text",
  REALTIME_TEXT: "realtime_text",
  AUDIO_END: "audio_end",
  START_CONTINUOUS: "start_continuous",
  RESPONSE_CHUNK: "response_chunk",
  RESPONSE: "response",
  /** Agent Engine WS proxy sends "complete" with the full response */
  COMPLETE: "complete",
  /** Agent Engine WS proxy sends "connected" with session_id on connect */
  CONNECTED: "connected",
  /** Agent Engine WS proxy acknowledges init messages */
  INIT_SUCCESS: "init_success",
  AUDIO_CHUNK: "audio_chunk",
  AUDIO_START: "audio_start",
  AUDIO_COMPLETE: "audio_complete",
  CONTINUOUS_MODE: "continuous_mode",
  PROCESSING: "processing",
  TRANSCRIPT: "transcript",
  ERROR: "error",
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export const AudioState = {
  RUNNING: "running",
  SUSPENDED: "suspended",
  CLOSED: "closed",
} as const;

export type AudioState = typeof AudioState[keyof typeof AudioState];

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export type WebSocketState = typeof WebSocketState[keyof typeof WebSocketState];
