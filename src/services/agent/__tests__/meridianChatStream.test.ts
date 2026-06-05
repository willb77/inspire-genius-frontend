import {
  streamMeridianChat,
  StreamingDisabledError,
  PreflightAsyncRedirectError,
} from "../meridianChatStream"

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    defaults: {
      baseURL: "http://test-agent-engine",
      headers: { common: { "access-token": "fake-token" } },
    },
  },
}))

/**
 * Build a minimal mock that quacks like a fetch ``Response`` for the
 * stream reader path:
 *   - ``status`` is the HTTP status code
 *   - ``ok`` is True for 2xx
 *   - ``body.getReader().read()`` returns the next chunk Uint8Array
 *     until exhausted, then ``{done: true}``
 *
 * We don't depend on the global ``Response`` / ``ReadableStream`` here
 * because JSDOM's globals are inconsistent and the production code only
 * uses ``resp.status``, ``resp.ok``, and ``resp.body.getReader()``.
 */
function makeFetchResponse(status: number, events: string[] = []): unknown {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = events.map((e) => encoder.encode(e))
  let idx = 0
  const reader = {
    async read() {
      if (idx >= chunks.length) return { done: true as const, value: undefined }
      return { done: false as const, value: chunks[idx++] }
    },
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "text/event-stream" : null,
    },
    body: { getReader: () => reader },
  }
}

function makeJsonResponse(status: number, body: Record<string, unknown>): unknown {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    body: null,
    json: async () => body,
  }
}

const originalFetch = global.fetch
let fetchMock: jest.Mock

describe("streamMeridianChat", () => {
  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("parses token + complete frames and invokes the matching callbacks", async () => {
    const events = [
      'event: token\ndata: {"content":"hello","agent":"Meridian"}\n\n',
      'event: token\ndata: {"content":" world","agent":"Meridian"}\n\n',
      'event: complete\ndata: {"content":"hello world","agent":"Meridian","session_id":"s-1","metadata":{"assistant_message_id":"msg-1","token_count":2}}\n\n',
    ]
    fetchMock.mockResolvedValue(makeFetchResponse(200, events))

    const tokens: string[] = []
    let complete: unknown = null

    await streamMeridianChat(
      { message: "say hi", sessionId: "s-1" },
      {
        onToken: (f) => tokens.push(f.content),
        onComplete: (f) => {
          complete = f
        },
      },
    )

    expect(tokens).toEqual(["hello", " world"])
    expect(complete).toEqual({
      type: "complete",
      content: "hello world",
      agent: "Meridian",
      sessionId: "s-1",
      metadata: { assistant_message_id: "msg-1", token_count: 2 },
    })
  })

  it("throws StreamingDisabledError on 404 from the server", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(404))

    await expect(
      streamMeridianChat({ message: "x", sessionId: "s-1" }),
    ).rejects.toBeInstanceOf(StreamingDisabledError)
  })

  it("throws PreflightAsyncRedirectError on 200 JSON {mode:'async', ...} (T22 option C)", async () => {
    fetchMock.mockResolvedValue(
      makeJsonResponse(200, {
        mode: "async",
        job_id: "job-abc-123",
        status: "queued",
        session_id: "s-1",
        reason: "multi_agent_template",
      }),
    )

    let caught: unknown = null
    try {
      await streamMeridianChat({ message: "5-person team analysis", sessionId: "s-1" })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(PreflightAsyncRedirectError)
    const redirect = (caught as PreflightAsyncRedirectError).redirect
    expect(redirect).toEqual({
      mode: "async",
      jobId: "job-abc-123",
      status: "queued",
      sessionId: "s-1",
      reason: "multi_agent_template",
    })
  })

  it("forwards the error frame via onError callback", async () => {
    const events = [
      'event: token\ndata: {"content":"partial","agent":"Meridian"}\n\n',
      'event: error\ndata: {"message":"agent exploded"}\n\n',
    ]
    fetchMock.mockResolvedValue(makeFetchResponse(200, events))

    let errorMsg: string | null = null
    await streamMeridianChat(
      { message: "x", sessionId: "s-1" },
      { onError: (f) => (errorMsg = f.message) },
    )

    expect(errorMsg).toBe("agent exploded")
  })

  it("attaches the access-token header from agentApi.defaults", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(200, []))

    await streamMeridianChat({ message: "x", sessionId: "s-1" })

    expect(fetchMock).toHaveBeenCalled()
    const call = (fetchMock.mock.calls[0] ?? []) as [string, RequestInit]
    expect(call[0]).toBe("http://test-agent-engine/v1/agents/chat/stream")
    const headers = (call[1].headers ?? {}) as Record<string, string>
    expect(headers["access-token"]).toBe("fake-token")
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["Accept"]).toBe("text/event-stream")
  })

  it("handles SSE frames split across chunks", async () => {
    const events = [
      'event: token\nd',
      'ata: {"content":"a","agent":"Meridian"}\n\nev',
      'ent: complete\ndata: {"content":"a","agent":"Meridian","session_id":"s","metadata":{}}\n\n',
    ]
    fetchMock.mockResolvedValue(makeFetchResponse(200, events))

    const tokens: string[] = []
    let completed = false
    await streamMeridianChat(
      { message: "x", sessionId: "s" },
      {
        onToken: (f) => tokens.push(f.content),
        onComplete: () => {
          completed = true
        },
      },
    )
    expect(tokens).toEqual(["a"])
    expect(completed).toBe(true)
  })

  it("supplies session_id, message, context, file_ids in the body", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(200, []))

    await streamMeridianChat({
      message: "hello",
      sessionId: "sess-1",
      context: { agent_id: "meridian" },
      fileIds: ["file-1"],
    })

    const call = (fetchMock.mock.calls[0] ?? []) as [string, RequestInit]
    const body = JSON.parse(call[1].body as string)
    expect(body).toEqual({
      message: "hello",
      session_id: "sess-1",
      context: { agent_id: "meridian" },
      file_ids: ["file-1"],
    })
  })
})
