import { render, screen } from "@testing-library/react"
import { InterviewsPanel } from "../InterviewsPanel"

const ITEM = {
  sessionId: "s1", finalizedAt: "2026-09-20T10:00:00+00:00", title: "Career discovery",
  overallScore: 3.5, recommendation: "develop", summary: "Clear about interests.",
}

describe("InterviewsPanel (S-3) — three states a viewer can tell apart", () => {
  it("not shared", () => {
    render(<InterviewsPanel memberName="Ada" interviews={{ state: "not_shared", items: [] }} />)
    expect(screen.getByTestId("interviews-not-shared")).toHaveTextContent("Ada hasn't shared")
    expect(screen.queryByTestId("interviews-none-yet")).not.toBeInTheDocument()
  })

  it("unavailable — never presented as 'none'", () => {
    render(<InterviewsPanel memberName="Ada" interviews={{ state: "unavailable", items: [] }} />)
    expect(screen.getByTestId("interviews-unavailable")).toHaveTextContent(/isn't the same as having none/)
    expect(screen.queryByTestId("interviews-none-yet")).not.toBeInTheDocument()
  })

  it("an older backend with no block reads as unavailable, not as none", () => {
    render(<InterviewsPanel memberName="Ada" />)
    expect(screen.getByTestId("interviews-unavailable")).toBeInTheDocument()
  })

  it("shared, none yet", () => {
    render(<InterviewsPanel memberName="Ada" interviews={{ state: "shared", items: [] }} />)
    expect(screen.getByTestId("interviews-none-yet")).toHaveTextContent("No development interviews with Ada yet")
  })

  it("shared with summaries", () => {
    render(<InterviewsPanel memberName="Ada" interviews={{ state: "shared", items: [ITEM] }} />)
    const item = screen.getByTestId("interview-item")
    expect(item).toHaveTextContent("Career discovery")
    expect(item).toHaveTextContent("Overall 3.5 · develop")
    expect(item).toHaveTextContent("Clear about interests.")
  })
})
