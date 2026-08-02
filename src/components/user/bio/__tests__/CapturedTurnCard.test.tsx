/**
 * @jest-environment jsdom
 *
 * Cover for the "Captured to your profile" reflection card:
 *  - renders module label, each episode's title + facts, people/places/era, and
 *    the "what stands out" line,
 *  - renders nothing (defensive null) when there is nothing to reflect back.
 */
jest.mock("@/lib/bio/clientMemoir", () => ({
  moduleLabel: (m: string) => `Label:${m}`,
}))

import { render, screen } from "@testing-library/react"
import CapturedTurnCard from "@/components/user/bio/CapturedTurnCard"
import type { CaptureResponse } from "@/types/bio"

const base: CaptureResponse = {
  memberId: "member-1",
  moduleType: "culture",
  episodes: [],
  whatStandsOut: "",
  suggestedFollowups: [],
  captured: true,
}

describe("CapturedTurnCard", () => {
  it("reflects module, episode detail, and the takeaway line", () => {
    render(
      <CapturedTurnCard
        capture={{
          ...base,
          episodes: [
            {
              title: "Born in Lagos",
              facts: "Youngest of six.",
              people: ["mother", "grandmother"],
              places: ["Lagos"],
              era: "1980s",
            },
          ],
          whatStandsOut: "Heritage anchors your sense of self.",
        }}
      />,
    )
    expect(screen.getByText(/captured to your profile/i)).toBeInTheDocument()
    expect(screen.getByText("Label:culture")).toBeInTheDocument()
    expect(screen.getByText("Born in Lagos")).toBeInTheDocument()
    expect(screen.getByText("Youngest of six.")).toBeInTheDocument()
    expect(screen.getByText("mother, grandmother")).toBeInTheDocument()
    expect(screen.getByText("Lagos")).toBeInTheDocument()
    expect(screen.getByText("1980s")).toBeInTheDocument()
    expect(
      screen.getByText(/heritage anchors your sense of self/i),
    ).toBeInTheDocument()
  })

  it("renders nothing when there is nothing to reflect back", () => {
    const { container } = render(<CapturedTurnCard capture={base} />)
    expect(container).toBeEmptyDOMElement()
  })
})
