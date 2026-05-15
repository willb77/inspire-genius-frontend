/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminSettings from "../Settings";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, className, children }: any) => (
    <div data-testid={`data-card-${title}`} className={className}>
      {children}
    </div>
  ),
}));

describe("CompanyAdminSettings", () => {
  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminSettings />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminSettings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Company admin settings and preferences.")
    ).toBeInTheDocument();
  });

  it("renders placeholder notice", () => {
    render(<CompanyAdminSettings />);
    expect(
      screen.getByText(
        "Settings management is under development. Configuration options will be available soon."
      )
    ).toBeInTheDocument();
  });

  it("renders Organization Profile section", () => {
    render(<CompanyAdminSettings />);
    expect(screen.getByText("Company Name")).toBeInTheDocument();
    expect(screen.getByText("Security Policies")).toBeInTheDocument();
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
  });

  it("renders License & Billing section", () => {
    render(<CompanyAdminSettings />);
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(screen.getByText("Billing Cycle")).toBeInTheDocument();
    expect(screen.getByText("Next Renewal")).toBeInTheDocument();
  });
});
