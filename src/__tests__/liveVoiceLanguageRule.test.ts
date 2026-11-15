/**
 * @jest-environment node
 *
 * The live-voice language rule, enforced over the source.
 *
 * **Every sender of `voice_start` takes its language from
 * `liveVoiceLanguage()`, never a literal.**
 *
 * Static on purpose: the failure is invisible at runtime. A hardcoded "en-US"
 * still starts a session and still transcribes, so every test passes while a
 * Polish or Czech speaker is silently transcribed as US English. A behavioural
 * test cannot catch the next sender someone adds; the shape can be pinned.
 */
import fs from "fs"
import path from "path"

const SRC = path.resolve(__dirname, "..")

/** Files that send `voice_start`, relative to src. VoiceChat takes a prop. */
const SENDERS = [
  path.join("components", "alex-voice-assistant", "handlers", "webSocketHandlers.ts"),
  path.join("pages", "user", "DiagnosticChat.tsx"),
  path.join("hooks", "agents", "useMeridianWebSocket.ts"),
]

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue
      walk(full, acc)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

describe("live-voice language rule", () => {
  it.each(SENDERS)("%s sends liveVoiceLanguage(), not a literal", (rel) => {
    const text = fs.readFileSync(path.join(SRC, rel), "utf8")
    expect(text).toContain("liveVoiceLanguage")
    expect(text).not.toMatch(/voice_start[^\n]*language:\s*["']en-US["']/)
    expect(text).not.toMatch(/\?\?\s*["']en-US["']/)
  })

  it("no source file sends voice_start with a hardcoded language literal", () => {
    const offenders = walk(SRC).filter((f) =>
      /voice_start[^\n]*language:\s*["'][a-z]{2}(-[A-Z]{2})?["']/.test(fs.readFileSync(f, "utf8")),
    )
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([])
  })

  it("scans every file that mentions voice_start, so a new sender cannot hide", () => {
    const senders = walk(SRC)
      .filter((f) => /type:\s*["']voice_start["']/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f))
      .sort()
    const known = [...SENDERS, path.join("components", "alex", "VoiceChat.tsx")].sort()
    expect(senders).toEqual(known)
  })
})
