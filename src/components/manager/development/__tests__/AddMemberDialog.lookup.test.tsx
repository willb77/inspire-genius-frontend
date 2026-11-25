/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import "@testing-library/jest-dom"

import type { PersonOption } from "@/hooks/manager/development/usePersonLookup"
import { filterOrgChart } from "@/hooks/manager/development/usePersonLookup"

/**
 * T1: "Find a person" in the Add-member dialog, and the server's refusal.
 *
 * What is asserted is the dialog's own contract: which source the lookup asks
 * for (super-admin directory vs own org chart), that picking a person sends
 * their account id as `memberSub`, that the free-text path sends none, and that
 * a 403's words reach the screen — the refusal is the whole point of T1, and a
 * dialog that swallowed it would read as "the add failed for no reason".
 */

const addOneMutateAsync = jest.fn()
const addBulkMutateAsync = jest.fn()
const lookupCalls: { query: string; isSuperAdmin: boolean }[] = []
let lookupResults: PersonOption[] = []
let isSuperAdmin = false

jest.mock("@/hooks/manager/development", () => ({
  useAddTeamMember: () => ({ mutateAsync: addOneMutateAsync, isPending: false }),
  useBulkAddTeamMembers: () => ({ mutateAsync: addBulkMutateAsync, isPending: false }),
  usePersonLookup: (query: string, superAdmin: boolean) => {
    lookupCalls.push({ query, isSuperAdmin: superAdmin })
    return { results: query.length >= 2 ? lookupResults : [], isLoading: false, isError: false }
  },
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (r: string) => isSuperAdmin && r === "super-admin" }),
}))
const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))

import { AddMemberDialog } from "../AddMemberDialog"

const ADA: PersonOption = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada Lovelace",
  title: "Engineer",
  department: "Platform",
}

function openDialog() {
  render(<AddMemberDialog />)
  fireEvent.click(screen.getByRole("button", { name: /Add people/i }))
  return screen.getByRole("dialog")
}

beforeEach(() => {
  addOneMutateAsync.mockReset()
  addBulkMutateAsync.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
  lookupCalls.length = 0
  lookupResults = [ADA]
  isSuperAdmin = false
})

describe("Find a person", () => {
  it("asks the org chart for a non-super-admin and the directory for a super-admin", () => {
    openDialog()
    expect(lookupCalls.at(-1)?.isSuperAdmin).toBe(false)
    expect(
      screen.getByPlaceholderText("Search your organisation by name"),
    ).toBeInTheDocument()
  })

  it("uses the directory for a super-admin", () => {
    isSuperAdmin = true
    openDialog()
    expect(lookupCalls.at(-1)?.isSuperAdmin).toBe(true)
    expect(screen.getByPlaceholderText("Search everyone by name or email")).toBeInTheDocument()
  })

  it("sends the picked person's account id as memberSub", async () => {
    addOneMutateAsync.mockResolvedValue({
      memberId: ADA.id,
      name: ADA.name,
      prismWritten: false,
      identity: { decision: "resolved_sub", reason: "", resolvedAccount: true },
    })
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByLabelText("Find a person"), {
      target: { value: "Ada" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: /Ada Lovelace/ }))
    expect(within(dialog).getByText(/Adding/)).toHaveTextContent("Adding Ada Lovelace")
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Ada Lovelace")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    await waitFor(() => expect(addOneMutateAsync).toHaveBeenCalled())
    expect(addOneMutateAsync.mock.calls[0][0]).toMatchObject({
      name: "Ada Lovelace",
      title: "Engineer",
      department: "Platform",
      memberSub: ADA.id,
    })
  })

  it("sends no memberSub on the free-text path", async () => {
    addOneMutateAsync.mockResolvedValue({ memberId: "x", name: "Jo", prismWritten: false })
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Jo" } })
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    await waitFor(() => expect(addOneMutateAsync).toHaveBeenCalled())
    expect(addOneMutateAsync.mock.calls[0][0].memberSub).toBeUndefined()
  })

  it("clearing the pick drops the account id", async () => {
    addOneMutateAsync.mockResolvedValue({ memberId: "x", name: "Ada", prismWritten: false })
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByLabelText("Find a person"), {
      target: { value: "Ada" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: /Ada Lovelace/ }))
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear the selected person" }))
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    await waitFor(() => expect(addOneMutateAsync).toHaveBeenCalled())
    expect(addOneMutateAsync.mock.calls[0][0].memberSub).toBeUndefined()
  })
})

