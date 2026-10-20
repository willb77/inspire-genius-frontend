import { fireEvent, render, screen } from "@testing-library/react"
import { DataPreviewTable } from "@/components/bulk-import/DataPreviewTable"
import type { RawUserRecord } from "@/types/bulk-import"

const directory = [{ id: "org-a-id", name: "test-org-a" }]
const records: RawUserRecord[] = [
  { fname: "Test", lname: "A1", email1: "a1@example.com", user_type: "user", organization: "test-org-a" },
]

function renderTable(props: Partial<React.ComponentProps<typeof DataPreviewTable>> = {}) {
  const onProceed = jest.fn()
  render(
    <DataPreviewTable
      records={records}
      onRecordsChange={jest.fn()}
      onProceed={onProceed}
      callerRole="super-admin"
      orgDirectory={directory}
      organizationAllowed
      {...props}
    />,
  )
  return onProceed
}

const proceed = () => screen.getByRole("button", { name: /Proceed to Import/ })

test("a super-admin sees the Organization column and the resolved id goes to the import", () => {
  const onProceed = renderTable()
  expect(screen.getByRole("columnheader", { name: "Organization" })).toBeInTheDocument()
  expect(screen.getByText("test-org-a")).toBeInTheDocument()
  fireEvent.click(proceed())
  expect(onProceed).toHaveBeenCalledWith([expect.objectContaining({ organization_id: "org-a-id" })])
})

test("without Skip onboarding the row is invalid and the import cannot proceed", () => {
  renderTable({ organizationAllowed: false })
  expect(screen.getByText("1 invalid")).toBeInTheDocument()
  expect(proceed()).toBeDisabled()
})

test("an unknown organisation blocks the import", () => {
  renderTable({ orgDirectory: [{ id: "x", name: "another-org" }] })
  expect(proceed()).toBeDisabled()
})

test("a manager sees no Organization column and is told it is ignored", () => {
  renderTable({ callerRole: "manager" })
  expect(screen.queryByRole("columnheader", { name: "Organization" })).not.toBeInTheDocument()
  expect(screen.getByText(/not recognised and/)).toBeInTheDocument()
  expect(proceed()).toBeEnabled()
})
