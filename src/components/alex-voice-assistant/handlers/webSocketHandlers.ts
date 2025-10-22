import { useCallback, type RefObject } from "react";
import { MessageType, WebSocketState } from "@/components/alex-voice-assistant/types/enums";
import type { AlexResponse } from "@/components/alex-voice-assistant/types/types";

export const useWebSocketConnectionHandlers = (
  socketRef: RefObject<WebSocket | null>,
  websocketUrl: string,
  setIsConnecting: (v: boolean) => void,
  setIsConnected: (v: boolean) => void,
  setError: (v: string | null) => void,
  reconnectTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>,
  reconnectAttempts: RefObject<number>,
  maxReconnectAttempts: number,
  onOpen?: () => void,
  onClose?: () => void,
  onMessage?: (ev: MessageEvent) => void
) => {
  const connect = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocketState.OPEN ||
        socketRef.current.readyState === WebSocketState.CONNECTING)
    )
      return;

    try {
      setIsConnecting(true);
      socketRef.current = new WebSocket(websocketUrl);
      // prefer arraybuffer for binary audio for simpler handling
      socketRef.current.binaryType = "arraybuffer";
      if (onMessage) socketRef.current.onmessage = onMessage;

      socketRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        if (onMessage && socketRef.current) socketRef.current.onmessage = onMessage;
        onOpen?.();
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        } else {
          setError("Failed to connect to Alex after multiple attempts");
        }
        onClose?.();
      };
    } catch{
      setIsConnecting(false);
      setError("Failed to connect to Alex");
    }
  }, [socketRef, websocketUrl, setIsConnecting, setIsConnected, setError, reconnectTimeoutRef, reconnectAttempts, maxReconnectAttempts, onOpen, onClose, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, [socketRef, reconnectTimeoutRef, setIsConnected, setIsConnecting]);

  return { connect, disconnect };
};

export const useWebSocketMessageHandlers = (
  socketRef: RefObject<WebSocket | null>,
  setError: (v: string | null) => void,
  setCurrentResponse: (v: string) => void,
  setTranscript: (v: string) => void,
  setIsProcessing: (v: boolean) => void,
  onResponse?: (response: AlexResponse) => void,
  onAudioData?: (data: ArrayBuffer) => void
) => {
  const sendTextMessage = useCallback(
    (text: string, isRealtime = false) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocketState.OPEN) {
        setError("Not connected to Alex");
        return;
      }
      const message = { type: isRealtime ? MessageType.REALTIME_TEXT : MessageType.TEXT, text };
      try {
        socketRef.current.send(JSON.stringify(message));
        setCurrentResponse("");
        setTranscript("");
        setError(null);
      } catch {
        setError("Failed to send message");
      }
    },
    [socketRef, setError, setCurrentResponse, setTranscript]
  );

  const sendAudioChunk = useCallback(
    (audioData: ArrayBuffer | Blob) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocketState.OPEN) {
        setError("Not connected to Alex");
        return;
      }
      try {
        socketRef.current.send(audioData);
      } catch {
        setError("Failed to send audio");
      }
    },
    [socketRef, setError]
  );

  const endAudioInput = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocketState.OPEN) return;
    const message = { type: MessageType.AUDIO_END };
    try {
      socketRef.current.send(JSON.stringify(message));
    } catch {
      setError("Failed to end audio input");
    }
  }, [socketRef, setError]);

  const startContinuousMode = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocketState.OPEN) return;
    const message = { type: MessageType.START_CONTINUOUS };
    try {
      socketRef.current.send(JSON.stringify(message));
    } catch {
      setError("Failed to start continuous mode");
    }
  }, [socketRef, setError]);

  const handleBinaryMessage = useCallback(
    (data: ArrayBuffer | Blob) => {
      if (!onAudioData) return;
      if (data instanceof Blob) {
        data.arrayBuffer().then((buf) => onAudioData(buf));
      } else {
        onAudioData(data);
      }
    },
    [onAudioData]
  );

  const handleJsonMessage = useCallback(
    (response: AlexResponse) => {
      switch (response.type) {
        case MessageType.PROCESSING:
          setIsProcessing(true);
          setError(null);
          break;
        case MessageType.TRANSCRIPT:
          if (response.text) setTranscript(response.text);
          setIsProcessing(false);
          onResponse?.(response);
          break;
        case MessageType.RESPONSE_CHUNK: {
          const newText = response.full_text ?? response.text ?? "";
          if (newText) setCurrentResponse(newText);
          setIsProcessing(false);
          onResponse?.(response);
          break;
        }
        case MessageType.RESPONSE:
          if (response.text) setCurrentResponse(response.text);
          setIsProcessing(false);
          onResponse?.(response);
          break;
        case MessageType.AUDIO_START:
          onResponse?.(response);
          break;
        case MessageType.AUDIO_COMPLETE:
          onResponse?.(response);
          break;
        case MessageType.ERROR:
          setError(response.message ?? "Unknown error");
          setIsProcessing(false);
          onResponse?.(response);
          break;
        default:
          onResponse?.(response);
      }
    },
    [setIsProcessing, setError, setTranscript, setCurrentResponse, onResponse]
  );

  return {
    sendTextMessage,
    sendAudioChunk,
    endAudioInput,
    startContinuousMode,
    handleBinaryMessage,
    handleJsonMessage,
  };
};
