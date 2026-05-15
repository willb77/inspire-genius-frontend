/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import CompanyAdminUsers from "../Users";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));

jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("sonner", () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyUsers: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("CompanyAdminUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByText("admin:users.title")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Provision and manage users within your organization."
      )
    ).toBeInTheDocument();
  });

  it("renders Add User button", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByText("common:addUser")).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    // "Active" and "Inactive" may appear multiple times (stat cards + status badges)
    expect(screen.getAllByText(/Managers/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Inactive/).length).toBeGreaterThan(0);
  });

  it("renders fallback users in table", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("alex.t@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<CompanyAdminUsers />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Department")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });

  it("filters users by search input", () => {
    render(<CompanyAdminUsers />);
    const searchInput = screen.getByPlaceholderText(
      "admin:users.searchPlaceholder"
    );
    fireEvent.change(searchInput, { target: { value: "alex" } });
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.queryByText("Maria Garcia")).not.toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    const { useCompanyUsers } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyUsers as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<CompanyAdminUsers />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useCompanyUsers } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyUsers as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<CompanyAdminUsers />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
