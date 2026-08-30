import { render, screen } from "@testing-library/react"

import { RecentActivityCard, type ActivityItem } from "../RecentActivityCard"

describe("RecentActivityCard", () => {
  it("renders an item's label", () => {
    const items: ActivityItem[] = [
      { label: "Uploaded a document", meta: "3×" },
    ]
    render(<RecentActivityCard items={items} />)

    expect(screen.getByText("Uploaded a document")).toBeInTheDocument()
  })

  it("renders the default empty label when there are no items", () => {
    render(<RecentActivityCard items={[]} loading={false} />)

    expect(screen.getByText("No recent activity")).toBeInTheDocument()
  })
})
