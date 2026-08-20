import { render, screen, waitFor } from "@testing-library/react"
import AssetLibrary, { ASSET_LIBRARY_URL } from "../AssetLibrary"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const secureGetItem = jest.fn()
jest.mock("@/lib/secureStorage", () => ({
  secureGetItem: (...args: unknown[]) => secureGetItem(...args),
}))

describe("AssetLibrary launcher", () => {
  beforeEach(() => {
    secureGetItem.mockReset()
    // The launcher probes /health to learn whether this tier has a public tier.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, publicTier: true }),
    })
  })

  it("renders a real anchor to the durable tool URL, opening in a new tab", async () => {
    secureGetItem.mockResolvedValue("tok-123")
    render(<AssetLibrary />)

    const link = await screen.findByRole("link", { name: /open asset library/i })
    // A plain anchor, deliberately: window.open(url, "_blank", "noopener")
    // returns null and can navigate the current tab instead.
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
  })

  it("hands the session token to the tool in the URL fragment, never the query string", async () => {
    secureGetItem.mockResolvedValue("tok-123")
    render(<AssetLibrary />)

    const link = await screen.findByRole("link", { name: /open asset library/i })
    const href = link.getAttribute("href") ?? ""

    expect(href).toBe(`${ASSET_LIBRARY_URL}#igt=tok-123`)
    // The distinction is load-bearing: a query string would be recorded in S3
    // and CloudFront access logs; a fragment is never sent to the server.
    expect(href.split("#")[0]).not.toContain("igt=")
    expect(href).not.toContain("?igt=")
  })

  it("percent-encodes a token containing URL-significant characters", async () => {
    secureGetItem.mockResolvedValue("a+b/c=d&e")
    render(<AssetLibrary />)

    const link = await screen.findByRole("link", { name: /open asset library/i })
    const fragment = (link.getAttribute("href") ?? "").split("#igt=")[1]
    expect(decodeURIComponent(fragment)).toBe("a+b/c=d&e")
    // An unencoded "&" would truncate the token at the first ampersand.
    expect(fragment).not.toContain("&")
  })

  it("falls back to the bare durable URL and says confidential stays locked when there is no token", async () => {
    secureGetItem.mockResolvedValue(null)
    render(<AssetLibrary />)

    await waitFor(() => {
      expect(screen.getByText(/confidential access will stay locked/i)).toBeInTheDocument()
    })
    const link = screen.getByRole("link", { name: /open asset library/i })
    expect(link).toHaveAttribute("href", ASSET_LIBRARY_URL)
  })

  it("tells the user confidential access will be unlocked when a token is present", async () => {
    secureGetItem.mockResolvedValue("tok-123")
    render(<AssetLibrary />)

    await waitFor(() => {
      expect(screen.getByText(/confidential access will be unlocked/i)).toBeInTheDocument()
    })
  })

  it("explains what confidential means so the boundary is not a surprise", async () => {
    secureGetItem.mockResolvedValue("tok-123")
    render(<AssetLibrary />)

    expect(await screen.findByText(/separate private bucket/i)).toBeInTheDocument()
    // Was "expire after 15 minutes" — true only before confidential assets got
    // durable links. The link is now permanent; what expires is the download
    // URL it resolves to, which the user never sees.
    expect(screen.getByText(/only to verified IG super\s+admins/i)).toBeInTheDocument()
  })
})


describe("AssetLibrary launcher — per-tier behaviour", () => {
  beforeEach(() => {
    secureGetItem.mockReset()
    secureGetItem.mockResolvedValue("tok-123")
  })

  it("does not promise permanent public links on a tier that has no public store", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, publicTier: false }),
    })
    render(<AssetLibrary />)

    await waitFor(() => {
      expect(screen.getByText(/confidential-only here/i)).toBeInTheDocument()
    })
    // staging-b has no public tier; claiming otherwise would teach someone
    // something untrue about where their file ends up.
    expect(screen.queryByText(/safe to send to anyone/i)).not.toBeInTheDocument()
  })

  it("shows the public-tier copy where a public tier exists", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, publicTier: true }),
    })
    render(<AssetLibrary />)

    expect(await screen.findByText(/safe to send to anyone/i)).toBeInTheDocument()
    expect(screen.queryByText(/confidential-only here/i)).not.toBeInTheDocument()
  })

  it("stays neutral rather than guessing when /health is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"))
    render(<AssetLibrary />)

    // Unknown must not render as "no public tier" — that would be a confident
    // claim derived from a failed request.
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(/confidential-only here/i)).not.toBeInTheDocument()
  })
})
