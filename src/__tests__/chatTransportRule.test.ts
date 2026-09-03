/**
 * @jest-environment node
 *
 * The chat-transport rule, enforced over the source.
 *
 * **Every chat surface sends over `useMeridianJob.startJob` — never over the
 * WebSocket.** The socket is a push accelerator; the job poll is what settles
 * the turn. See `.claude/rules/agents.md` §6.
 *
 * This is a static guard rather than a behavioural test on purpose. The bug it
 * exists to prevent is invisible at runtime on a healthy tier and silent on a
 * broken one: on 2026-09-02 one tier's ws-proxy was found dispatching to a
 * forwarder Lambda hardcoded to a different environment's name, absent from
 * that account — so every browser→server chat frame failed with AccessDenied.
 * 188 connects, 188 disconnects, zero messages delivered in 24h. Both panels
 * that sent over the socket accepted the question, persisted it, and never
 * answered. Every unit test passed throughout, because they mocked the socket.
 *
 * A behavioural test cannot catch the next instance of this — it would have to
 * know which transport is broken in which environment. What it CAN be pinned
 * to is the shape: no surface takes `sendMessage` off `useMeridianWebSocket`.
 */
import fs from "fs"
import path from "path"

const SRC = path.resolve(__dirname, "..")

/** The socket hook itself, and its own tests, legitimately name `sendMessage`. */
const EXEMPT = new Set([
  path.join("hooks", "agents", "useMeridianWebSocket.ts"),
])

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue
      sourceFiles(full, acc)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

describe("chat transport rule", () => {
  const files = sourceFiles(SRC)

  it("finds source files to check (the guard must not be inert)", () => {
    // Without this, a broken walk would make every assertion below vacuous —
    // a guard that cannot fail reads as coverage.
    expect(files.length).toBeGreaterThan(100)
  })

  it("no chat surface takes sendMessage from useMeridianWebSocket", () => {
    const offenders: string[] = []

    for (const file of files) {
      const rel = path.relative(SRC, file)
      if (EXEMPT.has(rel)) continue
      const src = fs.readFileSync(file, "utf8")
      if (!src.includes("useMeridianWebSocket")) continue

      // Destructuring the socket hook's send function, under any alias:
      //   sendMessage,        |  sendMessage: wsSend,
      const takesSend = /(^|[\s{,])sendMessage\s*(,|:|\})/m.test(src)
      if (takesSend) offenders.push(rel)
    }

    expect(offenders).toEqual([])
  })

  it("the guard would catch a surface that sends over the socket", () => {
    // Mutation check — the regex above must actually match the shape it bans.
    const bad = `const { isConnected, sendMessage, currentResponse } = useMeridianWebSocket({})`
    const badAliased = `const { sendMessage: wsSend } = useMeridianWebSocket({})`
    const good = `const { isConnected, connect, disconnect } = useMeridianWebSocket({})`
    const re = /(^|[\s{,])sendMessage\s*(,|:|\})/m
    expect(re.test(bad)).toBe(true)
    expect(re.test(badAliased)).toBe(true)
    expect(re.test(good)).toBe(false)
  })

  it("the two panels that went mute now send over the job transport", () => {
    // Named explicitly: these are the surfaces the outage silenced, and a
    // revert of either is the regression this file is here to fail on.
    const panels = [
      path.join(SRC, "components", "manager", "development", "MeridianDevelopmentPanel.tsx"),
      path.join(SRC, "components", "user", "bio", "ChronicleChatPanel.tsx"),
    ]
    for (const file of panels) {
      const src = fs.readFileSync(file, "utf8")
      expect(src).toContain("useMeridianChat")
      expect(src).not.toContain("useMeridianWebSocket")
    }
  })

  it("both panels render a transport failure instead of swallowing it", () => {
    const panels = [
      path.join(SRC, "components", "manager", "development", "MeridianDevelopmentPanel.tsx"),
      path.join(SRC, "components", "user", "bio", "ChronicleChatPanel.tsx"),
    ]
    for (const file of panels) {
      const src = fs.readFileSync(file, "utf8")
      // The error must be taken off the hook AND put on the screen.
      expect(src).toMatch(/(^|[\s{,])error\s*(,|:|\})/m)
      expect(src).toContain('role="alert"')
    }
  })
})
