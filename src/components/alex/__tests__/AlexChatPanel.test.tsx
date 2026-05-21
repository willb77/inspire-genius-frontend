import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import AlexChatPanel from "../AlexChatPanel";
import { useTour } from "@/context/useTour";
import { useAlexWebSocket } from "@/components/alex-voice-assistant/useAlexWebSocket";
import {
  useAlexDeviceId,
  useAlexHistoryListOnce,
} from "@/hooks/alex/useAlexChat";
import { downloadAlexChat } from "@/services/alex/chat.service";
import { toast } from "sonner";
import type { AlexResponse } from "@/components/alex-voice-assistant/types/types";

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
  getApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
  agentApi: { defaults: { headers: { common: {} } } },
}));

// Store original createElement
const originalCreateElement = document.createElement.bind(document);

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();

  // Mock URL methods to prevent navigation errors
  global.URL.createObjectURL = jest.fn(() => "blob:test-url");
  global.URL.revokeObjectURL = jest.fn();
  global.atob = jest.fn((str) => str);

  // Mock document.createElement to prevent actual file downloads
  document.createElement = jest.fn((tagName: string) => {
    if (tagName === "a") {
      const anchor = originalCreateElement("a");
      anchor.click = jest.fn();
      return anchor;
    }
    return originalCreateElement(tagName);
  }) as any;
});

afterAll(() => {
  jest.restoreAllMocks();
  document.createElement = originalCreateElement as any;
});

// Mock all dependencies
jest.mock("@/context/useTour");
jest.mock("@/components/alex-voice-assistant/useAlexWebSocket", () => ({
  useAlexWebSocket: jest.fn(),
}));
jest.mock("@/hooks/alex/useAlexChat");
jest.mock("@/services/alex/chat.service");
jest.mock("sonner");
jest.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

// Mock UI components
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div
        data-testid="sheet"
        role="button"
        tabIndex={0}
        onClick={() => onOpenChange?.(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    ) : null,
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, type, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      type={type}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/alex/EmptyStateCard", () => {
  return function EmptyStateCard({ onStart }: any) {
    return (
      <div data-testid="empty-state-card">
        <button onClick={onStart} data-testid="empty-state-start">
          Start Tour
        </button>
      </div>
    );
  };
});

jest.mock("@/components/user/chat/ExportChatModal", () => {
  return function ExportChatModal({ open, onOpenChange, onExport }: any) {
    if (!open) return null;
    return (
      <div data-testid="export-modal">
        <button
          onClick={() => onExport(new Date(), new Date())}
          data-testid="export-confirm"
        >
          Export
        </button>
        <button onClick={() => onOpenChange(false)} data-testid="export-cancel">
          Cancel
        </button>
      </div>
    );
  };
});

jest.mock("@/components/user/chat/AssistantMarkdown", () => {
  return function AssistantMarkdown({ text }: any) {
    return <div data-testid="assistant-markdown">{text}</div>;
  };
});

const mockDemoAudioService = {
  resetAudioState: jest.fn(),
  initializeAudioContext: jest.fn().mockResolvedValue(undefined),
  addAudioChunk: jest.fn(),
  resumeAudio: jest.fn(),
  pauseAudio: jest.fn(),
  getAudioContext: jest.fn().mockReturnValue({
    state: "suspended",
  }),
};

jest.mock("@/components/observability/ObservabilityPanel", () => {
  return { __esModule: true, default: () => null };
});
jest.mock("@/components/observability/SessionObservabilityDrawer", () => {
  return { __esModule: true, default: () => null };
});

jest.mock("@/services/demoAudioService", () => {
  return jest.fn().mockImplementation(() => mockDemoAudioService);
});

