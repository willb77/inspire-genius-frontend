/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  attachInterceptors: jest.fn(),
}));

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
  attachInterceptors: jest.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { getMeridianWebSocketUrl } from "@/services/meridian/meridianService";
import { useMeridianWebSocket } from "../useMeridianWebSocket";

/* ---- Tests for getMeridianWebSocketUrl ---- */

describe("getMeridianWebSocketUrl", () => {
  const originalAgentUrl = process.env.VITE_AGENT_ENGINE_URL;
  const originalApiUrl = process.env.VITE_API_BASE_URL;

  afterEach(() => {
    // Restore original env
    if (originalAgentUrl !== undefined) {
      process.env.VITE_AGENT_ENGINE_URL = originalAgentUrl;
    } else {
      delete process.env.VITE_AGENT_ENGINE_URL;
    }
    if (originalApiUrl !== undefined) {
      process.env.VITE_API_BASE_URL = originalApiUrl;
    } else {
      delete process.env.VITE_API_BASE_URL;
    }
  });

  it("builds correct WebSocket URL with access token", () => {
    process.env.VITE_AGENT_ENGINE_URL = "https://agent.example.com";

    const url = getMeridianWebSocketUrl("test-token-123");
    expect(url).toContain("wss://");
    expect(url).toContain("/ws/chat");
    expect(url).toContain("access-token=test-token-123");
  });

  it("replaces http with ws in the base URL", () => {
    process.env.VITE_AGENT_ENGINE_URL = "http://localhost:8001";

    const url = getMeridianWebSocketUrl("tok");
    expect(url).toMatch(/^ws:\/\/localhost:8001/);
  });

  it("replaces https with wss in the base URL", () => {
    process.env.VITE_AGENT_ENGINE_URL = "https://agent.example.com";

    const url = getMeridianWebSocketUrl("tok");
    expect(url).toMatch(/^wss:\/\/agent\.example\.com/);
  });

  it("encodes special characters in access token", () => {
    process.env.VITE_AGENT_ENGINE_URL = "https://agent.example.com";

    const url = getMeridianWebSocketUrl("token with spaces&special=chars");
    expect(url).toContain("access-token=token%20with%20spaces%26special%3Dchars");
  });

  it("falls back to VITE_API_BASE_URL when VITE_AGENT_ENGINE_URL is missing", () => {
    delete process.env.VITE_AGENT_ENGINE_URL;
    process.env.VITE_API_BASE_URL = "https://api.example.com";

    const url = getMeridianWebSocketUrl("tok");
    expect(url).toMatch(/^wss:\/\/api\.example\.com/);
    expect(url).toContain("/ws/chat");
  });

  it("falls back to localhost:3000 when no env vars are set", () => {
    delete process.env.VITE_AGENT_ENGINE_URL;
    delete process.env.VITE_API_BASE_URL;

    const url = getMeridianWebSocketUrl("tok");
    expect(url).toMatch(/^ws:\/\/localhost:3000/);
    expect(url).toContain("/ws/chat");
  });
});

/* ---- Tests for MeridianResponse type contract ---- */

describe("MeridianResponse type shape", () => {
  // Import the type to ensure it compiles correctly
  // (TypeScript will fail the build if the type is wrong)
  it("should accept valid MeridianResponse-shaped objects", () => {
    // This is a compile-time check — if the type is wrong, ts-jest fails.
    type MeridianResponse = import("../useMeridianWebSocket").MeridianResponse;

    const connected: MeridianResponse = { type: "connected", session_id: "s1" };
    const token: MeridianResponse = { type: "token", content: "Hello", agent: "ascend" };
    const complete: MeridianResponse = {
      type: "complete",
      content: "Full response",
      agent: "prism",
      metadata: { domain: "coaching", latency_ms: 150 },
    };
    const error: MeridianResponse = { type: "error", message: "Something went wrong" };

    // Verify the objects are valid (runtime sanity check)
    expect(connected.type).toBe("connected");
    expect(token.type).toBe("token");
    expect(complete.type).toBe("complete");
    expect(error.type).toBe("error");
  });

  it("should export UseMeridianWebSocketReturn with expected keys", () => {
    type Return = import("../useMeridianWebSocket").UseMeridianWebSocketReturn;

    // Compile-time check: assert the shape has all expected fields.
    // If a field is missing from the type, this block won't compile.
    const dummy: Return = {
      isConnected: false,
      isConnecting: false,
      isProcessing: false,
      error: null,
      serverSessionId: null,
      currentAgent: null,
      currentDomain: null,
      currentResponse: "",
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendMessage: jest.fn(),
      startVoice: jest.fn(),
      stopVoice: jest.fn(),
      sendAudioChunk: jest.fn(),
      isRecording: false,
      startRecording: jest.fn() as unknown as () => Promise<void>,
      stopRecording: jest.fn(),
    };

    expect(typeof dummy.connect).toBe("function");
    expect(typeof dummy.disconnect).toBe("function");
    expect(typeof dummy.sendMessage).toBe("function");
    expect(typeof dummy.startRecording).toBe("function");
    expect(typeof dummy.stopRecording).toBe("function");
    expect(typeof dummy.isConnected).toBe("boolean");
    expect(typeof dummy.isRecording).toBe("boolean");
  });
});

