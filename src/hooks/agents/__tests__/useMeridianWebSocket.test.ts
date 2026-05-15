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

import { getMeridianWebSocketUrl } from "@/services/meridian/meridianService";

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
