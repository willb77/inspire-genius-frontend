import { useState, useEffect, useRef, useCallback } from "react";
import type { AlexResponse } from "@/components/alex-voice-assistant/types/types";
import { WebSocketState } from "@/components/alex-voice-assistant/types/enums";
import { useWebSocketConnectionHandlers, useWebSocketMessageHandlers } from "@/components/alex-voice-assistant/handlers/webSocketHandlers";

export interface UseAlexWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  sendTextMessage: (text: string, isRealtime?: boolean) => void;
  sendAudioChunk: (audioData: ArrayBuffer | Blob) => void;
  endAudioInput: () => void;
  startContinuousMode: () => void;
  updateContinuousMute: (mute: boolean) => void;
  currentResponse: string;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export const useAlexWebSocket = (
  onResponse?: (response: AlexResponse) => void,
  onAudioData?: (audioData: ArrayBuffer) => void
): UseAlexWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const websocketUrl = (import.meta.env.VITE_ALEX_WEB_SOCKET_URL as string) || "";

  const { sendTextMessage, sendAudioChunk, endAudioInput, startContinuousMode, updateContinuousMute, handleBinaryMessage, handleJsonMessage } =
    useWebSocketMessageHandlers(
      socketRef,
      setError,
      setCurrentResponse,
      setTranscript,
      setIsProcessing,
      onResponse,
      onAudioData
    );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        handleBinaryMessage(event.data);
        return;
      }
      try {
        const response: AlexResponse = JSON.parse(event.data);
        handleJsonMessage(response);
      } catch (err) {
        console.error("Alex WebSocket parse error", err);
        setError("Failed to parse server response");
      }
    },
    [handleBinaryMessage, handleJsonMessage]
  );

  const { connect: connectBase, disconnect } = useWebSocketConnectionHandlers(
    socketRef,
    websocketUrl,
    setIsConnecting,
    setIsConnected,
    setError,
    reconnectTimeoutRef,
    reconnectAttempts,
    maxReconnectAttempts,
    undefined,
    undefined,
    handleMessage
  );

  const connect = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocketState.OPEN ||
        socketRef.current.readyState === WebSocketState.CONNECTING)
    ) {
      return;
    }
    connectBase();
  }, [connectBase]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        sendAudioChunk(e.data);
      };
      mr.onstart = () => setIsRecording(true);
      mr.onstop = () => {
        setIsRecording(false);
        endAudioInput();
      };
      const timeslice = 250;
      mr.start(timeslice);
    } catch {
      setError('Microphone access denied');
    }
  }, [isRecording, sendAudioChunk, endAudioInput, setError]);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } finally {
      mediaRecorderRef.current = null;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [disconnect, stopRecording]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendTextMessage,
    sendAudioChunk,
    endAudioInput,
    startContinuousMode,
    updateContinuousMute,
    currentResponse,
    isProcessing,
    transcript,
    error,
    isRecording,
    startRecording,
    stopRecording,
  };
};
