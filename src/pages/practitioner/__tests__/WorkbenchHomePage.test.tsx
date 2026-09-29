/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react"
import type { WorkbenchConfig } from "@/components/workbench/types"
import PractitionerWorkbenchHome from "../WorkbenchHomePage"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

let captured: WorkbenchConfig | null = null
jest.mock("@/components/workbench/WorkbenchHome", () => ({
  WorkbenchHome: (config: WorkbenchConfig) => {
    captured = config
    return null
  },
}))

jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { fullName: "Dana Coach" } }) }))

const mockCredits = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClients: () => ({ data: [], isLoading: false, error: null, refetch: jest.fn() }),
  useCoachSchedule: () => ({ data: [], isLoading: false, error: null, refetch: jest.fn() }),
  useCoachCredits: () => mockCredits(),
}))

function stat(key: string) {
  const s = captured?.stats.find((x) => x.key === key)
  if (!s) throw new Error(`no stat ${key}`)
  return s
}

describe("PractitionerWorkbenchHome — clients under management", () => {
  beforeEach(() => {
    captured = null
  })

  it("shows a real zero as 0, not as unavailable", () => {
    mockCredits.mockReturnValue({ data: { clientsUnderManagement: 0 } })
    render(<PractitionerWorkbenchHome />)
    expect(stat("under-management").value).toBe(0)
    expect(stat("under-management").hint).toBe("activated, linked clients")
  })

  it("shows the count it was given", () => {
    mockCredits.mockReturnValue({ data: { clientsUnderManagement: 7 } })
    render(<PractitionerWorkbenchHome />)
    expect(stat("under-management").value).toBe(7)
  })

  it("renders an unreported count as null with an honest hint", () => {
    mockCredits.mockReturnValue({ data: undefined })
    render(<PractitionerWorkbenchHome />)
    expect(stat("under-management").value).toBeNull()
    expect(stat("under-management").hint).toBe("count not available")
  })

  it("no longer carries a credits stat", () => {
    mockCredits.mockReturnValue({ data: { clientsUnderManagement: 0 } })
    render(<PractitionerWorkbenchHome />)
    expect(captured?.stats.some((s) => s.key === "credits")).toBe(false)
  })
})