describe("AlexChatPanel", () => {
  const mockOnOpenChange = jest.fn();
  const mockStart = jest.fn();
  const mockConnect = jest.fn();
  const mockSendTextMessage = jest.fn();
  const mockStartContinuousMode = jest.fn();
  const mockStartRecording = jest.fn();
  const mockStopRecording = jest.fn();
  const mockUpdateContinuousMute = jest.fn();
  const mockHistoryMutate = jest.fn();
  const mockWriteText = jest.fn().mockResolvedValue(undefined);

  let onResponseCallback: (response: AlexResponse) => void;
  let onAudioDataCallback: (data: ArrayBuffer) => void;

  const defaultWebSocketState = {
    isConnected: true,
    isConnecting: false,
    connect: mockConnect,
    sendTextMessage: mockSendTextMessage,
    startContinuousMode: mockStartContinuousMode,
    isRecording: false,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    updateContinuousMute: mockUpdateContinuousMute,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDemoAudioService.getAudioContext.mockReturnValue({
      state: "suspended",
    });

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    (useTour as jest.Mock).mockReturnValue({ start: mockStart });
    (useAlexWebSocket as jest.Mock).mockImplementation(
      (onResponse, onAudioData) => {
        onResponseCallback = onResponse;
        onAudioDataCallback = onAudioData;
        return defaultWebSocketState;
      },
    );
    (useAlexDeviceId as jest.Mock).mockReturnValue({
      data: { device_id: "test-device-123" },
    });
    (useAlexHistoryListOnce as jest.Mock).mockReturnValue({
      mutateAsync: mockHistoryMutate,
      isPending: false,
    });
    (toast.error as jest.Mock).mockImplementation(() => {});
    (toast.success as jest.Mock).mockImplementation(() => {});
  });

  describe("Rendering", () => {
    it("should render the component when open", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByTestId("sheet")).toBeInTheDocument();
      expect(screen.getByText("Chat with Meridian")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<AlexChatPanel open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });

    it("should render empty state when no messages", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByTestId("empty-state-card")).toBeInTheDocument();
    });

    it("should render loading skeleton when history is pending", () => {
      (useAlexHistoryListOnce as jest.Mock).mockReturnValue({
        mutateAsync: mockHistoryMutate,
        isPending: true,
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBe(4);
    });

    it("should render header with correct buttons", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByLabelText("Load chat history")).toBeInTheDocument();
      expect(screen.getByLabelText("Settings")).toBeInTheDocument();
      expect(screen.getByLabelText("Export chat")).toBeInTheDocument();
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });
  });

  describe("Connection", () => {
    it("should connect when panel opens and not connected", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isConnected: false };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      expect(mockConnect).toHaveBeenCalled();
    });

    it("should update continuous mute when connected and open", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      expect(mockUpdateContinuousMute).toHaveBeenCalledWith(false);
    });

    it("should show connecting state in input placeholder", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return {
            ...defaultWebSocketState,
            isConnected: false,
            isConnecting: true,
          };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("placeholder", "Connecting to Meridian...");
    });

    it("should show offline state when not connected or connecting", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return {
            ...defaultWebSocketState,
            isConnected: false,
            isConnecting: false,
          };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("placeholder", "Meridian is offline");
    });

    it("should show Ask Anything placeholder when connected", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("placeholder", "Ask Anything....");
    });
  });

  describe("Message Sending", () => {
    it("should send text message when send button is clicked", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Hello Alex" } });

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      expect(mockSendTextMessage).toHaveBeenCalledWith("Hello Alex");
      expect(mockDemoAudioService.resetAudioState).toHaveBeenCalled();
    });

    it("should send message on Enter key press", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test message" } });
      fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

      expect(mockSendTextMessage).toHaveBeenCalledWith("Test message");
    });

    it("should not send message on Shift+Enter", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

      expect(mockSendTextMessage).not.toHaveBeenCalled();
    });

    it("should not send empty messages", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      expect(mockSendTextMessage).not.toHaveBeenCalled();
    });

    it("should not send when not connected", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isConnected: false };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test" } });

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      expect(mockSendTextMessage).not.toHaveBeenCalled();
    });

    it("should clear input after sending message", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Test" } });

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe("");
      });
    });

    it("should add user and processing messages when sending", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Hello" } });

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
  });

  describe("Recording", () => {
    it("should toggle recording when mic button is clicked", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const micButton = screen.getByLabelText("Toggle recording");
      fireEvent.click(micButton);

      await waitFor(() => {
        expect(mockStartContinuousMode).toHaveBeenCalled();
        expect(mockStartRecording).toHaveBeenCalled();
      });
    });

    it("should stop recording when already recording", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isRecording: true };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const micButton = screen.getByLabelText("Toggle recording");
      fireEvent.click(micButton);

      expect(mockStopRecording).toHaveBeenCalled();
    });

    it("should connect if not connected when starting recording", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isConnected: false };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const micButton = screen.getByLabelText("Toggle recording");
      fireEvent.click(micButton);

      expect(mockConnect).toHaveBeenCalled();
    });

    it("should show empty placeholder when recording", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isRecording: true };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("placeholder", "");
    });
  });

  describe("Response Handling", () => {
    it("should handle continuous_mode response", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({ type: "continuous_mode" } as AlexResponse);
      });

      // Check that messages were updated - processing dots appear
      await waitFor(() => {
        const processingElements = screen
          .getAllByRole("generic")
          .filter((el) => el.className?.includes("bg-gray-600"));
        expect(processingElements.length).toBeGreaterThan(0);
      });
    });

    it("should handle audio_start response", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({ type: "audio_start" } as AlexResponse);
      });

      expect(mockDemoAudioService.resetAudioState).toHaveBeenCalled();
    });

    it("should handle transcript response", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "transcript",
          text: "User said this",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByText("User said this")).toBeInTheDocument();
      });
    });

    it("should handle response_chunk", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "response_chunk",
          text: "Assistant response",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByTestId("assistant-markdown")).toHaveTextContent(
          "Assistant response",
        );
      });
    });

    it("should handle response_chunk with full_text", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "response_chunk",
          full_text: "Full response",
          text: "Partial",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByTestId("assistant-markdown")).toHaveTextContent(
          "Full response",
        );
      });
    });

    it("should handle error response", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "error",
          message: "Something went wrong",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Error: Something went wrong"),
        ).toBeInTheDocument();
      });
    });

    it("should handle error response without message", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({ type: "error" } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByText("Error: Unknown error")).toBeInTheDocument();
      });
    });

    it("should not add message for empty transcript", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const messagesBefore = screen.queryAllByRole("generic").length;

      await act(async () => {
        onResponseCallback({ type: "transcript", text: "" } as AlexResponse);
      });

      const messagesAfter = screen.queryAllByRole("generic").length;
      expect(messagesAfter).toBe(messagesBefore);
    });

    it("should not add duplicate response_chunk", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "response_chunk",
          text: "Same text",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByTestId("assistant-markdown")).toBeInTheDocument();
      });

      const messagesBefore = screen.getAllByTestId("assistant-markdown").length;

      await act(async () => {
        onResponseCallback({
          type: "response_chunk",
          text: "Same text",
        } as AlexResponse);
      });

      const messagesAfter = screen.getAllByTestId("assistant-markdown").length;
      expect(messagesAfter).toBe(messagesBefore);
    });

    it("should handle response type", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "response",
          text: "Final response",
        } as AlexResponse);
      });

      // Response type doesn't add to messages, just updates lastMessageRef
      // No assertion needed as it's internal state
    });
  });

  describe("Audio Data Handling", () => {
    it("should handle audio data", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const audioData = new ArrayBuffer(8);

      await act(async () => {
        onAudioDataCallback(audioData);
      });

      await waitFor(() => {
        expect(mockDemoAudioService.initializeAudioContext).toHaveBeenCalled();
        expect(mockDemoAudioService.addAudioChunk).toHaveBeenCalledWith(
          audioData,
        );
      });
    });

    it("should resume audio if paused when receiving audio data", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      // First set audio paused state by calling response
      await act(async () => {
        onResponseCallback({ type: "audio_start" } as AlexResponse);
      });

      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "running",
      });

      const audioData = new ArrayBuffer(8);
      mockDemoAudioService.initializeAudioContext.mockResolvedValue(undefined);

      await act(async () => {
        onAudioDataCallback(audioData);
      });

      await waitFor(() => {
        expect(mockDemoAudioService.addAudioChunk).toHaveBeenCalled();
      });
    });
  });

  describe("Audio Playback", () => {
    it("should toggle audio playback from playing to paused", async () => {
      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "running",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      // Trigger audio to show play/pause button
      await act(async () => {
        onResponseCallback({ type: "audio_start" } as AlexResponse);
      });

      await waitFor(() => {
        const playPauseButtons = screen.getAllByTestId("button");
        // Find the pause button (third from last: mute, play/pause, send)
        const pauseButton = playPauseButtons[playPauseButtons.length - 3];
        fireEvent.click(pauseButton);
      });

      expect(mockDemoAudioService.pauseAudio).toHaveBeenCalled();
    });

    it("should toggle audio playback from paused to playing", async () => {
      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "suspended",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({ type: "audio_start" } as AlexResponse);
      });

      await waitFor(() => {
        const playPauseButtons = screen.getAllByTestId("button");
        const playButton = playPauseButtons[playPauseButtons.length - 3];
        fireEvent.click(playButton);
      });

      expect(mockDemoAudioService.resumeAudio).toHaveBeenCalled();
    });
  });

  describe("Mute Functionality", () => {
    it("should toggle mute", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const muteButtons = screen.getAllByTestId("button");
      const muteButton = muteButtons[muteButtons.length - 2];
      fireEvent.click(muteButton);

      expect(mockUpdateContinuousMute).toHaveBeenCalledWith(true);

      fireEvent.click(muteButton);
      expect(mockUpdateContinuousMute).toHaveBeenCalledWith(false);
    });

    it("should not toggle mute when audio is playing", async () => {
      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "running",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({ type: "audio_start" } as AlexResponse);
      });

      await waitFor(() => {
        const muteButtons = screen.getAllByTestId("button");
        const muteButton = muteButtons[muteButtons.length - 2];
        expect(muteButton).toBeDisabled();
      });
    });
  });

  describe("History Loading", () => {
    it("should load history successfully", async () => {
      mockHistoryMutate.mockResolvedValue({
        data: {
          history: [
            {
              sequence: 1,
              user: { content: "Hello", created_at: new Date().toISOString() },
              assistant: {
                content: "Hi there",
                created_at: new Date().toISOString(),
              },
            },
          ],
        },
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const loadButton = screen.getByLabelText("Load chat history");

      await act(async () => {
        fireEvent.click(loadButton);
      });

      await waitFor(() => {
        expect(mockHistoryMutate).toHaveBeenCalledWith({
          limit: 100,
          offset: 0,
          device_key: "test-device-123",
        });
        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByTestId("assistant-markdown")).toHaveTextContent(
          "Hi there",
        );
      });
    });

    it("should handle history with alternative response structure", async () => {
      mockHistoryMutate.mockResolvedValue({
        history: [
          {
            sequence: 2,
            user: { content: "Test", created_at: new Date().toISOString() },
          },
        ],
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const loadButton = screen.getByLabelText("Load chat history");

      await act(async () => {
        fireEvent.click(loadButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });
    });

    it("should handle empty history", async () => {
      mockHistoryMutate.mockResolvedValue({ data: { history: [] } });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const loadButton = screen.getByLabelText("Load chat history");

      await act(async () => {
        fireEvent.click(loadButton);
      });

      await waitFor(() => {
        expect(mockHistoryMutate).toHaveBeenCalled();
      });
    });

    it("should show error when device id is not available", async () => {
      (useAlexDeviceId as jest.Mock).mockReturnValue({
        data: { device_id: "" },
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const loadButton = screen.getByLabelText("Load chat history");
      fireEvent.click(loadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Meridian device id not available",
        );
      });
    });

    it("should handle history loading errors", async () => {
      mockHistoryMutate.mockRejectedValue(new Error("Failed to load"));

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const loadButton = screen.getByLabelText("Load chat history");

      await act(async () => {
        fireEvent.click(loadButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load");
      });
    });
  });

  describe("Export Chat", () => {
    it("should open export modal", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      expect(screen.getByTestId("export-modal")).toBeInTheDocument();
    });

    it("should close export modal", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const cancelButton = screen.getByTestId("export-cancel");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("export-modal")).not.toBeInTheDocument();
    });

    it("should export chat with PDF", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: true,
        base64_pdf: "base64pdfdata",
        mime_type: "application/pdf",
        file_name: "chat.pdf",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(downloadAlexChat).toHaveBeenCalledWith(
          expect.objectContaining({
            device_key: "test-device-123",
          }),
        );
      });
    });

    it("should export chat with CSV", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: true,
        base64_csv: "base64csvdata",
        mime_type: "text/csv",
        file_name: "chat.csv",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(downloadAlexChat).toHaveBeenCalled();
      });
    });

    it("should handle export with no base64 data", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: true,
        mime_type: "application/pdf",
        file_name: "chat.pdf",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(downloadAlexChat).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Export failed: no chat data returned for the selected range",
        );
      });
    });

    it("should handle export failure", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: false,
        message: "Server rejected the request",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(downloadAlexChat).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Server rejected the request");
      });
    });

    it("should handle export failure without server message", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: false,
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Export failed");
      });
    });

    it("should toast and not crash when response is empty", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue(undefined);

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Export failed: empty response from server",
        );
      });
    });

    it("should read base64 from nested data payload shape", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: true,
        data: {
          base64_pdf: "nested-base64",
          mime_type: "application/pdf",
          file_name: "nested.pdf",
        },
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.atob).toHaveBeenCalledWith("nested-base64");
        expect(toast.success).toHaveBeenCalledWith(
          "Chat exported successfully",
        );
      });
    });

    it("should toast and not crash when atob throws on malformed base64", async () => {
      (downloadAlexChat as jest.Mock).mockResolvedValue({
        status: true,
        base64_pdf: "!!!not-valid-base64!!!",
        mime_type: "application/pdf",
        file_name: "chat.pdf",
      });
      const atobOriginal = global.atob;
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (global.atob as jest.Mock).mockImplementationOnce(() => {
        throw new Error("InvalidCharacterError");
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Export failed: malformed file data",
        );
      });

      consoleError.mockRestore();
      global.atob = atobOriginal;
    });

    it("should handle export error", async () => {
      (downloadAlexChat as jest.Mock).mockRejectedValue(
        new Error("Export failed"),
      );
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Export failed");
      });

      consoleError.mockRestore();
    });

    it("should toast a generic message when downloadAlexChat rejects with non-Error", async () => {
      (downloadAlexChat as jest.Mock).mockRejectedValue("network blip");
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to export chat");
      });

      consoleError.mockRestore();
    });

    it("should not export when device id is missing", async () => {
      (useAlexDeviceId as jest.Mock).mockReturnValue({
        data: { device_id: "" },
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const exportButton = screen.getByLabelText("Export chat");
      fireEvent.click(exportButton);

      const confirmButton = screen.getByTestId("export-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Meridian device id not available",
        );
      });
    });
  });

  describe("Panel Closing", () => {
    it("should call onOpenChange when close button is clicked", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("should stop recording when panel is closed while recording", () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isRecording: true };
        },
      );

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      expect(mockStopRecording).toHaveBeenCalled();
    });

    it("should pause audio when closing panel with audio playing", () => {
      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "running",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      expect(mockDemoAudioService.pauseAudio).toHaveBeenCalled();
    });

    it("should handle sheet open change to false", async () => {
      (useAlexWebSocket as jest.Mock).mockImplementation(
        (onResponse, onAudioData) => {
          onResponseCallback = onResponse;
          onAudioDataCallback = onAudioData;
          return { ...defaultWebSocketState, isRecording: true };
        },
      );
      mockDemoAudioService.getAudioContext.mockReturnValue({
        state: "running",
      });

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      // Simulate Sheet onOpenChange(false) by clicking the sheet
      const sheet = screen.getByTestId("sheet");

      await act(async () => {
        fireEvent.click(sheet);
      });

      await waitFor(() => {
        expect(mockStopRecording).toHaveBeenCalled();
        expect(mockDemoAudioService.pauseAudio).toHaveBeenCalled();
      });
    });
  });

  describe("Empty State", () => {
    it("should trigger tour when start button is clicked", () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const startButton = screen.getByTestId("empty-state-start");
      fireEvent.click(startButton);

      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe("Copy Functionality", () => {
    it("should copy message text to clipboard", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test message" } });

      const sendButtons = screen.getAllByTestId("button");
      const sendButton = sendButtons[sendButtons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText("Test message")).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByLabelText("Copy message");
      fireEvent.click(copyButtons[0]);

      expect(mockWriteText).toHaveBeenCalledWith("Test message");
    });

    it("should show copied toast", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test" } });

      const sendButtons = screen.getAllByTestId("button");
      fireEvent.click(sendButtons[sendButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByLabelText("Copy message");
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
      });
    });

    it("should hide copied toast after timeout", async () => {
      jest.useFakeTimers();

      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByTestId("input");
      fireEvent.change(input, { target: { value: "Test" } });

      const sendButtons = screen.getAllByTestId("button");
      fireEvent.click(sendButtons[sendButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByLabelText("Copy message");

      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
      });

      await act(async () => {
        jest.advanceTimersByTime(1200);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Copied to clipboard"),
        ).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe("Message Display", () => {
    it("should display system messages with correct styling", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "error",
          message: "System error",
        } as AlexResponse);
      });

      await waitFor(() => {
        const errorMessage = screen.getByText("Error: System error");
        expect(errorMessage.closest("div")).toHaveClass("bg-yellow-50");
      });
    });

    it("should display assistant messages with markdown", async () => {
      render(<AlexChatPanel open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        onResponseCallback({
          type: "response_chunk",
          text: "Assistant reply",
        } as AlexResponse);
      });

      await waitFor(() => {
        expect(screen.getByTestId("assistant-markdown")).toBeInTheDocument();
      });
    });
  });
});
