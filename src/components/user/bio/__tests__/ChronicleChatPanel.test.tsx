/**
 * @jest-environment jsdom
 *
 * Light render/interaction cover for the Chronicle panel:
 *  - intro + suggested prompts stay present,
 *  - before any turn, the starter "Go deeper" probes render and send as a steer,
 *  - a user send fires the capture call alongside the chat send,
 *  - on a captured turn a "Added to your story" card renders inline AND
 *    the "Go deeper" chips become the content-specific followups,
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

// The panel sends over `useMeridianChat` (async jobs + poll), NOT the socket.
// Mocked at that seam so the assertions describe the transport the panel
// actually uses — a test that mocked the WebSocket would have gone on passing
// through the whole outage, which is exactly what happened.
const mockSendMessage = jest.fn()
let chatState = { isProcessing: false, partial: "", error: null as string | null }
const mockClearError = jest.fn()
let emitAssistant: (content: string) => void = () => {}
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: (opts: { onAssistant: (c: string) => void }) => {
    emitAssistant = opts.onAssistant
    return {
    send: mockSendMessage,
    isProcessing: chatState.isProcessing,
    partial: chatState.partial,
    error: chatState.error,
    clearError: mockClearError,
    isPushConnected: true,
    }
  },
}))

// Capture mutation: `mutate(vars, { onSuccess })` — the panel fires it alongside
// the chat send. Tests drive the reflection by controlling what it resolves to.
let captureResult: import("@/types/bio").CaptureResponse
const mockCaptureMutate = jest.fn(
  (
    _vars: unknown,
    opts?: { onSuccess?: (r: import("@/types/bio").CaptureResponse) => void },
  ) => {
    opts?.onSuccess?.(captureResult)
  },
)
jest.mock("@/hooks/useCaptureBioTurn", () => ({
  useCaptureBioTurn: () => ({ mutate: mockCaptureMutate }),
}))

// Session hooks (save / list / resume). The list drives the Sessions dropdown;
// save/load are exercised via the toolbar. Mocked so the panel needn't a
// QueryClientProvider in this light render test.
const mockSaveSession = jest.fn(async (_req: unknown) => ({
  sessionId: "s-1",
  title: "t",
  turnCount: 1,
  summary: "",
  createdAt: null,
  updatedAt: null,
}))
const mockLoadSession = jest.fn()
jest.mock("@/hooks/useBioSessions", () => ({
  useBioSessions: () => ({ data: [], isLoading: false }),
  useSaveBioSession: () => ({ mutateAsync: mockSaveSession, isPending: false }),
  useLoadBioSession: () => ({ mutateAsync: mockLoadSession }),
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

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import ChronicleChatPanel from "@/components/user/bio/ChronicleChatPanel"

// jsdom doesn't implement Element.scrollTo — the panel autoscrolls on new turns.
beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  dictationSupported = true
  // Default: a turn that captured nothing — no card, no new chips.
  captureResult = {
    memberId: "member-1",
    moduleType: "background",
    episodes: [],
    whatStandsOut: "",
    suggestedFollowups: [],
    captured: false,
  }
})

describe("ChronicleChatPanel capture + go-deeper + voice", () => {
  it("keeps the introduction and suggested prompts", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    expect(
      screen.getByText(/Chronicle helps you tell your story/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /start telling my life story/i }),
    ).toBeInTheDocument()
  })

  it("shows the starter 'go deeper' probes before any turn and sends one as a steer", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    const probe = screen.getByRole("button", {
      name: /tell me about where i grew up/i,
    })
    fireEvent.click(probe)
    expect(mockSendMessage).toHaveBeenCalledWith(
      "Tell me about where I grew up.",
      expect.any(Object),
    )
  })

  it("fires the capture call alongside the chat send", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    fireEvent.change(screen.getByRole("textbox", { name: /message chronicle/i }), {
      target: { value: "I was born in Lagos, the youngest of six." },
    })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(mockCaptureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: "member-1",
        message: "I was born in Lagos, the youngest of six.",
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it("renders a 'Added to your story' card and swaps in content-derived chips on a captured turn", () => {
    captureResult = {
      memberId: "member-1",
      moduleType: "culture",
      episodes: [
        {
          title: "Born in Lagos",
          facts: "Youngest of six, raised in a Yoruba household.",
          people: ["mother"],
          places: ["Lagos"],
          era: "1980s",
        },
      ],
      whatStandsOut: "Family and heritage anchor your sense of self.",
      suggestedFollowups: [
        "Tell me about your mother's background",
        "What was it like being the youngest of six?",
      ],
      captured: true,
    }

    render(<ChronicleChatPanel memberId="member-1" />)
    fireEvent.change(screen.getByRole("textbox", { name: /message chronicle/i }), {
      target: { value: "I was born in Lagos, the youngest of six." },
    })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))

    // The structured reflection renders inline. The captured title also appears
    // in the session insight rail, so it's present in at least one place.
    expect(screen.getByText(/added to your story/i)).toBeInTheDocument()
    expect(screen.getAllByText("Born in Lagos").length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(/family and heritage anchor your sense of self/i).length,
    ).toBeGreaterThanOrEqual(1)

    // The "Go deeper" chips are now the content-specific followups; the static
    // starter probe is gone.
    expect(
      screen.getByRole("button", { name: /tell me about your mother's background/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /tell me about where i grew up/i }),
    ).toBeNull()
  })

  it("shows no capture card when nothing was captured", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    fireEvent.change(screen.getByRole("textbox", { name: /message chronicle/i }), {
      target: { value: "hmm" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))
    expect(screen.queryByText(/added to your story/i)).toBeNull()
    // Starter chips remain since no followups came back.
    expect(
      screen.getByRole("button", { name: /tell me about where i grew up/i }),
    ).toBeInTheDocument()
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

  describe("autosave and Finish for now", () => {
    const sendOne = (text: string) => {
      fireEvent.change(screen.getByRole("textbox", { name: /message chronicle/i }), {
        target: { value: text },
      })
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }))
    }

    it("has one exit, 'Finish for now', and no separate Save button", () => {
      render(<ChronicleChatPanel memberId="member-1" />)
      expect(screen.getByRole("button", { name: /finish for now/i })).toBeDisabled()
      expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull()
      expect(screen.queryByRole("button", { name: /end & recap/i })).toBeNull()
    })

    it("autosaves when Chronicle's reply settles, then updates the same session", async () => {
      render(<ChronicleChatPanel memberId="member-1" />)
      sendOne("I grew up by the sea.")
      expect(mockSaveSession).not.toHaveBeenCalled() // nothing until a reply settles
      act(() => emitAssistant("What do you remember most?"))
      await waitFor(() => expect(mockSaveSession).toHaveBeenCalledTimes(1))
      expect(mockSaveSession.mock.calls[0][0]).toMatchObject({
        memberId: "member-1",
        sessionId: null,
      })
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /finish for now/i })).toBeEnabled(),
      )
      sendOne("The smell of salt.")
      act(() => emitAssistant("Tell me more."))
      await waitFor(() => expect(mockSaveSession).toHaveBeenCalledTimes(2))
      // The second save upserts into the row the first created, not a new one.
      expect(mockSaveSession.mock.calls[1][0]).toMatchObject({ sessionId: "s-1" })
    })

    it("Finish for now saves and shows the recap", async () => {
      render(<ChronicleChatPanel memberId="member-1" />)
      sendOne("I grew up by the sea.")
      act(() => emitAssistant("What do you remember most?"))
      await waitFor(() => expect(mockSaveSession).toHaveBeenCalledTimes(1))
      fireEvent.click(screen.getByRole("button", { name: /finish for now/i }))
      expect(screen.getByText(/session recap/i)).toBeInTheDocument()
      await waitFor(() => expect(mockSaveSession).toHaveBeenCalledTimes(2))
    })
  })
})
