/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import ArtifactStatusMatrix from "../ArtifactStatusMatrix"
import { CLIENT_RESOURCES, type ResourceKey } from "@/types/practitioner/coachClient"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockMutate = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useUploadClientResource: () => ({ mutate: mockMutate, isPending: false }),
}))

function makeResources(present: number): Record<ResourceKey, boolean> {
  const out = {} as Record<ResourceKey, boolean>
  CLIENT_RESOURCES.forEach((r, i) => {
    out[r.key] = i < present
  })
  return out
}

describe("ArtifactStatusMatrix", () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders a row per canonical resource", () => {
    render(<ArtifactStatusMatrix resources={makeResources(0)} clientId="cl-1" />)
    CLIENT_RESOURCES.forEach((r) => {
      expect(screen.getByText(r.label)).toBeInTheDocument()
    })
  })

  it("shows an On file badge for present resources", () => {
    render(<ArtifactStatusMatrix resources={makeResources(10)} clientId="cl-1" />)
    expect(screen.getAllByText("On file")).toHaveLength(CLIENT_RESOURCES.length)
  })

  it("shows Add affordances for absent resources", () => {
    render(<ArtifactStatusMatrix resources={makeResources(0)} clientId="cl-1" />)
    expect(screen.getAllByText("Add")).toHaveLength(CLIENT_RESOURCES.length)
  })

  it("reveals an inline uploader when Add is clicked", () => {
    render(<ArtifactStatusMatrix resources={makeResources(0)} clientId="cl-1" />)
    const firstResource = CLIENT_RESOURCES[0]
    // click the first Add button
    fireEvent.click(screen.getAllByText("Add")[0])
    expect(screen.getByLabelText(`${firstResource.label} file`)).toBeInTheDocument()
  })
})
