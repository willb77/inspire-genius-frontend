/**
 * @jest-environment jsdom
 *
 * Light render/interaction cover for the Chronicle voice additions:
 *  - intro + suggested prompts stay present,
 *  - "Go deeper" probes render and send as a steer,
 *  - voice toggle reveals the mic when speech recognition is supported,
 *  - the mic is disabled when unsupported (graceful fallback).
 */

/* ---- Module mocks (must be before imports) ---- */
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: "member-1", token: "test-token" },
    isAuthenticated: true,
  }),
}))

const mockSendMessage = jest.fn()
jest.mock("@/hooks/agents/useMeridianWebSocket", () => ({
  useMeridianWebSocket: () => ({
    isConnected: true,
    isProcessing: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: mockSendMessage,
    currentResponse: "",
  }),
}))

const mockSpeak = jest.fn()
const mockStopSpeaking = jest.fn()
jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: mockSpeak,
    stop: mockStopSpeaking,
    speaking: false,
    pause: jest.fn(),
    resume: jest.fn(),
    isOnline: true,
    activeProvider: null,
  }),
}))

// Controllable speech-dictation support flag.
let dictationSupported = true
const mockDictationToggle = jest.fn()
jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: () => ({
    supported: dictationSupported,
    listening: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: mockDictationToggle,
  }),
}))

jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

jest.mock("@/lib/bio/clientMemoir", () => ({
  moduleLabel: (m: string) => m,
}))

import { render, screen, fireEvent } from "@testing-library/react"
import ChronicleChatPanel from "@/components/user/bio/ChronicleChatPanel"

// jsdom doesn't implement Element.scrollTo — the panel autoscrolls on new turns.
beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  dictationSupported = true
})

describe("ChronicleChatPanel voice + go-deeper", () => {
  it("keeps the introduction and suggested prompts", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    expect(
      screen.getByText(/Chronicle helps you tell your story/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /start telling my life story/i }),
    ).toBeInTheDocument()
  })

  it("sends a 'go deeper' probe as a steer", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    const probe = screen.getByRole("button", { name: /what did you notice first\?/i })
    fireEvent.click(probe)
    expect(mockSendMessage).toHaveBeenCalledWith(
      "What did you notice first?",
      expect.objectContaining({ surface: "bio_capture", agent_hint: "chronicle" }),
    )
  })

  it("reveals the mic when voice mode is on and speech is supported", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    expect(screen.queryByRole("button", { name: /answer by voice/i })).toBeNull()
    fireEvent.click(screen.getByRole("switch"))
    const mic = screen.getByRole("button", { name: /answer by voice/i })
    fireEvent.click(mic)
    expect(mockDictationToggle).toHaveBeenCalled()
  })

  it("disables the mic when speech recognition is unsupported", () => {
    dictationSupported = false
    render(<ChronicleChatPanel memberId="member-1" />)
    fireEvent.click(screen.getByRole("switch"))
    const mic = screen.getByRole("button", {
      name: /voice input isn't supported/i,
    })
    expect(mic).toBeDisabled()
  })
})
