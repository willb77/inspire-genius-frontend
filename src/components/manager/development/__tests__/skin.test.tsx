/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import {
  getDevSkin,
  resolveDevV2,
  useDevSkin,
  DevSkinProvider,
  DevPageFrame,
} from "../skin"

jest.mock("@/lib/surfaceFlags", () => ({
  isNewUserSurfacesEnabled: jest.fn(),
}))
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags"
const flagMock = isNewUserSurfacesEnabled as jest.Mock

function Probe() {
  const sk = useDevSkin()
  return (
    <div>
      <span data-testid="v2">{String(sk.v2)}</span>
      <span data-testid="heading">{sk.heading}</span>
      <span data-testid="brand">{sk.brandHex}</span>
    </div>
  )
}

describe("development skin", () => {
  it("getDevSkin returns byte-identical classic tokens", () => {
    const c = getDevSkin(false)
    expect(c.v2).toBe(false)
    expect(c.heading).toBe("text-slate-900")
    expect(c.text900).toBe("text-slate-900")
    expect(c.border200).toBe("border-slate-200")
    expect(c.radius).toBe("rounded-xl")
    expect(c.brandHex).toBe("#3B5BFF")
    expect(c.avatarGradient).toBe("from-[#3B5BFF] to-[#2DD4BF]")
    expect(c.focusRing).toBe("focus-visible:outline-[#3B5BFF]")
  })

  it("getDevSkin returns the HomeV2 tokens", () => {
    const v = getDevSkin(true)
    expect(v.v2).toBe(true)
    expect(v.heading).toBe("font-serif text-ink")
    expect(v.text900).toBe("text-ink")
    expect(v.text600).toBe("text-body-slate")
    expect(v.text400).toBe("text-mute")
    expect(v.border200).toBe("border-hairline")
    expect(v.bgMuted50).toBe("bg-panel")
    expect(v.radius).toBe("rounded-2xl")
    expect(v.brandHex).toBe("#E8932B")
    expect(v.avatarGradient).toBe("from-ink to-accent-orange")
    expect(v.focusRing).toBe("focus-visible:outline-accent-orange")
    expect(v.accentText).toBe("text-accent-orange-dark")
    expect(v.accentBg).toBe("bg-accent-orange")
    expect(v.accentBgSoft).toBe("bg-accent-orange/10")
    expect(v.accentBgFaint).toBe("bg-accent-orange/5")
    expect(v.accentBorder).toBe("border-accent-orange")
    expect(v.accentBorderSoft).toBe("border-accent-orange/40")
    expect(v.accentBorderHover).toBe("hover:border-accent-orange")
    expect(v.accentBorderFocus).toBe("focus:border-accent-orange")
  })

  it("resolveDevV2 honours an explicit variant over the flag", () => {
    flagMock.mockReturnValue(true)
    expect(resolveDevV2("classic")).toBe(false)
    expect(resolveDevV2("v2")).toBe(true)
  })

  it("resolveDevV2 falls back to the flag when no variant is given", () => {
    flagMock.mockReturnValue(true)
    expect(resolveDevV2()).toBe(true)
    flagMock.mockReturnValue(false)
    expect(resolveDevV2()).toBe(false)
  })

  it("useDevSkin defaults to classic with no provider", () => {
    render(<Probe />)
    expect(screen.getByTestId("v2")).toHaveTextContent("false")
    expect(screen.getByTestId("heading")).toHaveTextContent("text-slate-900")
    expect(screen.getByTestId("brand")).toHaveTextContent("#3B5BFF")
  })

  it("DevSkinProvider(v2) flows the HomeV2 skin to descendants", () => {
    render(
      <DevSkinProvider v2>
        <Probe />
      </DevSkinProvider>,
    )
    expect(screen.getByTestId("v2")).toHaveTextContent("true")
    expect(screen.getByTestId("heading")).toHaveTextContent("font-serif text-ink")
    expect(screen.getByTestId("brand")).toHaveTextContent("#E8932B")
  })

  it("DevPageFrame renders the cream V2Panel on v2 and a bare column on classic", () => {
    const { container: v2c } = render(
      <DevSkinProvider v2>
        <DevPageFrame>
          <p>framed</p>
        </DevPageFrame>
      </DevSkinProvider>,
    )
    expect(screen.getByText("framed")).toBeInTheDocument()
    expect(v2c.querySelector(".bg-panel")).not.toBeNull()

    const { container: classicC } = render(
      <DevSkinProvider v2={false}>
        <DevPageFrame>
          <p>bare</p>
        </DevPageFrame>
      </DevSkinProvider>,
    )
    expect(screen.getByText("bare")).toBeInTheDocument()
    expect(classicC.querySelector(".bg-panel")).toBeNull()
  })
})
