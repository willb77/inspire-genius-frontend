/**
 * @jest-environment jsdom
 *
 * Honor Dashboard → "Overview Movie" view: renders a titled section with an
 * HTML5 video player pointing at the hosted PRISM overview.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

jest.mock("@/hooks/honor/useCoachData", () => ({
  useCoachHome: () => ({
    data: { coachName: "S. Carter", counts: { assigned: 3, assessed: 2, intakePending: 1 } },
  }),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "S. Carter", name: "S. Carter" } }),
}))

import HonorDashboard from "../HonorDashboard"
import { PRISM_OVERVIEW_VIDEO_URL } from "../_media"

test("renders an Overview Movie section with the hosted PRISM video", () => {
  const { container } = render(
    <MemoryRouter>
      <HonorDashboard />
    </MemoryRouter>,
  )

  expect(screen.getByText("Overview Movie")).toBeInTheDocument()

  const video = container.querySelector("video")
  expect(video).not.toBeNull()
  expect(video).toHaveAttribute("src", PRISM_OVERVIEW_VIDEO_URL)
  expect(video).toHaveAttribute("controls")
  // The hosted URL is an absolute mp4 on the shared public-videos bucket.
  expect(PRISM_OVERVIEW_VIDEO_URL).toMatch(/^https:\/\/.*PRISM_Overview\.mp4$/)
})
