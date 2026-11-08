/**
 * S4b — the super-admin Live and Studio pages choose the one interview build
 * only when the interview switch is on; off, they render today's bodies.
 */
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="sa-layout">{children}</div>,
}))
jest.mock("@/components/interview/LiveInterviewBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">live</div>,
}))
jest.mock("@/components/interview/StudioInterviewBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">studio</div>,
}))
jest.mock("@/components/interview/house/run/InterviewRunBody", () => ({
  __esModule: true,
  default: ({ initialKind }: { initialKind: string }) => <div data-testid="body">run {initialKind}</div>,
}))

import SuperAdminInterviewLivePage from "@/pages/super-admin/InterviewLivePage"
import SuperAdminInterviewStudioPage from "@/pages/super-admin/InterviewStudioPage"

afterEach(() => localStorage.clear())

describe("super-admin interview pages", () => {
  it("OFF: today's Live and Studio bodies", () => {
    const { unmount } = render(<SuperAdminInterviewLivePage />)
    expect(screen.getByTestId("body")).toHaveTextContent("live")
    unmount()
    render(<SuperAdminInterviewStudioPage />)
    expect(screen.getByTestId("body")).toHaveTextContent("studio")
  })

  it("ON: the one build, starting on Hiring for Live and Your own questions for Studio", () => {
    localStorage.setItem("house_style_interview", "true")
    const { unmount } = render(<SuperAdminInterviewLivePage />)
    expect(screen.getByTestId("body")).toHaveTextContent("run hiring")
    unmount()
    render(<SuperAdminInterviewStudioPage />)
    expect(screen.getByTestId("body")).toHaveTextContent("run own")
    expect(screen.getByTestId("sa-layout")).toBeInTheDocument()
  })
})
