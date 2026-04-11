import { render, screen } from "@testing-library/react"
import VoiceProviderSettings from "../VoiceProviderSettings"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

const mockUseVoiceConfig = jest.fn()
const mockUseUpdateVoiceConfig = jest.fn()
jest.mock("@/hooks/super-admin/useVoiceConfig", () => ({
  useVoiceConfig: () => mockUseVoiceConfig(),
  useUpdateVoiceConfig: () => mockUseUpdateVoiceConfig(),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("VoiceProviderSettings", () => {
  beforeEach(() => {
    mockUseVoiceConfig.mockReturnValue({
      data: { data: { stt_provider: "openai", tts_provider: "openai" } },
      isLoading: false,
      isError: false,
    })
    mockUseUpdateVoiceConfig.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
  })

  it("renders the page title", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getByText("Voice Provider Settings")).toBeInTheDocument()
  })

  it("renders STT and TTS sections", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getByText("Speech-to-Text (STT)")).toBeInTheDocument()
    expect(screen.getByText("Text-to-Speech (TTS)")).toBeInTheDocument()
  })

  it("renders STT options", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getAllByText("OpenAI Whisper").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Deepgram Nova-2").length).toBeGreaterThan(0)
    expect(screen.getByText(/Auto \(Deepgram/)).toBeInTheDocument()
  })

  it("renders TTS option", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getByText("OpenAI TTS")).toBeInTheDocument()
  })

  it("renders cost comparison table", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getByText("Estimated Costs")).toBeInTheDocument()
    expect(screen.getByText("$0.0043/min")).toBeInTheDocument()
    expect(screen.getByText("$0.006/min")).toBeInTheDocument()
  })

  it("renders save button as disabled when no changes", () => {
    render(<VoiceProviderSettings />)
    const saveBtn = screen.getByText("Save Changes").closest("button")
    expect(saveBtn).toBeDisabled()
  })

  it("shows loading skeletons when loading", () => {
    mockUseVoiceConfig.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })
    render(<VoiceProviderSettings />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })

  it("shows fallback config on error", () => {
    mockUseVoiceConfig.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(<VoiceProviderSettings />)
    expect(screen.getByText(/Using default configuration/)).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<VoiceProviderSettings />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
