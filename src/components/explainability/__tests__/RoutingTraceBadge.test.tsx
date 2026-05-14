/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import { HealthBadge, RoutingTraceBadge } from "../RoutingTraceBadge"

describe("RoutingTraceBadge", () => {
  it("renders a fallback when no trace is provided", () => {
    render(<RoutingTraceBadge trace={null} />)
    expect(screen.getByText(/no routing trace/i)).toBeInTheDocument()
  })

  it("renders intent + score when both are present", () => {
    render(<RoutingTraceBadge trace={{ intent: "business", intent_score: 0.82 }} />)
    expect(screen.getByText(/business/)).toBeInTheDocument()
    expect(screen.getByText(/82%/)).toBeInTheDocument()
  })

  it("renders just the intent when score is missing", () => {
    render(<RoutingTraceBadge trace={{ intent: "coaching" }} />)
    expect(screen.getByText("coaching")).toBeInTheDocument()
  })
})

describe("HealthBadge", () => {
  it.each(["green", "amber", "red"] as const)("renders the %s health label", (h) => {
    render(<HealthBadge health={h} />)
    expect(screen.getByText(h)).toBeInTheDocument()
  })
})
