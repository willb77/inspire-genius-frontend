import * as fs from "fs"
import * as path from "path"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AboutYouPanel } from "@/components/profile/AboutYouPanel"
import { useMyProfile } from "@/hooks/profile/useProfile"
import { useLatestPrismStatus } from "@/hooks/prism/usePrismRequest"

jest.mock("@/hooks/profile/useProfile")
jest.mock("@/hooks/prism/usePrismRequest")
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({
  AddPersonalDocModal: ({
    target,
    onUploaded,
  }: {
    target: { name: string } | null
    onUploaded?: () => void
  }) =>
    target ? (
      <button type="button" onClick={() => onUploaded?.()}>
        simulate upload
      </button>
    ) : null,
}))

const mockProfile = useMyProfile as jest.Mock
const mockPrism = useLatestPrismStatus as jest.Mock

function setup({
  docs = [] as string[],
  profileError = false,
  loading = false,
}: { docs?: string[]; profileError?: boolean; loading?: boolean } = {}) {
  mockPrism.mockReturnValue({ latest: null, isLoading: false, isError: false })
  mockProfile.mockReturnValue({
    data: profileError ? undefined : { personal_docs: docs },
    isLoading: loading,
    isError: profileError,
  })
}

const renderPanel = (props: Partial<Parameters<typeof AboutYouPanel>[0]> = {}) =>
  render(
    <MemoryRouter>
      <AboutYouPanel hasPrism={false} onUploadPrism={jest.fn()} {...props} />
    </MemoryRouter>
  )

beforeEach(() => jest.clearAllMocks())

describe("AboutYouPanel (HOME-1)", () => {
  it("calls no direction-setting API itself: the host owns journey progress", () => {
    // Static, because the failure (a 403 after a good upload for an
    // unentitled Home user) only shows on a tier.
    const src = fs.readFileSync(path.resolve(__dirname, "../AboutYouPanel.tsx"), "utf8")
    // Import statements only: the doc comment names both paths on purpose.
    const imports = src.match(/^import[\s\S]*?from\s+["'][^"']+["']/gm) ?? []
    expect(imports.length).toBeGreaterThan(5)
    const bad = imports.filter((i) =>
      /direction-setting|useJourney|useAdvanceJourney|AddAssessmentModal|ReplacePrismData/.test(i)
    )
    expect(bad).toEqual([])
  })

  it("hands the PRISM box to the host's own upload path", () => {
    setup()
    const onUploadPrism = jest.fn()
    renderPanel({ onUploadPrism })
    fireEvent.click(screen.getByRole("button", { name: "Upload report" }))
    expect(onUploadPrism).toHaveBeenCalledTimes(1)
  })

  it("passes a résumé upload's success to the host's onUploaded", () => {
    setup()
    const onUploaded = jest.fn()
    renderPanel({ onUploaded })
    fireEvent.click(screen.getByRole("button", { name: "Upload résumé" }))
    fireEvent.click(screen.getByRole("button", { name: "simulate upload" }))
    expect(onUploaded).toHaveBeenCalledTimes(1)
  })

  it("a failed /me read is not 'not added': résumé and bio say they could not check, and Home does not collapse", () => {
    setup({ profileError: true })
    renderPanel({ variant: "home", hasPrism: true })
    expect(screen.getAllByText("Couldn't check just now")).toHaveLength(2)
    expect(screen.queryByTestId("about-you-collapsed")).toBeNull()
  })

  it("says it is checking while its reads are in flight", () => {
    setup({ loading: true })
    renderPanel({ variant: "home" })
    expect(screen.getByTestId("about-you-loading")).toHaveTextContent("Checking what we already have…")
    expect(screen.queryByText("Upload résumé")).toBeNull()
  })

  it("the page variant never collapses, even with everything on file", () => {
    setup({ docs: ["resume", "bio"] })
    renderPanel({ variant: "page", hasPrism: true })
    expect(screen.queryByTestId("about-you-collapsed")).toBeNull()
    expect(screen.getByText(/3 of 3 on file: PRISM, résumé, bio\./)).toBeInTheDocument()
  })
})
