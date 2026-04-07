/**
 * VoiceChat — Real-time voice conversation with Alex.
 *
 * Uses MediaRecorder for capture, AudioContext for playback + waveform,
 * WebSocket for streaming PCM 16kHz audio to the Agent Engine.
 *
 * TTS strategy (via useTTS):
 *   - Online:  server OpenAI TTS via /v1/audio/tts (high quality)
 *   - Offline: browser SpeechSynthesis API (PWA fallback)
 *   An "Offline TTS" badge is shown when the browser engine is active
 *   so users know voice quality may differ.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTTS } from "@/hooks/useTTS";

// ─── Types ──────────────────────────────────────────────────────

type VoiceState = "idle" | "connecting" | "listening" | "processing" | "speaking";

type VoiceMessage = {
  type: "voice_ready" | "voice_speech_start" | "voice_speech_end"
    | "voice_transcript_partial" | "voice_transcript_final"
    | "voice_response_text" | "voice_audio_start" | "voice_audio_chunk"
    | "voice_audio_complete" | "voice_interrupt" | "voice_crosstalk"
    | "voice_ended" | "voice_config_updated" | "connected" | "error";
  text?: string;
  content?: string;
  confidence?: number;
  agent?: string;
  session_id?: string;
  message?: string;
  language?: string;
  voice_id?: string;
  format?: string;
  size?: number;
  is_last?: boolean;
};

type VoiceChatProps = {
  wsUrl?: string;
  accessToken?: string;
  language?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string, agent: string) => void;
  className?: string;
};

// ─── Constants ──────────────────────────────────────────────────

const SAMPLE_RATE = 16000;
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 60;

// ─── Component ──────────────────────────────────────────────────

export function VoiceChat({
  wsUrl,
  accessToken = "",
  language = "en-US",
  onTranscript,
  onResponse,
  className,
}: VoiceChatProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Unified TTS — server when online, browser SpeechSynthesis offline
  const tts = useTTS({ language });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ─── WebSocket ──────────────────────────────────────────────

  const connect = useCallback(() => {
    const url = wsUrl || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/chat`;
    const fullUrl = `${url}?access-token=${encodeURIComponent(accessToken)}`;

    setState("connecting");
    setError(null);

    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Wait for "connected" message before starting voice
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg: VoiceMessage = JSON.parse(event.data);
        handleMessage(msg);
      }
      // Binary data = audio playback (future: decode and play)
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setState("idle");
    };

    ws.onclose = () => {
      setState("idle");
      cleanup();
    };
  }, [wsUrl, accessToken]);

  const handleMessage = useCallback((msg: VoiceMessage) => {
    switch (msg.type) {
      case "connected":
        // Start voice session
        wsRef.current?.send(JSON.stringify({
          type: "voice_start",
          language,
          sample_rate: SAMPLE_RATE,
        }));
        break;

      case "voice_ready":
        setState("listening");
        startCapture();
        break;

      case "voice_speech_start":
        setState("listening");
        break;

      case "voice_speech_end":
        setState("processing");
        break;

      case "voice_transcript_partial":
        setTranscript(msg.text || "");
        onTranscript?.(msg.text || "", false);
        break;

      case "voice_transcript_final":
        setTranscript(msg.text || "");
        onTranscript?.(msg.text || "", true);
        break;

      case "voice_response_text": {
        const content = msg.content || "";
        setResponseText(content);
        onResponse?.(content, msg.agent || "Alex");
        // Speak text if server is not sending an audio stream (offline / text-only mode)
        if (!tts.isOnline) {
          tts.speak(content);
        }
        break;
      }

      case "voice_audio_start":
        // Server is streaming audio — stop any in-progress browser TTS
        tts.stop();
        setState("speaking");
        break;

      case "voice_audio_complete":
        setState("listening");
        break;

      case "voice_interrupt":
        setState("listening");
        break;

      case "voice_ended":
        setState("idle");
        break;

      case "error":
        setError(msg.message || "Unknown error");
        break;
    }
  }, [language, onTranscript, onResponse, tts]);

  // ─── Audio Capture ──────────────────────────────────────────

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // ScriptProcessor for raw PCM access
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const input = e.inputBuffer.getChannelData(0);
        // Convert float32 → int16 PCM
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        wsRef.current.send(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Start waveform visualization
      drawWaveform();
    } catch (err) {
      setError("Microphone access denied");
      setState("idle");
    }
  }, [isMuted]);

  // ─── Waveform Visualization ─────────────────────────────────

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(15, 23, 42)"; // slate-900
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.lineWidth = 2;
      ctx.strokeStyle = state === "speaking"
        ? "rgb(34, 197, 94)"    // green-500
        : state === "listening"
        ? "rgb(59, 130, 246)"   // blue-500
        : "rgb(100, 116, 139)"; // slate-500

      ctx.beginPath();
      const sliceWidth = CANVAS_WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * CANVAS_HEIGHT) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.stroke();
    };

    draw();
  }, [state]);

  // ─── Controls ───────────────────────────────────────────────

  const startCall = useCallback(() => {
    connect();
  }, [connect]);

  const endCall = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "voice_stop" }));
    }
    tts.stop();
    cleanup();
    setState("idle");
  }, [tts]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ─── Cleanup ────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();

    processorRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    analyserRef.current = null;
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ─── Render ─────────────────────────────────────────────────

  const isActive = state !== "idle" && state !== "connecting";

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4", className)}>
      {/* Waveform */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-lg border border-slate-700"
      />

      {/* Offline TTS indicator */}
      {tts.activeProvider === "browser" && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-500 text-xs">
            <WifiOff className="h-3 w-3" />
            Offline TTS
          </Badge>
          <span className="text-xs text-slate-500">Voice quality may differ</span>
        </div>
      )}

      {/* Status */}
      <div className="text-sm text-slate-400">
        {state === "idle" && "Ready to talk"}
        {state === "connecting" && "Connecting..."}
        {state === "listening" && "Listening..."}
        {state === "processing" && "Processing..."}
        {state === "speaking" && "Meridian is speaking"}
        {state !== "speaking" && tts.speaking && " (speaking via device)"}
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="max-w-md rounded-lg bg-slate-800 p-3 text-sm text-slate-200">
          <span className="text-xs font-medium text-slate-400">You: </span>
          {transcript}
        </div>
      )}

      {/* Response */}
      {responseText && (
        <div className="max-w-md rounded-lg bg-blue-900/30 p-3 text-sm text-blue-100">
          <span className="text-xs font-medium text-blue-400">Alex: </span>
          {responseText}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isActive ? (
          <Button
            onClick={startCall}
            disabled={state === "connecting"}
            className="rounded-full bg-green-600 p-4 hover:bg-green-700"
          >
            <Phone className="h-6 w-6" />
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              variant="outline"
              className="rounded-full p-3"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              onClick={endCall}
              className="rounded-full bg-red-600 p-4 hover:bg-red-700"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default VoiceChat;
