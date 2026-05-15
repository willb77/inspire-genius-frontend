/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getVoiceConfig, updateVoiceConfig } from "../voiceConfigService"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), put: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("voiceConfigService", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getVoiceConfig tries /v1/agents/voice/config first", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { stt_provider: "aws", tts_provider: "aws" } } })
    const result = await getVoiceConfig()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/agents/voice/config")
    expect(result.data).toEqual({ stt_provider: "aws", tts_provider: "aws" })
  })

  it("getVoiceConfig falls back to /v1/admin/voice-config on error", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("404"))
    mockApi.get.mockResolvedValueOnce({ data: { data: { stt_provider: "openai", tts_provider: "openai" } } })
    const result = await getVoiceConfig()
    expect(mockApi.get).toHaveBeenCalledTimes(2)
    expect(mockApi.get).toHaveBeenLastCalledWith("/v1/admin/voice-config")
    expect(result.data).toEqual({ stt_provider: "openai", tts_provider: "openai" })
  })

  it("updateVoiceConfig tries /v1/agents/voice/config first", async () => {
    mockApi.put.mockResolvedValueOnce({ data: { data: { updated_keys: ["stt_provider"] } } })
    await updateVoiceConfig({ stt_provider: "google" })
    expect(mockApi.put).toHaveBeenCalledWith("/v1/agents/voice/config", { stt_provider: "google" })
  })

  it("updateVoiceConfig falls back to /v1/admin/voice-config on error", async () => {
    mockApi.put.mockRejectedValueOnce(new Error("404"))
    mockApi.put.mockResolvedValueOnce({ data: { data: { updated_keys: ["stt_provider"] } } })
    await updateVoiceConfig({ stt_provider: "google" })
    expect(mockApi.put).toHaveBeenCalledTimes(2)
    expect(mockApi.put).toHaveBeenLastCalledWith("/v1/admin/voice-config", { stt_provider: "google" })
  })
})
