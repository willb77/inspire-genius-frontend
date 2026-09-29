import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PractitionerRegistry from "../PractitionerRegistry"
import { addSchema, assignSchema, CSV_TEMPLATE } from "../practitionerRegistry.schemas"
import type { RegistryRow } from "@/types/practitioner-registry"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }))

type MutateOpts = { onSuccess?: (v: unknown) => void; onError?: (e: unknown) => void }
const addMutate = jest.fn()
const bulkMutate = jest.fn()
const editMutate = jest.fn()
const activeMutate = jest.fn()
const assignMutate = jest.fn()
const assignableArgs = jest.fn()
const registryArgs = jest.fn()
let rows: RegistryRow[] = []
let registryError: unknown

jest.mock("@/hooks/super-admin/usePractitionerRegistry", () => ({
  useRegistry: (includeInactive: boolean) => {
    registryArgs(includeInactive)
    return { data: rows, isLoading: false, error: registryError }
  },
  useRegistryRegions: () => ({
    data: [
      { region: "Europe", countries: ["DE", "FR"] },
      { region: "North America", countries: ["US"] },
    ],
  }),
  useAssignablePractitioners: (region: string, country: string) => {
    assignableArgs(region, country)
    return {
      data: region === "Europe" && country === "FR" ? [{ practitionerSub: "p-fr", displayName: "Fran Coach", email: "fran@example.com" }] : [],
    }
  },
  useAddPractitioner: () => ({ mutate: addMutate, isPending: false }),
  useBulkAddPractitioners: () => ({ mutate: bulkMutate, isPending: false }),
  useEditPractitioner: () => ({ mutate: editMutate, isPending: false }),
  useSetPractitionerActive: () => ({ mutate: activeMutate, isPending: false }),
  useAssignClient: () => ({ mutate: assignMutate, isPending: false }),
}))

const axios422 = (detail: unknown) => ({ response: { status: 422, data: { detail } } })

const ROW: RegistryRow = {
  practitionerSub: "p1",
  email: "alice@example.com",
  displayName: "Alice Able",
  siteId: "S1",
  clientId: "C1",
  reference: "R1",
  externalIdent: "E1",
  region: "Europe",
  country: "FR",
  practitionerCode: null,
  active: true,
  deactivatedAt: null,
  createdAt: null,
  updatedAt: null,
}

async function fillAdd(user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "Practitioner email": "alice@example.com",
    "PRISM Site ID": "S1",
    "PRISM Client ID": "C1",
    "IG Reference": "R1",
    ExternalIdent: "E1",
    Region: "Europe",
    Country: "fr",
    ...overrides,
  }
  const card = screen.getByText("Add one practitioner").closest("div[data-slot='card']") as HTMLElement
  for (const [label, value] of Object.entries(values)) {
    const input = within(card).getByLabelText(label)
    await user.clear(input)
    if (value) await user.type(input, value)
  }
  return card
}

