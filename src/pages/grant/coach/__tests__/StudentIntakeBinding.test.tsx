/**
 * @jest-environment jsdom
 *
 * GrantIntakeFlow parameterization — the studentId prop threads into the
 * aid-intake hooks. Default ("me") behaviour is asserted here too; the broader
 * self-serve flow is covered by grant-intake.test.tsx.
 */

import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  syncAuthToken: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const useAidIntake = jest.fn((studentId?: string) => ({ data: {}, studentId }))
const useSaveAidIntake = jest.fn((studentId?: string) => ({
  mutate: jest.fn(),
  isPending: false,
  studentId,
}))
jest.mock("@/hooks/grant/useAidIntake", () => ({
  useAidIntake: (studentId?: string) => useAidIntake(studentId),
  useSaveAidIntake: (studentId?: string) => useSaveAidIntake(studentId),
}))

import GrantIntakeFlow from "../../intake/GrantIntakeFlow"

function renderFlow(props?: { studentId?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GrantIntakeFlow {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("GrantIntakeFlow studentId binding", () => {
  beforeEach(() => jest.clearAllMocks())

  test("binds the intake hooks to the given studentId (coach mode)", () => {
    renderFlow({ studentId: "stu-1" })
    expect(useAidIntake).toHaveBeenCalledWith("stu-1")
    expect(useSaveAidIntake).toHaveBeenCalledWith("stu-1")
    // Copy shifts to third-person.
    expect(
      screen.getByRole("heading", { name: "Build this student's aid profile" })
    ).toBeInTheDocument()
  })

  test("defaults to the signed-in user ('me') with self-serve copy", () => {
    renderFlow()
    expect(useAidIntake).toHaveBeenCalledWith("me")
    expect(useSaveAidIntake).toHaveBeenCalledWith("me")
    expect(screen.getByRole("heading", { name: "Build your aid profile" })).toBeInTheDocument()
  })
})
