/**
 * OrganizationView — one organization from org-service, its members from
 * auth-service. Covers the honest states: loading, a failed org read (never a
 * blank page), a 404, members loading / failed / empty / listed, paging, and
 * that the member read asks for super-admins too (membership is the org
 * column, not the role).
 */
import { fireEvent, render, screen } from "@testing-library/react";
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
  DataTable: ({ data }: { data: Array<{ name: string; email: string }> }) => (
    <div data-testid="members-table">
      {data.map((r) => (
        <div key={r.email}>{r.name}</div>
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
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: (...args: unknown[]) => mockUseUserManagement(...args),
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

  it("pages members when there are more than one page", () => {
    mockUseUserManagement.mockReturnValue(membersOk([user(1)], 120));
    renderPage();
    fireEvent.click(screen.getByText("next page"));
    expect(mockUseUserManagement).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      { enabled: true }
    );
  });
});
