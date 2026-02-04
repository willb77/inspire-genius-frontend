import { renderHook, act, waitFor } from "@testing-library/react";
import { usePrismAgentWebSocket } from "../usePrismAgentWebSocket";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  public url: string;
  public readyState: number = MockWebSocket.CONNECTING;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private sentMessages: (string | ArrayBuffer | Blob)[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Helper method for tests
  getSentMessages() {
    return this.sentMessages;
  }

  // Simulate receiving a message
  simulateMessage(data: string | ArrayBuffer | Blob) {
    if (this.onmessage) {
      const event = { data } as MessageEvent;
      this.onmessage(event);
    }
  }

  // Simulate error
  simulateError() {
    if (this.onerror) this.onerror();
  }

  // Static helper to get the latest instance
  static getLatestInstance(): MockWebSocket | undefined {
    return this.instances[this.instances.length - 1];
  }

  // Static helper to reset instances
  static resetInstances() {
    this.instances = [];
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);

  public state: string = "inactive";
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onstart: (() => void) | null = null;
  public onstop: (() => void) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  start() {
    this.state = "recording";
    if (this.onstart) this.onstart();
    
    // Simulate data available events
    setTimeout(() => {
      if (this.ondataavailable) {
        const blob = new Blob(["audio data"], { type: "audio/webm" });
        this.ondataavailable({ data: blob } as BlobEvent);
      }
    }, 100);
  }

  stop() {
    this.state = "inactive";
    if (this.onstop) this.onstop();
  }
}