describe("PractitionerRegistry", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rows = [ROW]
    registryError = undefined
  })

  it("lists registry rows with their identifiers", () => {
    render(<PractitionerRegistry />)
    expect(screen.getByText("Alice Able")).toBeInTheDocument()
    expect(screen.getByText("S1")).toBeInTheDocument()
    expect(screen.getByText("Europe / FR")).toBeInTheDocument()
    expect(registryArgs).toHaveBeenLastCalledWith(false)
  })

  it("shows an honest empty state and renders a load error", () => {
    rows = []
    const { unmount } = render(<PractitionerRegistry />)
    expect(screen.getByText("No practitioners in the registry yet.")).toBeInTheDocument()
    unmount()
    registryError = { response: { data: { detail: "Super-admin access required" } } }
    render(<PractitionerRegistry />)
    expect(screen.getByRole("alert")).toHaveTextContent("Super-admin access required")
  })

  it("validates the add form client-side before calling the API", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    const card = await fillAdd(user, { "PRISM Site ID": "S 1", Country: "France" })
    await user.click(within(card).getByRole("button", { name: /add practitioner/i }))
    expect(await within(card).findByText("Site ID must not contain spaces")).toBeInTheDocument()
    expect(within(card).getByText("Country must be a two-letter code, e.g. US")).toBeInTheDocument()
    expect(addMutate).not.toHaveBeenCalled()
  })

  it("submits a valid add with the country upper-cased and renders every server error", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    const card = await fillAdd(user)
    await user.click(within(card).getByRole("button", { name: /add practitioner/i }))
    await waitFor(() => expect(addMutate).toHaveBeenCalled())
    expect(addMutate.mock.calls[0][0]).toMatchObject({ practitionerEmail: "alice@example.com", country: "FR" })
    const opts = addMutate.mock.calls[0][1] as MutateOpts
    opts.onError?.(axios422([{ row: null, field: "practitioner_email", message: "this account is not a practitioner" }]))
    expect(await screen.findByRole("alert", { name: "Add practitioner errors" })).toHaveTextContent(
      "practitioner_email: this account is not a practitioner",
    )
    expect(toastError).not.toHaveBeenCalled()
    opts.onError?.({ response: { data: { detail: "Super-admin access required" } } })
    expect(toastError).toHaveBeenCalledWith("Super-admin access required")
  })

  it("bulk upload lists every row error at once and says nothing was saved", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.type(screen.getByLabelText("CSV contents"), "x")
    await user.click(screen.getByRole("button", { name: "Upload" }))
    expect(bulkMutate).toHaveBeenCalledWith("x", expect.anything())
    const opts = bulkMutate.mock.calls[0][1] as MutateOpts
    opts.onError?.(
      axios422([
        { row: 2, field: "site_id", message: "is required" },
        { row: 3, field: "country", message: "must be a two-letter country code, e.g. US" },
        { row: 4, field: "practitioner_email", message: "no account has this email" },
      ]),
    )
    const alert = await screen.findByRole("alert", { name: "Bulk add errors" })
    expect(alert).toHaveTextContent("3 problems — nothing was saved")
    expect(within(alert).getAllByRole("listitem")).toHaveLength(3)
    opts.onSuccess?.({ added: 2 })
    expect(toastSuccess).toHaveBeenCalledWith("2 practitioners added")
  })

  it("reads a chosen CSV file into the box", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    const file = new File([CSV_TEMPLATE + "a@b.co,S,C,R,E,EU,FR\n"], "r.csv", { type: "text/csv" })
    Object.defineProperty(file, "text", { value: () => Promise.resolve(CSV_TEMPLATE + "a@b.co,S,C,R,E,EU,FR\n") })
    await user.upload(screen.getByLabelText("CSV file"), file)
    await waitFor(() => expect((screen.getByLabelText("CSV contents") as HTMLTextAreaElement).value).toContain("a@b.co"))
  })

  it("the picker narrows region → country → practitioner, then assigns", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    const country = screen.getByLabelText("Country", { selector: "select" })
    expect(country).toBeDisabled()
    await user.selectOptions(screen.getByLabelText("Region", { selector: "select" }), "Europe")
    expect(within(country).getAllByRole("option").map((o) => o.textContent)).toEqual(["Select…", "DE", "FR"])
    await user.selectOptions(country, "FR")
    expect(assignableArgs).toHaveBeenLastCalledWith("Europe", "FR")
    await user.selectOptions(screen.getByLabelText("Practitioner", { selector: "select" }), "p-fr")
    await user.type(screen.getByLabelText("Client email"), "client@example.com")
    await user.click(screen.getByRole("button", { name: "Assign client" }))
    await waitFor(() => expect(assignMutate).toHaveBeenCalled())
    expect(assignMutate.mock.calls[0][0]).toEqual({ clientEmail: "client@example.com", practitionerSub: "p-fr" })
    const opts = assignMutate.mock.calls[0][1] as MutateOpts
    opts.onError?.(axios422([{ row: null, field: "client_email", message: "is already assigned to this practitioner" }]))
    expect(await screen.findByRole("alert", { name: "Assignment errors" })).toHaveTextContent("already assigned")
    opts.onSuccess?.({})
    expect(toastSuccess).toHaveBeenCalledWith("Client assigned")
  })

  it("changing region clears the country AND the practitioner, so a stale pick cannot be submitted", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.selectOptions(screen.getByLabelText("Region", { selector: "select" }), "Europe")
    await user.selectOptions(screen.getByLabelText("Country", { selector: "select" }), "FR")
    await user.selectOptions(screen.getByLabelText("Practitioner", { selector: "select" }), "p-fr")
    await user.selectOptions(screen.getByLabelText("Region", { selector: "select" }), "North America")
    await user.type(screen.getByLabelText("Client email"), "client@example.com")
    await user.click(screen.getByRole("button", { name: "Assign client" }))
    expect(await screen.findByText("Choose a country")).toBeInTheDocument()
    expect(screen.getByText("Choose a practitioner")).toBeInTheDocument()
    expect(assignMutate).not.toHaveBeenCalled()
  })

  it("changing country clears the practitioner", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.selectOptions(screen.getByLabelText("Region", { selector: "select" }), "Europe")
    await user.selectOptions(screen.getByLabelText("Country", { selector: "select" }), "FR")
    await user.selectOptions(screen.getByLabelText("Practitioner", { selector: "select" }), "p-fr")
    await user.selectOptions(screen.getByLabelText("Country", { selector: "select" }), "DE")
    await user.type(screen.getByLabelText("Client email"), "client@example.com")
    await user.click(screen.getByRole("button", { name: "Assign client" }))
    expect(await screen.findByText("Choose a practitioner")).toBeInTheDocument()
    expect(assignMutate).not.toHaveBeenCalled()
  })

  it("refuses to assign without a practitioner", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.type(screen.getByLabelText("Client email"), "client@example.com")
    await user.click(screen.getByRole("button", { name: "Assign client" }))
    expect(await screen.findByText("Choose a practitioner")).toBeInTheDocument()
    expect(assignMutate).not.toHaveBeenCalled()
  })

  it("deactivates from the row action and edits in a dialog", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.click(screen.getByRole("button", { name: "Deactivate Alice Able" }))
    expect(activeMutate).toHaveBeenCalledWith({ practitionerSub: "p1", active: false }, expect.anything())
    ;(activeMutate.mock.calls[0][1] as MutateOpts).onSuccess?.({})
    expect(toastSuccess).toHaveBeenCalledWith("Practitioner deactivated")

    await user.click(screen.getByRole("button", { name: "Edit Alice Able" }))
    const dialog = await screen.findByRole("dialog")
    const site = within(dialog).getByLabelText("PRISM Site ID")
    await user.clear(site)
    await user.type(site, "S-NEW")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(editMutate).toHaveBeenCalled())
    expect(editMutate.mock.calls[0][0]).toMatchObject({ practitionerSub: "p1", siteId: "S-NEW", country: "FR" })
    ;(editMutate.mock.calls[0][1] as MutateOpts).onError?.(axios422([{ row: null, field: "country", message: "bad" }]))
    expect(await within(dialog).findByRole("alert", { name: "Edit errors" })).toHaveTextContent("country: bad")
  })

  it("toggles deactivated rows into the list", async () => {
    const user = userEvent.setup()
    render(<PractitionerRegistry />)
    await user.click(screen.getByLabelText("Show deactivated"))
    expect(registryArgs).toHaveBeenLastCalledWith(true)
  })
})

describe("schemas", () => {
  it("addSchema normalises the country and rejects a bad email", () => {
    const ok = addSchema.parse({ practitionerEmail: "a@b.co", siteId: "S", clientId: "C", reference: "R", externalIdent: "E", region: "EU", country: "fr" })
    expect(ok.country).toBe("FR")
    expect(addSchema.safeParse({ ...ok, practitionerEmail: "nope" }).success).toBe(false)
  })

  it("assignSchema requires every step", () => {
    expect(assignSchema.safeParse({ region: "", country: "", practitionerSub: "", clientEmail: "" }).success).toBe(false)
    expect(assignSchema.safeParse({ region: "EU", country: "FR", practitionerSub: "p", clientEmail: "c@d.co" }).success).toBe(true)
  })
})
