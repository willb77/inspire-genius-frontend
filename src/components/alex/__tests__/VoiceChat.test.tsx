import { render, screen } from "@testing-library/react";
import VoiceChat from "../VoiceChat";

/* ── Mock useTTS ── */
jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: jest.fn(),
    stop: jest.fn(),
    speaking: false,
    isOnline: true,
    activeProvider: "server",
  }),
}));

/* ── Mock WebSocket ── */
class MockWebSocket {
  static OPEN = 1;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

Object.defineProperty(global, "WebSocket", {
  value: MockWebSocket,
  writable: true,
});

/* ── Mock AudioContext & MediaDevices ── */
beforeAll(() => {
  Object.defineProperty(global, "AudioContext", {
    value: jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn(() => ({ connect: jest.fn() })),
      createAnalyser: jest.fn(() => ({
        fftSize: 256,
        frequencyBinCount: 128,
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn(),
      })),
      createScriptProcessor: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null,
      })),
      destination: {},
      close: jest.fn(),
      sampleRate: 16000,
    })),
    writable: true,
  });

  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
  });

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillStyle: "",
    fillRect: jest.fn(),
    lineWidth: 0,
    strokeStyle: "",
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  global.requestAnimationFrame = jest.fn((cb) => { cb(0); return 0; });
  global.cancelAnimationFrame = jest.fn();
});

describe("VoiceChat", () => {
  it("renders the canvas waveform element", () => {
    const { container } = render(<VoiceChat />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("shows 'Ready to talk' status in idle state", () => {
    render(<VoiceChat />);
    expect(screen.getByText("Ready to talk")).toBeInTheDocument();
  });

  it("renders the start call button (Phone icon)", () => {
    render(<VoiceChat />);
    // The green start-call button should be the only button initially
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(1);
  });

  it("does not show mute or end call buttons in idle state", () => {
    render(<VoiceChat />);
    const buttons = screen.getAllByRole("button");
    // Only start call button
    expect(buttons).toHaveLength(1);
  });
});