describe("the server's refusal", () => {
  it("renders the 403 detail in the dialog, in words", async () => {
    const detail =
      "You can't add this person to your team: they have an account on the platform, " +
      "and only their manager, a company admin of their organisation or a super admin can add them."
    addOneMutateAsync.mockRejectedValue({ response: { status: 403, data: { detail } } })
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByLabelText("Find a person"), {
      target: { value: "Ada" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: /Ada Lovelace/ }))
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(detail)
    expect(toastError).toHaveBeenCalledWith(detail)
  })

  it("says how many bulk rows were refused", async () => {
    addBulkMutateAsync.mockResolvedValue({ created: 1, failed: 1, refused: 1, rows: [] })
    const dialog = openDialog()
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Import a file" }))
    fireEvent.click(within(dialog).getByRole("tab", { name: "Import a file" }))
    const box = await within(dialog).findByRole("textbox")
    fireEvent.change(box, { target: { value: "Ada, ada@x.com\nNobody, no@x.com" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add members" }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toMatch(/1 person has an account you can't add/)
  })

  it("says when a picked person was added but not linked to their account", async () => {
    addOneMutateAsync.mockResolvedValue({
      memberId: "minted",
      name: ADA.name,
      prismWritten: false,
      identity: {
        decision: "minted_no_match",
        reason: "no account in this organisation matches",
        resolvedAccount: false,
      },
    })
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByLabelText("Find a person"), {
      target: { value: "Ada" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: /Ada Lovelace/ }))
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(toastSuccess.mock.calls[0][0]).toMatch(/not linked to their account/)
  })
})

describe("filterOrgChart", () => {
  const nodes = [
    { id: "1", name: "Ada Lovelace", title: "Engineer" },
    { id: "2", name: "Ben Bloggs" },
  ]
  it("matches names case-insensitively", () => {
    expect(filterOrgChart(nodes, "ada").map((p) => p.id)).toEqual(["1"])
  })
  it("returns nothing below two characters", () => {
    expect(filterOrgChart(nodes, "a")).toEqual([])
  })
})

describe("U7: the add and import payloads are unchanged", () => {
  it("single add sends exactly the fields it sent before", async () => {
    addOneMutateAsync.mockResolvedValue({ memberId: "x", name: "Jo", prismWritten: false })
    const dialog = openDialog()
    expect(within(dialog).getAllByRole("tab")).toHaveLength(2)
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: " Jo Park " } })
    fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Lead" } })
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add member$/ }))
    await waitFor(() => expect(addOneMutateAsync).toHaveBeenCalled())
    expect(addOneMutateAsync.mock.calls[0][0]).toStrictEqual({
      name: "Jo Park",
      email: undefined,
      title: "Lead",
      department: undefined,
      memberSub: undefined,
    })
  })

  it("import sends one object per row, a quoted comma kept in its cell", async () => {
    addBulkMutateAsync.mockResolvedValue({ created: 2, failed: 0, refused: 0, rows: [] })
    const dialog = openDialog()
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Import a file" }))
    fireEvent.click(within(dialog).getByRole("tab", { name: "Import a file" }))
    const box = await within(dialog).findByRole("textbox")
    fireEvent.change(box, { target: { value: '"Smith, Jr.",a@x.com,Lead,Ops\nRiver Lee' } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add members" }))
    await waitFor(() => expect(addBulkMutateAsync).toHaveBeenCalled())
    expect(addBulkMutateAsync.mock.calls[0][0]).toStrictEqual([
      { name: "Smith, Jr.", email: "a@x.com", title: "Lead", department: "Ops" },
      { name: "River Lee", email: undefined, title: undefined, department: undefined },
    ])
  })
})
