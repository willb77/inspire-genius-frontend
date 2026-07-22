/**
 * @jest-environment jsdom
 *
 * Honor Dashboard → "Videos" view: a dropdown of movies; picking one opens a
 * pop-up modal that plays it.
 */
import { render, screen, fireEvent, within } from "@testing-library/react"
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
import { HONOR_VIDEOS } from "../_videos"

function renderDash() {
  return render(
    <MemoryRouter>
      <HonorDashboard />
    </MemoryRouter>,
  )
}

test("renders a Videos section with a dropdown (no inline player, no modal yet)", () => {
  renderDash()
  expect(screen.getByText("Videos")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Choose a video/i })).toBeInTheDocument()
  expect(document.querySelector("video")).toBeNull()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("opening the dropdown lists every movie in the catalog", () => {
  renderDash()
  fireEvent.click(screen.getByRole("button", { name: /Choose a video/i }))
  const list = screen.getByRole("listbox")
  for (const v of HONOR_VIDEOS) {
    expect(within(list).getByText(v.title)).toBeInTheDocument()
  }
})

test("picking a movie opens a pop-up modal playing that video", () => {
  const first = HONOR_VIDEOS[0]
  renderDash()
  fireEvent.click(screen.getByRole("button", { name: /Choose a video/i }))
  fireEvent.click(within(screen.getByRole("listbox")).getByText(first.title))

  const dialog = screen.getByRole("dialog", { name: first.title })
  expect(dialog).toBeInTheDocument()
  const video = dialog.querySelector("video")
  expect(video).not.toBeNull()
  expect(video).toHaveAttribute("src", first.url)
  expect(video).toHaveAttribute("controls")
})
