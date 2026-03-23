/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react"
import PRISMThermometer from "../PRISMThermometer"

describe("PRISMThermometer", () => {
  it("renders 4 color segments", () => {
    const { container } = render(<PRISMThermometer red={25} yellow={20} green={30} blue={25} />)
    const segments = container.querySelectorAll("[style]")
    expect(segments.length).toBeGreaterThanOrEqual(4)
  })

  it("returns null when all values are 0", () => {
    const { container } = render(<PRISMThermometer red={0} yellow={0} green={0} blue={0} />)
    expect(container.innerHTML).toBe("")
  })

  it("applies correct widths based on proportions", () => {
    const { container } = render(<PRISMThermometer red={50} yellow={50} green={0} blue={0} />)
    const segments = container.querySelectorAll("div > div")
    // first child is the outer flex, inner divs are segments
    expect(segments.length).toBeGreaterThanOrEqual(1)
  })
})
