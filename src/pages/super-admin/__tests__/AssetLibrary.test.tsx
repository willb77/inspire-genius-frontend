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
    expect(screen.getByText(/expire after 15 minutes/i)).toBeInTheDocument()
  })
})
