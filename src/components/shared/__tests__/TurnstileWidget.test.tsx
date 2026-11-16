/**
 * @jest-environment jsdom
 *
 * The real widget, with no Cloudflare: with no site key it reports "unavailable"
 * and loads nothing; with one it loads the script from Cloudflare's origin only,
 * renders explicitly, hands tokens up and removes the widget on unmount.
 */
import { render, waitFor } from "@testing-library/react"
import { TurnstileWidget } from "../TurnstileWidget"
import { getTurnstileSiteKey } from "../turnstile"

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
const KEY = "VITE_TURNSTILE_SITE_KEY"

afterEach(() => {
  document.head.querySelectorAll("script").forEach((s) => s.remove())
  delete (window as { turnstile?: unknown }).turnstile
  delete process.env[KEY]
})

describe("TurnstileWidget", () => {
  it("with no site key: calls onUnavailable and never loads a script", () => {
    expect(getTurnstileSiteKey()).toBe("")
    const onUnavailable = jest.fn()
    render(<TurnstileWidget onToken={jest.fn()} onUnavailable={onUnavailable} />)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
    expect(document.querySelector("script")).toBeNull()
  })

  it("with a site key: renders explicitly, passes tokens up, removes on unmount", async () => {
    process.env[KEY] = "site-key-123"
    const remove = jest.fn()
    let opts: Record<string, (t?: string) => void> & { sitekey?: string } = {}
    const renderFn = jest.fn((_el: HTMLElement, o: typeof opts) => {
      opts = o
      return "widget-1"
    })
    ;(window as { turnstile?: unknown }).turnstile = { render: renderFn, remove }
    const onToken = jest.fn()
    const { unmount } = render(<TurnstileWidget onToken={onToken} onUnavailable={jest.fn()} />)
    await waitFor(() => expect(renderFn).toHaveBeenCalledTimes(1))
    expect(opts.sitekey).toBe("site-key-123")
    opts.callback("tok-9")
    expect(onToken).toHaveBeenLastCalledWith("tok-9")
    opts["expired-callback"]()
    expect(onToken).toHaveBeenLastCalledWith(null)
    unmount()
    expect(remove).toHaveBeenCalledWith("widget-1")
  })

  it("loads the script from Cloudflare's origin only, and a load failure reports unavailable", async () => {
    process.env[KEY] = "site-key-123"
    const onUnavailable = jest.fn()
    render(<TurnstileWidget onToken={jest.fn()} onUnavailable={onUnavailable} />)
    const script = await waitFor(() => {
      const s = document.querySelector("script")
      if (!s) throw new Error("no script yet")
      return s
    })
    expect(script.getAttribute("src")).toBe(SRC)
    script.dispatchEvent(new Event("error"))
    await waitFor(() => expect(onUnavailable).toHaveBeenCalled())
  })
})
