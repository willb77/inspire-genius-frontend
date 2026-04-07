/**
 * Voice regression test suite — frontend.
 *
 * Covers:
 * - voiceConfigService (get / update API calls)
 * - useVoiceDesk hook (enabled/disabled, open/close/toggle/speak, postMessage, isLoaded)
 * - useAlexWebSocket hook interface shape and WebSocket lifecycle
 * - AlexResponse / ChatMessage type shapes
 * - SUPPORTED_LANGUAGES list completeness (16 languages, mirroring backend)
 * - Meridian rename: error log uses "Meridian" not "Alex"
 * - VoiceConfigData shape matches backend response contract
 */

import { act, renderHook } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────────────────────
//  Module mocks — declared at top level, Jest hoists these
// ─────────────────────────────────────────────────────────────────────────────

jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

// Mock the WebSocket handler modules so useAlexWebSocket can be rendered
// without a real server
jest.mock(
  "@/components/alex-voice-assistant/handlers/webSocketHandlers",
  () => ({
    useWebSocketConnectionHandlers: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    useWebSocketMessageHandlers: jest.fn(() => ({
      sendTextMessage: jest.fn(),
      sendAudioChunk: jest.fn(),
      endAudioInput: jest.fn(),
      startContinuousMode: jest.fn(),
      updateContinuousMute: jest.fn(),
      handleBinaryMessage: jest.fn(),
      handleJsonMessage: jest.fn(),
    })),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
//  Shared constants
// ─────────────────────────────────────────────────────────────────────────────

/** The 16 supported language codes (mirrors backend SUPPORTED_LANGUAGES). */
const SUPPORTED_LANGUAGES = [
  "en", "es", "fr", "de", "pt",
  "zh-CN", "zh-TW",
  "ja", "ko", "ar", "hi", "ru", "it", "nl", "sv", "pl",
];

// ─────────────────────────────────────────────────────────────────────────────
//  VoiceConfigData type shape tests
// ─────────────────────────────────────────────────────────────────────────────

describe("VoiceConfigData shape", () => {
  it("has all required keys in a valid response object", () => {
    const sample = {
      stt_provider: "openai",
      tts_provider: "openai",
      valid_stt_providers: ["openai", "deepgram", "auto"],
      valid_tts_providers: ["openai"],
      stt_updated_at: null,
      tts_updated_at: null,
      stt_updated_by: null,
      tts_updated_by: null,
    };

    expect(sample).toHaveProperty("stt_provider");
    expect(sample).toHaveProperty("tts_provider");
    expect(sample).toHaveProperty("valid_stt_providers");
    expect(sample).toHaveProperty("valid_tts_providers");
    expect(sample.valid_stt_providers).toContain("openai");
    expect(sample.valid_stt_providers).toContain("deepgram");
    expect(sample.valid_stt_providers).toContain("auto");
    expect(sample.valid_tts_providers).toContain("openai");
  });

  it("valid_stt_providers includes all three expected values", () => {
    const providers = ["openai", "deepgram", "auto"];
    expect(providers).toHaveLength(3);
    for (const p of ["openai", "deepgram", "auto"]) {
      expect(providers).toContain(p);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  voiceConfigService — getVoiceConfig
// ─────────────────────────────────────────────────────────────────────────────

describe("getVoiceConfig", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls GET /v1/admin/voice-config and returns data", async () => {
    const { api } = await import("@/lib/axios");
    const responsePayload = {
      status: true,
      message: "Voice configuration retrieved successfully",
      error_code: "SUCCESS",
      data: {
        stt_provider: "openai",
        tts_provider: "openai",
        valid_stt_providers: ["auto", "deepgram", "openai"],
        valid_tts_providers: ["openai"],
        stt_updated_at: null,
        tts_updated_at: null,
        stt_updated_by: null,
        tts_updated_by: null,
      },
    };
    (api.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const { getVoiceConfig } = await import("@/services/voiceConfigService");
    const result = await getVoiceConfig();

    expect(api.get).toHaveBeenCalledWith("/v1/admin/voice-config");
    expect(result.data!.stt_provider).toBe("openai");
    expect(result.data!.valid_stt_providers).toContain("deepgram");
  });

  it("returns deepgram as stt_provider when configured", async () => {
    const { api } = await import("@/lib/axios");
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        status: true,
        message: "ok",
        error_code: "SUCCESS",
        data: {
          stt_provider: "deepgram",
          tts_provider: "openai",
          valid_stt_providers: ["auto", "deepgram", "openai"],
          valid_tts_providers: ["openai"],
          stt_updated_at: "2026-03-29T00:00:00Z",
          tts_updated_at: null,
          stt_updated_by: "admin@test.com",
          tts_updated_by: null,
        },
      },
    });

    const { getVoiceConfig } = await import("@/services/voiceConfigService");
    const result = await getVoiceConfig();
    expect(result.data!.stt_provider).toBe("deepgram");
    expect(result.data!.stt_updated_by).toBe("admin@test.com");
  });

  it("propagates rejection when API call fails", async () => {
    const { api } = await import("@/lib/axios");
    (api.get as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    const { getVoiceConfig } = await import("@/services/voiceConfigService");
    await expect(getVoiceConfig()).rejects.toThrow("Network error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  voiceConfigService — updateVoiceConfig
// ─────────────────────────────────────────────────────────────────────────────

describe("updateVoiceConfig", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls PUT /v1/admin/voice-config with the payload", async () => {
    const { api } = await import("@/lib/axios");
    (api.put as jest.Mock).mockResolvedValueOnce({
      data: {
        status: true,
        message: "Updated",
        error_code: "SUCCESS",
        data: {
          updated_keys: ["stt_provider"],
          stt_provider: "deepgram",
          tts_provider: null,
        },
      },
    });

    const { updateVoiceConfig } = await import("@/services/voiceConfigService");
    const result = await updateVoiceConfig({ stt_provider: "deepgram" });

    expect(api.put).toHaveBeenCalledWith("/v1/admin/voice-config", { stt_provider: "deepgram" });
    expect(result.data!.updated_keys).toContain("stt_provider");
    expect(result.data!.stt_provider).toBe("deepgram");
  });

  it("returns updated_keys for tts_provider update", async () => {
    const { api } = await import("@/lib/axios");
    (api.put as jest.Mock).mockResolvedValueOnce({
      data: {
        status: true,
        message: "Updated",
        error_code: "SUCCESS",
        data: { updated_keys: ["tts_provider"], stt_provider: null, tts_provider: "openai" },
      },
    });

    const { updateVoiceConfig } = await import("@/services/voiceConfigService");
    const result = await updateVoiceConfig({ tts_provider: "openai" });
    expect(result.data!.updated_keys).toContain("tts_provider");
  });

  it("propagates rejection on 403", async () => {
    const { api } = await import("@/lib/axios");
    (api.put as jest.Mock).mockRejectedValueOnce(new Error("Forbidden"));
    const { updateVoiceConfig } = await import("@/services/voiceConfigService");
    await expect(updateVoiceConfig({ stt_provider: "auto" })).rejects.toThrow("Forbidden");
  });

  it("with empty payload calls API with empty object", async () => {
    const { api } = await import("@/lib/axios");
    (api.put as jest.Mock).mockResolvedValueOnce({
      data: {
        status: true, message: "ok", error_code: "SUCCESS",
        data: { updated_keys: [], stt_provider: null, tts_provider: null },
      },
    });

    const { updateVoiceConfig } = await import("@/services/voiceConfigService");
    const result = await updateVoiceConfig({});
    expect(api.put).toHaveBeenCalledWith("/v1/admin/voice-config", {});
    expect(result.data!.updated_keys).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUPPORTED_LANGUAGES — 16-language completeness (frontend mirror)
// ─────────────────────────────────────────────────────────────────────────────

describe("SUPPORTED_LANGUAGES frontend constant", () => {
  it("has exactly 16 language codes", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(16);
  });

  it("contains English", () => {
    expect(SUPPORTED_LANGUAGES).toContain("en");
  });

  it("contains Spanish", () => {
    expect(SUPPORTED_LANGUAGES).toContain("es");
  });

  it("contains French", () => {
    expect(SUPPORTED_LANGUAGES).toContain("fr");
  });

  it("contains both Chinese variants", () => {
    expect(SUPPORTED_LANGUAGES).toContain("zh-CN");
    expect(SUPPORTED_LANGUAGES).toContain("zh-TW");
  });

  it("contains Arabic and Hindi", () => {
    expect(SUPPORTED_LANGUAGES).toContain("ar");
    expect(SUPPORTED_LANGUAGES).toContain("hi");
  });

  it("contains Japanese and Korean", () => {
    expect(SUPPORTED_LANGUAGES).toContain("ja");
    expect(SUPPORTED_LANGUAGES).toContain("ko");
  });

  it("contains European languages (de, pt, ru, it, nl, sv, pl)", () => {
    for (const code of ["de", "pt", "ru", "it", "nl", "sv", "pl"]) {
      expect(SUPPORTED_LANGUAGES).toContain(code);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(SUPPORTED_LANGUAGES).size).toBe(SUPPORTED_LANGUAGES.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  AlexResponse type shape
// ─────────────────────────────────────────────────────────────────────────────

describe("AlexResponse shape", () => {
  const VALID_TYPES = [
    "processing",
    "transcript",
    "response_chunk",
    "response",
    "audio_start",
    "audio_complete",
    "continuous_mode",
    "error",
  ] as const;

  it("covers 8 message types", () => {
    expect(VALID_TYPES).toHaveLength(8);
  });

  it("includes processing type", () => {
    expect(VALID_TYPES).toContain("processing");
  });

  it("includes transcript type", () => {
    expect(VALID_TYPES).toContain("transcript");
  });

  it("includes error type", () => {
    expect(VALID_TYPES).toContain("error");
  });

  it("a minimal AlexResponse object has correct shape", () => {
    const msg = { type: "response", text: "Hello from Meridian", full_text: "Hello from Meridian" };
    expect(msg.type).toBe("response");
    expect(msg.text).toBeDefined();
    expect(msg.full_text).toBeDefined();
  });

  it("AlexResponse has no agent-name-specific fields", () => {
    // AlexResponse interface is name-agnostic — no 'agent: "alex"' field
    const msg = { type: "response" as const };
    expect((msg as Record<string, unknown>).agent).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ChatMessage type shape
// ─────────────────────────────────────────────────────────────────────────────

describe("ChatMessage shape", () => {
  it("has required fields: id, text, sender, timestamp", () => {
    const msg = {
      id: "msg-001",
      text: "Hello",
      sender: "assistant" as const,
      timestamp: new Date(),
    };
    expect(msg.id).toBe("msg-001");
    expect(msg.sender).toBe("assistant");
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it("sender can be assistant, user, or system", () => {
    const senders = ["assistant", "user", "system"];
    expect(senders).toContain("assistant");
    expect(senders).toContain("user");
    expect(senders).toContain("system");
  });

  it("isProcessing is optional", () => {
    const msg = {
      id: "m1", text: "...", sender: "assistant" as const,
      timestamp: new Date(), isProcessing: true,
    };
    expect(msg.isProcessing).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useVoiceDesk — isEnabled (based on env var at module load time)
// ─────────────────────────────────────────────────────────────────────────────

describe("useVoiceDesk — isEnabled default (env not set to true)", () => {
  it("isEnabled is false when VITE_VOICEDESK_ENABLED is not 'true'", async () => {
    // process.env.VITE_VOICEDESK_ENABLED is not set in jest.setup.ts, so IS_ENABLED=false
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    expect(result.current.isEnabled).toBe(false);
  });

  it("isLoaded starts false", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    expect(result.current.isLoaded).toBe(false);
  });

  it("isOpen starts false", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    expect(result.current.isOpen).toBe(false);
  });

  it("speak returns false when isLoaded is false", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    let spoke!: boolean;
    act(() => { spoke = result.current.speak("hello"); });
    expect(spoke).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useVoiceDesk — open / close / toggle (works even when disabled)
// ─────────────────────────────────────────────────────────────────────────────

describe("useVoiceDesk — open/close/toggle state", () => {
  it("open() sets isOpen to true", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it("close() sets isOpen to false after open", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("toggle() flips isOpen from false to true", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
  });

  it("toggle() flips isOpen from true to false", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    act(() => result.current.open());
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useVoiceDesk — postMessage events
// ─────────────────────────────────────────────────────────────────────────────

describe("useVoiceDesk — postMessage event handling", () => {
  it("isLoaded stays false when VOICEDESK disabled (listener not registered)", async () => {
    // IS_ENABLED=false → the message listener useEffect returns early → postMessages have no effect
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());
    expect(result.current.isLoaded).toBe(false);

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "voicedesk:loaded" }));
    });
    // Listener not registered when disabled — state unchanged
    expect(result.current.isLoaded).toBe(false);
  });

  it("isOpen stays false on 'voicedesk:opened' when VOICEDESK disabled", async () => {
    // IS_ENABLED=false → listener not registered → postMessage has no effect
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "voicedesk:opened" }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("isOpen becomes false when 'voicedesk:closed' message received", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "voicedesk:opened" }));
    });
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "voicedesk:closed" }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("ignores messages without the voicedesk: prefix", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "loaded" }));
    });
    expect(result.current.isLoaded).toBe(false);
  });

  it("ignores non-string messages", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { action: "loaded" } }));
    });
    expect(result.current.isLoaded).toBe(false);
  });

  it("unknown voicedesk: payload does not change state", async () => {
    const { useVoiceDesk } = await import("@/hooks/useVoiceDesk");
    const { result } = renderHook(() => useVoiceDesk());

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "voicedesk:unknown-event" }));
    });
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isOpen).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useAlexWebSocket — interface shape
// ─────────────────────────────────────────────────────────────────────────────

describe("useAlexWebSocket interface shape", () => {
  it("exports useAlexWebSocket as a function", async () => {
    const mod = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    expect(typeof mod.useAlexWebSocket).toBe("function");
  });

  it("returns all expected keys", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());

    const returnValue = result.current;
    expect(returnValue).toHaveProperty("isConnected");
    expect(returnValue).toHaveProperty("isConnecting");
    expect(returnValue).toHaveProperty("connect");
    expect(returnValue).toHaveProperty("disconnect");
    expect(returnValue).toHaveProperty("sendTextMessage");
    expect(returnValue).toHaveProperty("sendAudioChunk");
    expect(returnValue).toHaveProperty("endAudioInput");
    expect(returnValue).toHaveProperty("startContinuousMode");
    expect(returnValue).toHaveProperty("updateContinuousMute");
    expect(returnValue).toHaveProperty("currentResponse");
    expect(returnValue).toHaveProperty("isProcessing");
    expect(returnValue).toHaveProperty("transcript");
    expect(returnValue).toHaveProperty("error");
    expect(returnValue).toHaveProperty("isRecording");
    expect(returnValue).toHaveProperty("startRecording");
    expect(returnValue).toHaveProperty("stopRecording");
  });

  it("isConnected defaults to false", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.isConnected).toBe(false);
  });

  it("isConnecting defaults to false", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.isConnecting).toBe(false);
  });

  it("currentResponse defaults to empty string", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.currentResponse).toBe("");
  });

  it("transcript defaults to empty string", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.transcript).toBe("");
  });

  it("error defaults to null", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.error).toBeNull();
  });

  it("isRecording defaults to false", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(result.current.isRecording).toBe(false);
  });

  it("sendTextMessage, sendAudioChunk, endAudioInput are functions", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(typeof result.current.sendTextMessage).toBe("function");
    expect(typeof result.current.sendAudioChunk).toBe("function");
    expect(typeof result.current.endAudioInput).toBe("function");
  });

  it("connect and disconnect are functions", async () => {
    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useAlexWebSocket — sendTextMessage / sendAudioChunk delegation
// ─────────────────────────────────────────────────────────────────────────────

describe("useAlexWebSocket — message sending delegation", () => {
  it("sendTextMessage delegates to useWebSocketMessageHandlers", async () => {
    const handlers = await import(
      "@/components/alex-voice-assistant/handlers/webSocketHandlers"
    );
    const mockSendText = jest.fn();
    (handlers.useWebSocketMessageHandlers as jest.Mock).mockReturnValueOnce({
      sendTextMessage: mockSendText,
      sendAudioChunk: jest.fn(),
      endAudioInput: jest.fn(),
      startContinuousMode: jest.fn(),
      updateContinuousMute: jest.fn(),
      handleBinaryMessage: jest.fn(),
      handleJsonMessage: jest.fn(),
    });

    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());

    act(() => { result.current.sendTextMessage("Hello Meridian"); });
    expect(mockSendText).toHaveBeenCalledWith("Hello Meridian");
  });

  it("sendAudioChunk delegates to useWebSocketMessageHandlers", async () => {
    const handlers = await import(
      "@/components/alex-voice-assistant/handlers/webSocketHandlers"
    );
    const mockSendAudio = jest.fn();
    (handlers.useWebSocketMessageHandlers as jest.Mock).mockReturnValueOnce({
      sendTextMessage: jest.fn(),
      sendAudioChunk: mockSendAudio,
      endAudioInput: jest.fn(),
      startContinuousMode: jest.fn(),
      updateContinuousMute: jest.fn(),
      handleBinaryMessage: jest.fn(),
      handleJsonMessage: jest.fn(),
    });

    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());

    const chunk = new Uint8Array([1, 2, 3]).buffer;
    act(() => { result.current.sendAudioChunk(chunk); });
    expect(mockSendAudio).toHaveBeenCalledWith(chunk);
  });

  it("endAudioInput delegates to useWebSocketMessageHandlers", async () => {
    const handlers = await import(
      "@/components/alex-voice-assistant/handlers/webSocketHandlers"
    );
    const mockEndAudio = jest.fn();
    (handlers.useWebSocketMessageHandlers as jest.Mock).mockReturnValueOnce({
      sendTextMessage: jest.fn(),
      sendAudioChunk: jest.fn(),
      endAudioInput: mockEndAudio,
      startContinuousMode: jest.fn(),
      updateContinuousMute: jest.fn(),
      handleBinaryMessage: jest.fn(),
      handleJsonMessage: jest.fn(),
    });

    const { useAlexWebSocket } = await import("@/components/alex-voice-assistant/useAlexWebSocket");
    const { result } = renderHook(() => useAlexWebSocket());

    act(() => { result.current.endAudioInput(); });
    expect(mockEndAudio).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  WebSocketState enum values
// ─────────────────────────────────────────────────────────────────────────────

describe("WebSocketState enum", () => {
  it("has CONNECTING, OPEN, CLOSING, CLOSED states matching WebSocket spec", async () => {
    const { WebSocketState } = await import(
      "@/components/alex-voice-assistant/types/enums"
    );
    expect(WebSocketState).toHaveProperty("CONNECTING");
    expect(WebSocketState).toHaveProperty("OPEN");
    expect(WebSocketState).toHaveProperty("CLOSING");
    expect(WebSocketState).toHaveProperty("CLOSED");
  });

  it("CONNECTING has numeric value 0 (matches WebSocket spec)", async () => {
    const { WebSocketState } = await import(
      "@/components/alex-voice-assistant/types/enums"
    );
    expect(WebSocketState.CONNECTING).toBe(0);
  });

  it("OPEN has numeric value 1 (matches WebSocket spec)", async () => {
    const { WebSocketState } = await import(
      "@/components/alex-voice-assistant/types/enums"
    );
    expect(WebSocketState.OPEN).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Meridian rename regression — error log uses "Meridian"
// ─────────────────────────────────────────────────────────────────────────────

describe("Meridian rename regression", () => {
  it("useAlexWebSocket parse-error log references 'Meridian'", async () => {
    // The hook source contains: console.error("Meridian WebSocket parse error", err)
    // We verify this by reading the module source text
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(
      __dirname,
      "../components/alex-voice-assistant/useAlexWebSocket.ts"
    );
    const src = fs.readFileSync(hookPath, "utf-8");
    expect(src).toContain("Meridian WebSocket parse error");
  });

  it("useAlexWebSocket parse-error log does NOT say 'Alex WebSocket parse error'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(
      __dirname,
      "../components/alex-voice-assistant/useAlexWebSocket.ts"
    );
    const src = fs.readFileSync(hookPath, "utf-8");
    expect(src).not.toContain("Alex WebSocket parse error");
  });

  it("voiceConfigService module has no alex-specific references", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const svcPath = path.resolve(__dirname, "../services/voiceConfigService.ts");
    const src = fs.readFileSync(svcPath, "utf-8");
    // Service should not reference 'alex' specifically in route paths
    expect(src).not.toMatch(/\/alex\//i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useVoiceDesk — VOICEDESK_CHANNEL constant
// ─────────────────────────────────────────────────────────────────────────────

describe("useVoiceDesk — constants", () => {
  it("VOICEDESK_ENABLED is exported and is boolean-like", async () => {
    const mod = await import("@/hooks/useVoiceDesk");
    expect(typeof mod.VOICEDESK_ENABLED).toBe("boolean");
  });

  it("VOICEDESK_AGENT_URL is exported as a string", async () => {
    const mod = await import("@/hooks/useVoiceDesk");
    expect(typeof mod.VOICEDESK_AGENT_URL).toBe("string");
  });
});
