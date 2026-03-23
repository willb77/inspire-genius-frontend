/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import VirtualList from "../VirtualList"

describe("VirtualList", () => {
  it("renders visible items", () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
    render(
      <VirtualList
        items={items}
        itemHeight={40}
        className="h-[200px]"
        renderItem={(item) => <div>{item}</div>}
      />
    )
    // Should render some items (not all 100)
    expect(screen.getByText("Item 0")).toBeInTheDocument()
  })
})