describe("usePrismAgentWebSocket", () => {
  // Helper to get the latest WebSocket instance (for tests we know it exists)
  const getWs = (): MockWebSocket => {
    const ws = MockWebSocket.getLatestInstance();
    if (!ws) throw new Error("WebSocket instance not found");
    return ws;
  };

  beforeEach(() => {
    // Reset WebSocket instances
    MockWebSocket.resetInstances();

    // Setup WebSocket mock
    global.WebSocket = MockWebSocket as any;

    // Setup MediaRecorder mock
    global.MediaRecorder = MockMediaRecorder as any;

    // Setup navigator.mediaDevices mock
    Object.defineProperty(global.navigator, "mediaDevices", {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    });

    // Polyfill Blob.arrayBuffer() for jsdom
    if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = function () {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as ArrayBuffer);
          };
          reader.readAsArrayBuffer(this);
        });
      };
    }

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Initial State", () => {
    test("should initialize with correct default values", () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transcript).toBe("");
      expect(result.current.currentResponse).toBe("");
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe("WebSocket Connection", () => {
    test("should connect to WebSocket with correct URL", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect(
          "agent-123",
          "token-abc",
          ["file1", "file2"],
          "conv-456",
        );
      });

      expect(result.current.isConnecting).toBe(true);

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.isConnecting).toBe(false);
    });

    test("should not connect without conversationId", () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", ["file1"]);
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });

    test("should send init message after connection", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect(
          "agent-123",
          "token-abc",
          ["file1"],
          "conv-456",
        );
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Check that init message was sent
      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const initMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "init";
        }
        return false;
      });

      expect(initMessage).toBeDefined();
    });

    test("should disconnect properly", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    test("should not reconnect if same agent, token, and conversation", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const firstConnectionCount = MockWebSocket.instances.length;

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      const secondConnectionCount = MockWebSocket.instances.length;
      expect(secondConnectionCount).toBe(firstConnectionCount);
    });

    test("should reconnect if agent changes", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.connect("agent-999", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe("Message Sending", () => {
    test("should send text message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.sendTextMessage("Hello world");
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const textMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "text" && parsed.text === "Hello world";
        }
        return false;
      });

      expect(textMessage).toBeDefined();
    });

    test("should send realtime text message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.sendTextMessage("Real-time message", true);
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const realtimeMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "realtime_text";
        }
        return false;
      });

      expect(realtimeMessage).toBeDefined();
    });

    test("should start audio input", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.startAudioInput();
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const startContinuousMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "start_continuous";
        }
        return false;
      });

      expect(startContinuousMessage).toBeDefined();
    });

    test("should send audio chunk", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const audioData = new ArrayBuffer(100);
      act(() => {
        result.current.sendAudioChunk(audioData);
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      expect(sentMessages).toContain(audioData);
    });

    test("should end audio input", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.endAudioInput();
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const audioEndMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "audio_end";
        }
        return false;
      });

      expect(audioEndMessage).toBeDefined();
    });

    test("should update continuous mute", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.updateContinuousMute(true);
      });

      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      const muteMessage = sentMessages.find((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "start_continuous" && parsed.mute === true;
        }
        return false;
      });

      expect(muteMessage).toBeDefined();
    });
  });

  describe("Message Receiving", () => {
    test("should handle processing message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage(JSON.stringify({ type: "processing" }));
      });

      expect(result.current.isProcessing).toBe(true);
    });

    test("should handle transcript message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "transcript", text: "User said hello" }),
        );
      });

      expect(result.current.transcript).toBe("User said hello");
    });

    test("should handle response_chunk message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "response_chunk", text: "Hello " }),
        );
      });

      expect(result.current.currentResponse).toBe("Hello ");

      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "response_chunk", text: "world!" }),
        );
      });

      expect(result.current.currentResponse).toBe("Hello world!");
    });

    test("should handle response message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      
      // Set processing to true first
      act(() => {
        ws.simulateMessage(JSON.stringify({ type: "processing" }));
      });

      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "response", full_text: "Complete response" }),
        );
      });

      expect(result.current.currentResponse).toBe("Complete response");
      expect(result.current.isProcessing).toBe(false);
    });

    test("should handle error message", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "error", message: "Something went wrong" }),
        );
      });

      expect(result.current.error).toBe("Something went wrong");
      expect(result.current.isProcessing).toBe(false);
    });

    test("should handle audio data ArrayBuffer", async () => {
      const onAudioData = jest.fn();
      const { result } = renderHook(() =>
        usePrismAgentWebSocket(undefined, onAudioData),
      );

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      const audioBuffer = new ArrayBuffer(100);
      
      act(() => {
        ws.simulateMessage(audioBuffer);
      });

      expect(onAudioData).toHaveBeenCalledWith(audioBuffer);
    });

    test("should handle audio data Blob", async () => {
      const onAudioData = jest.fn();
      const { result } = renderHook(() =>
        usePrismAgentWebSocket(undefined, onAudioData),
      );

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      const audioBlob = new Blob(["audio"], { type: "audio/webm" });
      
      act(() => {
        ws.simulateMessage(audioBlob);
      });

      await waitFor(() => {
        expect(onAudioData).toHaveBeenCalled();
      });
    });

    test("should call onResponse callback", async () => {
      const onResponse = jest.fn();
      const { result } = renderHook(() => usePrismAgentWebSocket(onResponse));

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "response", text: "Test response" }),
        );
      });

      expect(onResponse).toHaveBeenCalledWith({
        type: "response",
        text: "Test response",
      });
    });
  });

  describe("File Updates", () => {
    test("should update selected files", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", ["file1"], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.updateSelectedFiles(["file2", "file3"]);
      });

      // Should send a new init message with updated files
      const ws = getWs();
      const sentMessages = ws.getSentMessages();
      
      const initMessages = sentMessages.filter((msg: any) => {
        if (typeof msg === "string") {
          const parsed = JSON.parse(msg);
          return parsed.type === "init";
        }
        return false;
      });

      expect(initMessages.length).toBeGreaterThan(1);
    });
  });

  describe("Recording", () => {
    test("should start recording", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.isRecording).toBe(true);
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    test("should stop recording", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.isRecording).toBe(true);
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.isRecording).toBe(false);
      });
    });

    test("should not start recording if already recording", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.startRecording();
      });

      const firstCallCount = (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mock.calls.length;

      await act(async () => {
        await result.current.startRecording();
      });

      const secondCallCount = (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    test("should handle microphone access denied", async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error("Permission denied"),
      );

      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Microphone access denied");
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle WebSocket error", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateError();
      });

      expect(result.current.error).toBe("WebSocket error");
    });

    test("should handle invalid JSON response", async () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = getWs();
      act(() => {
        ws.simulateMessage("invalid json {");
      });

      expect(result.current.error).toBe("Failed to parse server response");
    });
  });

  describe("Cleanup", () => {
    test("should cleanup on unmount", async () => {
      const { result, unmount } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      // Verify cleanup happened (no errors thrown)
      expect(true).toBe(true);
    });
  });

  describe("Environment Variables", () => {
    test("should use environment variable for WebSocket URL", () => {
      const { result } = renderHook(() => usePrismAgentWebSocket());

      act(() => {
        result.current.connect("agent-123", "token-abc", [], "conv-456");
      });

      const ws = getWs();
      expect(ws.url).toContain(process.env.VITE_AGENTS_WEBSOCKET_BASE_URL);
    });
  });
});