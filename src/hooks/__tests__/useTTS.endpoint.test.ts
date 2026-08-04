/**
 * The server-TTS call, and why the voice was mechanical.
 *
 * `useTTS` posted `/v1/audio/tts`. That route does not exist — it 404s (checked
 * against dev). `fetchServerAudio` catches everything and returns null, so the
 * hook fell through to browser SpeechSynthesis on every surface that speaks:
 * the goal interview, Chronicle, Interview Practice. Nothing errored, nothing
 * logged, and the only symptom was that the voice sounded synthetic.
 *
 * That is the shape worth pinning. A silent fallback is the right behaviour when
 * the network is down and the wrong behaviour when the URL is simply wrong, and
 * from inside the hook those look identical. So these assert the endpoint and
 * the voice directly, because no functional test would ever have caught it.
 */
import { MERIDIAN_VOICE } from "@/hooks/useTTS"

const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { post: (...a: unknown[]) => mockPost(...a) },
}))

describe("the voice the platform speaks in", () => {
  it("is Meridian's, not a per-surface choice", () => {
    // Every spoken surface is Meridian — the specialists work behind her. A
    // different voice in the goal interview reads as a different assistant.
    expect(MERIDIAN_VOICE).toBe("shimmer")
  })
})

describe("the server TTS endpoint", () => {
  const read = () => {
    const fs = jest.requireActual("fs") as typeof import("fs")
    const path = jest.requireActual("path") as typeof import("path")
    return fs.readFileSync(
      path.join(process.cwd(), "src/hooks/useTTS.ts"),
      "utf8"
    )
  }

  it("is the one that exists", () => {
    const src = read()
    expect(src).toContain("/v1/agents/voice/synthesize")
  })

  it("is not the one that 404s", () => {
    // The whole bug in one line. If this string comes back, the voice goes
    // mechanical again and nothing else will tell you.
    const src = read()
    expect(src).not.toContain('"/v1/audio/tts"')
  })

  it("goes through agentApi, since /v1/agents/* does not route via the plain api", () => {
    const src = read()
    expect(src).toContain("agentApi")
  })

  it("defaults the voice to Meridian's rather than coral", () => {
    const src = read()
    expect(src).toContain("voice = MERIDIAN_VOICE")
    expect(src).not.toContain('voice = "coral"')
  })
})
