/**
 * OrganizationView — one organization from org-service, its members from
 * auth-service. Covers the honest states: loading, a failed org read (never a
 * blank page), a 404, members loading / failed / empty / listed, paging, and
 * that the member read asks for super-admins too (membership is the org
 * column, not the role).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrganizationView from "../OrganizationView";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ id: "org-1" }),
}));

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown> & { email: string }>;
    columns: Array<{ key: string; render?: (row: unknown, i: number) => React.ReactNode }>;
  }) => (
    <div data-testid="members-table">
      {data.map((r, i) => (
        <div key={r.email}>
          {columns.map((c) => (
            <span key={c.key}>{c.render ? c.render(r, i) : String(r[c.key] ?? "")}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: ({ onPageChange }: { onPageChange: (p: number) => void }) => (
    <button onClick={() => onPageChange(2)}>next page</button>
  ),
}));

const mockUseOrg = jest.fn();
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrg: (...args: unknown[]) => mockUseOrg(...args),
}));

const mockUseUserManagement = jest.fn();
const mockSetManager = jest.fn();
const mockChangeRole = jest.fn();
const mockChangeOrg = jest.fn();
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: (...args: unknown[]) => mockUseUserManagement(...args),
  useSetUserManager: () => ({ mutate: mockSetManager, isPending: false }),
  useChangeUserRole: () => ({ mutate: mockChangeRole, isPending: false }),
}));
jest.mock("@/hooks/super-admin/user-management/useOrgAssignment", () => ({
  useOrgDirectory: () => ({ data: [{ id: "org-1", name: "3pp" }, { id: "org-2", name: "Other" }] }),
  useChangeUserOrg: () => ({ mutate: mockChangeOrg, isPending: false }),
}));

// The editors are tested on their own; here each renders one button per
// choice the page cares about, so the page's confirm wiring is what is tested.
jest.mock("@/components/super-admin/organization/OrgMemberEditors", () => ({
  ManagerSelect: ({
    memberId,
    candidates,
    onPick,
  }: {
    memberId: string;
    candidates: Array<{ id: string; name: string }>;
    onPick: (id: string | null, name: string) => void;
  }) => (
    <span data-testid={`candidates-${memberId}`} data-count={candidates.length}>
      <button onClick={() => onPick("u2", "User 2")}>{`manager ${memberId} -> u2`}</button>
      <button onClick={() => onPick(null, "None")}>{`manager ${memberId} -> none`}</button>
    </span>
  ),
  RoleSelect: ({ memberName, onPick }: { memberName: string; onPick: (r: string) => void }) => (
    <button onClick={() => onPick("manager")}>{`role ${memberName} -> manager`}</button>
  ),
  OrgMoveSelect: ({
    memberName,
    onPick,
  }: {
    memberName: string;
    onPick: (id: string | null, name: string) => void;
  }) => (
    <>
      <button onClick={() => onPick("org-2", "Other")}>{`org ${memberName} -> Other`}</button>
      <button onClick={() => onPick(null, "No organization")}>{`org ${memberName} -> none`}</button>
    </>
  ),
}));

jest.mock("@/components/shared/forms/ConfirmActionModal", () => ({
  __esModule: true,
  default: ({
    open,
    title,
    fields,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    fields: Array<{ label: string; value: string }>;
    confirmLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm">
        <div>{title}</div>
        {fields.map((f) => (
          <div key={f.label}>{`${f.label}: ${f.value}`}</div>
        ))}
        <button onClick={onConfirm}>{confirmLabel}</button>
      </div>
    ) : null,
}));

const ORG = {
  id: "org-1",
  name: "3pp",
  contact: "3pp",
  type: "CORPORATE",
  active: true,
  email: null,
  website_url: null,
  created_at: "2026-01-01T00:00:00",
};

function user(i: number, extra: Record<string, unknown> = {}) {
  return {
    user_id: `u${i}`,
    email: `u${i}@example.test`,
    full_name: `User ${i}`,
    role: "user",
    is_active: true,
    ...extra,
  };
}

function membersOk(users = [user(1), user(2, { role: "super-admin" })], total = users.length) {
  return {
    data: { data: { users, pagination: { total, page: 1, limit: 50, has_more: false } } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <OrganizationView />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOrg.mockReturnValue({ data: ORG, isLoading: false, isError: false, refetch: jest.fn() });
  mockUseUserManagement.mockReturnValue(membersOk());
});

describe("OrganizationView", () => {
  it("reads the organization by id and its members by org, including super-admins", () => {
    renderPage();
    expect(mockUseOrg).toHaveBeenCalledWith("org-1");
    expect(mockUseUserManagement).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", page: 1, include_super_admins: true }),
      { enabled: true }
    );
  });

  it("shows the organization name and its members", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "3pp" })).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();
    expect(screen.getByText("Members (2)")).toBeInTheDocument();
  });

  it("says coach, business and licence controls are not available", () => {
    renderPage();
    expect(
      screen.getByText("Coach assignment, businesses and licences are not available yet.")
    ).toBeInTheDocument();
  });

  it("shows loading while the organization loads", () => {
    mockUseOrg.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() });
    renderPage();
    expect(screen.getByText("Loading organization details...")).toBeInTheDocument();
  });

  it("shows an error with a retry when the organization read fails", () => {
    const refetch = jest.fn();
    mockUseOrg.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 500 } },
      refetch,
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this organization (HTTP 500).");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("says a missing organization is missing", () => {
    mockUseOrg.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 404 } },
      refetch: jest.fn(),
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't exist or has been deactivated");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows a members error, never an empty list, when the member read fails", () => {
    mockUseUserManagement.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load members.");
    expect(screen.queryByText("This organization has no members yet.")).not.toBeInTheDocument();
  });

  it("shows an empty state only when the read succeeded with no members", () => {
    mockUseUserManagement.mockReturnValue(membersOk([], 0));
    renderPage();
    expect(screen.getByText("This organization has no members yet.")).toBeInTheDocument();
  });

  it("shows members loading", () => {
    mockUseUserManagement.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() });
    renderPage();
    expect(screen.getByText("Loading members...")).toBeInTheDocument();
  });

  it("asks for confirmation, then sets a manager", () => {
    renderPage();
    fireEvent.click(screen.getByText("manager u1 -> u2"));
    expect(mockSetManager).not.toHaveBeenCalled();
    const confirm = screen.getByTestId("confirm");
    expect(confirm).toHaveTextContent("Change manager?");
    expect(confirm).toHaveTextContent("From: None");
    expect(confirm).toHaveTextContent("To: User 2");
    fireEvent.click(screen.getByRole("button", { name: "Change manager" }));
    expect(mockSetManager).toHaveBeenCalledWith(
      { user_id: "u1", manager_user_id: "u2" },
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });

  it("clears a manager with null", () => {
    renderPage();
    fireEvent.click(screen.getByText("manager u1 -> none"));
    expect(screen.getByTestId("confirm")).toHaveTextContent("Clear manager?");
    fireEvent.click(screen.getByRole("button", { name: "Clear manager" }));
    expect(mockSetManager).toHaveBeenCalledWith(
      { user_id: "u1", manager_user_id: null },
      expect.anything()
    );
  });

  it("changes a role through the existing role route after confirming", () => {
    renderPage();
    fireEvent.click(screen.getByText("role User 1 -> manager"));
    fireEvent.click(screen.getByRole("button", { name: "Change role" }));
    expect(mockChangeRole).toHaveBeenCalledWith(
      { user_id: "u1", email: "u1@example.test", payload: { role: "manager" } },
      expect.anything()
    );
  });

  it("moves and removes through org-service after confirming", () => {
    renderPage();
    fireEvent.click(screen.getByText("org User 1 -> Other"));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(mockChangeOrg).toHaveBeenCalledWith(
      { userId: "u1", fromOrgId: "org-1", toOrgId: "org-2" },
      expect.anything()
    );
    // The modal closes on settle; simulate that before the second change.
    const settle = mockChangeOrg.mock.calls[0][1].onSettled as () => void;
    act(() => settle());
    fireEvent.click(screen.getByText("org User 2 -> none"));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(mockChangeOrg).toHaveBeenLastCalledWith(
      { userId: "u2", fromOrgId: "org-1", toOrgId: null },
      expect.anything()
    );
  });

  it("offers manager candidates from a full read of the organization", () => {
    renderPage();
    expect(mockUseUserManagement).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", page: 1, limit: 100, include_super_admins: true }),
      { enabled: true }
    );
    expect(screen.getByTestId("candidates-u1")).toHaveAttribute("data-count", "2");
  });

  it("pages members when there are more than one page", () => {
    mockUseUserManagement.mockReturnValue(membersOk([user(1)], 120));
    renderPage();
    fireEvent.click(screen.getByText("next page"));
    expect(mockUseUserManagement).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 50 }),
      { enabled: true }
    );
  });
});
