/**
 * @jest-environment jsdom
 *
 * N-8 — a profile renders exactly what was stored: a section not chosen is not
 * there at all, an unavailable one says why, and fit shows labels, never numbers.
 */
import { render, screen } from "@testing-library/react"
import { ProfileView } from "../ProfileView"
import type { ProfileContent } from "@/types/careerPathways"

const FULL: ProfileContent = {
  sections: {
    identity: { available: true, name: "Casey Candidate", email: "candidate-email-on-file" },
    prism: {
      available: true, scoreType: "Underlying", note: "Bands, not scores.",
      colours: [{ colour: "Red", band: "High", behaviours: ["Focusing", "Delivering"] }],
      behaviours: [{ behaviour: "Focusing", band: "High", bandMeaning: "A strength.", measures: "Narrowing to the goal." }],
    },
    fit: {
      available: true, validatedRoles: 1, note: "Decision support only.",
      roles: [{ jobId: "j1", roleTitle: "Teacher", tier: "potential-fit" }, { jobId: "j2", roleTitle: "Aide", tier: null }],
    },
    pathway: {
      available: true, note: "Roles within reach.",
      suggestions: [{ jobId: "j1", roleTitle: "Teacher", rationale: "Build focus." }],
      skillLadders: [{ skill: "Focusing", steps: ["Step one"] }],
    },
    goals: { available: true, goals: [] },
    practice: { available: false, reason: "Your practice history could not be read just now." },
  },
}

test("every chosen section renders, with labels and reasons", () => {
  render(<ProfileView content={FULL} />)
  expect(screen.getByText("Casey Candidate")).toBeInTheDocument()
  expect(screen.getByText("candidate-email-on-file")).toBeInTheDocument()
  expect(screen.getByText("Red")).toBeInTheDocument()
  expect(screen.getByText(/Potential fit/)).toBeInTheDocument()
  expect(screen.getByText(/Verdict withheld/)).toBeInTheDocument()
  expect(screen.getByText("Building Focusing")).toBeInTheDocument()
  expect(screen.getByText("No goals were chosen for this profile.")).toBeInTheDocument()
  expect(screen.getByText("Your practice history could not be read just now.")).toBeInTheDocument()
  expect(screen.getByTestId("career-profile").textContent).not.toMatch(/\d+%/)
})

test("a section that was not chosen is not there at all", () => {
  render(<ProfileView content={{ sections: { identity: { available: true, name: "Casey" } } }} />)
  expect(screen.queryByText("PRISM highlights")).not.toBeInTheDocument()
  expect(screen.queryByText("Fit with validated roles")).not.toBeInTheDocument()
  expect(screen.queryByText("Goals")).not.toBeInTheDocument()
})

test("unavailable PRISM, fit and pathway each say why", () => {
  render(
    <ProfileView
      content={{
        sections: {
          prism: { available: false, reason: "No PRISM profile is on file for you yet." },
          fit: { available: false, reason: "Role fit is not turned on for you." },
          pathway: { available: false },
          goals: { available: true, goals: [{ goalId: "g1", title: "Lead a team" }] },
        },
      }}
    />,
  )
  expect(screen.getByText("Candidate")).toBeInTheDocument()
  expect(screen.getByText("No PRISM profile is on file for you yet.")).toBeInTheDocument()
  expect(screen.getByText("Role fit is not turned on for you.")).toBeInTheDocument()
  expect(screen.getByText("Not available.")).toBeInTheDocument()
  expect(screen.getByText("Lead a team")).toBeInTheDocument()
})
