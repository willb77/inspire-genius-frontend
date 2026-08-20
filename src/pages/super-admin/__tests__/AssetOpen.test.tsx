import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import AssetOpen, { ASSET_LIBRARY_API, navigation } from "../AssetOpen"

// Mocks @/lib/storage — the module that ACTUALLY holds the access token, and
// the same one the axios interceptor reads. Mocking @/lib/secureStorage instead
// is what let the broken version pass CI: the mock satisfied an assumption the
// real app never satisfied.
const getToken = jest.fn()
jest.mock("@/lib/storage", () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}))

// jsdom's window.location is non-configurable and cannot be mocked, so the
// component exposes `navigation` as an explicit seam and we spy on that.
const replace = jest.spyOn(navigation, "go").mockImplementation(() => {})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/asset-open" element={<AssetOpen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("AssetOpen — durable-link broker", () => {
  beforeEach(() => {
    getToken.mockReset()
    replace.mockReset()
    global.fetch = jest.fn()
  })

  it("exchanges the opaque id for a short-lived URL and sends the browser to it", async () => {
    getToken.mockResolvedValue("tok-123")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, url: "https://signed.example/x?sig=1", name: "Board.pdf" }),
    })

    renderAt("/asset-open?id=abc123")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("https://signed.example/x?sig=1"))

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${ASSET_LIBRARY_API}/d/abc123/resolve`)
    expect(opts.method).toBe("POST")
    // Identity travels in a header, never in the durable URL itself — that is
    // the entire reason the link can be permanent.
    expect(opts.headers["x-ig-token"]).toBe("tok-123")
  })

  it("tells a non-super-admin plainly that they lack access, rather than redirecting", async () => {
    getToken.mockResolvedValue("tok-123")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false, status: 403, json: async () => ({ ok: false, error: "restricted" }),
    })

    renderAt("/asset-open?id=abc123")

    expect(await screen.findByText(/this document is restricted/i)).toBeInTheDocument()
    expect(screen.getByText(/super admins only/i)).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("distinguishes a deleted document from a permissions problem", async () => {
    getToken.mockResolvedValue("tok-123")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false, status: 404, json: async () => ({ ok: false, error: "gone" }),
    })

    renderAt("/asset-open?id=abc123")

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument()
    expect(screen.queryByText(/restricted/i)).not.toBeInTheDocument()
  })

  it("asks an unauthenticated visitor to sign in and returns them here", async () => {
    getToken.mockResolvedValue(null)

    renderAt("/asset-open?id=abc123")

    expect(await screen.findByText(/sign in to open this document/i)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /sign in/i })
    expect(link.getAttribute("href")).toContain("next=")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("surfaces a network failure as an error with a retry, not as 'no access'", async () => {
    getToken.mockResolvedValue("tok-123")
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("offline"))

    renderAt("/asset-open?id=abc123")

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    // A transport failure must never be dressed up as a permissions verdict.
    expect(screen.queryByText(/restricted/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })

  it("rejects a link with no id instead of calling the API", async () => {
    getToken.mockResolvedValue("tok-123")

    renderAt("/asset-open")

    expect(await screen.findByText(/missing its document id/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("resolves only once even if the effect runs twice (StrictMode)", async () => {
    getToken.mockResolvedValue("tok-123")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ ok: true, url: "https://signed.example/x", name: "a.pdf" }),
    })

    const { rerender } = renderAt("/asset-open?id=abc123")
    rerender(
      <MemoryRouter initialEntries={["/asset-open?id=abc123"]}>
        <Routes>
          <Route path="/asset-open" element={<AssetOpen />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(replace).toHaveBeenCalled())
    // Each resolve writes an audit-log entry; a double fire would double-count
    // a single human open.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  })
})