/* ---- sendMessage routes through socket.send, not axios ---- */

type WsSent = string | ArrayBuffer | Blob;

class MockWebSocket {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;
  public static readonly instances: MockWebSocket[] = [];

  public url: string;
  public readyState: number = MockWebSocket.CONNECTING;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private sentMessages: WsSent[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 5);
  }

  send(data: WsSent) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  getSentMessages() {
    return this.sentMessages;
  }

  static latest(): MockWebSocket | undefined {
    return this.instances[this.instances.length - 1];
  }

  static reset() {
    this.instances.length = 0;
  }
}

describe("useMeridianWebSocket.sendMessage", () => {
  beforeEach(() => {
    MockWebSocket.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.WebSocket = MockWebSocket as any;
    jest.clearAllMocks();
  });

  it("sends a chat frame through socket.send (not axios) when connected", async () => {
    const { result } = renderHook(() => useMeridianWebSocket({}));

    act(() => {
      result.current.connect("tok-abc");
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage(
        "Linda Schulte 5-person PRISM query",
        { conversation_id: "conv-xyz" },
        ["doc-1"],
      );
    });

    const ws = MockWebSocket.latest();
    expect(ws).toBeDefined();
    const sent = ws!.getSentMessages();
    const chat = sent
      .filter((m): m is string => typeof m === "string")
      .map((m) => JSON.parse(m))
      .find((m) => m.type === "chat");

    expect(chat).toBeDefined();
    expect(chat.message).toBe("Linda Schulte 5-person PRISM query");
    expect(chat.context).toEqual({ conversation_id: "conv-xyz" });
    expect(chat.file_ids).toEqual(["doc-1"]);

    // Regression guard for the 2026-05-18 API GW 30s integration-cap
    // outage: text chat must never hit the REST endpoint.
    const { agentApi } = jest.requireMock("@/lib/agentApi") as {
      agentApi: { post: jest.Mock };
    };
    expect(agentApi.post).not.toHaveBeenCalled();
  });

  it("forwards {voice: true} on the chat frame when options.voice is set (D1-A, PR α from #316)", async () => {
    const { result } = renderHook(() => useMeridianWebSocket({}));

    act(() => {
      result.current.connect("tok-voice");
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage(
        "Spoken transcript from SpeechRecognition",
        { conversation_id: "conv-voice" },
        undefined,
        { voice: true, gender: "female", accent: "us" },
      );
    });

    const ws = MockWebSocket.latest();
    const chat = ws!
      .getSentMessages()
      .filter((m): m is string => typeof m === "string")
      .map((m) => JSON.parse(m))
      .find((m) => m.type === "chat");

    expect(chat).toBeDefined();
    expect(chat.voice).toBe(true);
    // gender/accent fold into context so app/websocket/handlers.py:270-271
    // can pull them via extra_context.get(...) when constructing the
    // SentenceAccumulator's OpenAI voice id.
    expect(chat.context).toMatchObject({
      conversation_id: "conv-voice",
      gender: "female",
      accent: "us",
    });
  });

  it("omits the voice flag when options.voice is not set (text-only path unchanged)", async () => {
    const { result } = renderHook(() => useMeridianWebSocket({}));

    act(() => {
      result.current.connect("tok-text");
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage("Plain text query", { conversation_id: "conv-t" }, undefined);
    });

    const ws = MockWebSocket.latest();
    const chat = ws!
      .getSentMessages()
      .filter((m): m is string => typeof m === "string")
      .map((m) => JSON.parse(m))
      .find((m) => m.type === "chat");

    expect(chat).toBeDefined();
    expect(chat.voice).toBeUndefined();
  });

  it("drops sendMessage silently when the socket is not open (caller queues + reconnects)", () => {
    const { result } = renderHook(() => useMeridianWebSocket({}));

    // Without calling connect(), the internal socketRef is null →
    // safeSend short-circuits. The component-level queue + (re)connect
    // logic (MeridianChat) is what actually retries.
    act(() => {
      result.current.sendMessage("Should not be sent", undefined, []);
    });

    const { agentApi } = jest.requireMock("@/lib/agentApi") as {
      agentApi: { post: jest.Mock };
    };
    expect(agentApi.post).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(0);
  });
});
