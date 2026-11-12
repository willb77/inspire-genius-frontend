import React from "react"
import { render } from "@testing-library/react"

import SuperAdminOrganizations from "../OrganizationManagement"

/**
 * Organizations → Action → Activity: the row menu offers Activity and it
 * navigates to that organization's activity page. The other actions are
 * unchanged (View stays, Edit and Resend stay hidden).
 */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

type Col = { key: string; render?: (row: unknown) => React.ReactNode }
jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ columns, data }: { columns: Col[]; data: unknown[] }) => (
    <div>{data.map((row, i) => <div key={i}>{columns.find((c) => c.key === "actions")?.render?.(row)}</div>)}</div>
  ),
}))

const menuProps: Record<string, unknown>[] = []
jest.mock("@/components/shared/ActionMenu", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    menuProps.push(props)
    return <div data-testid="action-menu" />
  },
}))

jest.mock("@/components/shared/Pagination", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/shared/forms/ConfirmActionModal", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/super-admin/organization/CreateOrganizationDialog", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/super-admin/ManagementHeader", () => ({ __esModule: true, default: () => null }))

// One stable object: the page maps `data` into rows in a useEffect keyed on
// `data`, so a fresh object per render would loop forever.
const mockOrgList = {
  data: { data: { organizations: [{ id: "org 1", name: "Example College", type: "school", status: true }], total: 1 } },
  isLoading: false, isError: false, refetch: () => {},
}
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrganizationManagement: () => mockOrgList,
  useDeactivateOrganization: () => ({ mutate: jest.fn(), isPending: false }),
}))

describe("Organizations row menu", () => {
  it("offers Activity, which opens that organization's activity page", () => {
    render(<SuperAdminOrganizations />)
    const props = menuProps[menuProps.length - 1]
    expect(props).toBeDefined()
    expect(props.showActivity).toBe(true)
    expect(props.showView).toBe(true)
    expect(props.showEdit).toBe(false)
    expect(props.showResend).toBe(false)
    ;(props.onActivity as () => void)()
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/organizations/org%201/activity")
  })
})
