import { fireEvent, render, screen } from "@testing-library/react";
import SuperAdminDashboard from "../Dashboard";
import React from "react";

// ---------- MOCK LAYOUT ----------
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

// ---------- MOCK DASHBOARD COMPONENTS ----------
jest.mock("@/components/super-admin/dashboard/LicenseExpiring", () => () => (
  <div data-testid="license-expiring">LicenseExpiring</div>
));

jest.mock("@/components/super-admin/dashboard/AvgTimeSpentChart", () => () => (
  <div data-testid="avg-time-spent-chart">AvgTimeSpentChart</div>
));

jest.mock("@/components/super-admin/dashboard/HelpAndSupport", () => () => (
  <div data-testid="help-and-support">HelpAndSupport</div>
));

jest.mock("@/components/super-admin/dashboard/DocumentUploadTrend", () => ({
  DocumentUploadTrend: () => (
    <div data-testid="document-upload-trend">DocumentUploadTrend</div>
  ),
}));

jest.mock("@/components/super-admin/dashboard/DashboardSystem", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => (
    <div data-testid="dashboard-system">{title}</div>
  ),
}));

jest.mock("@/components/super-admin/dashboard/UsedCoachesChartNew", () => ({
  UsedCoachesChartNew: () => (
    <div data-testid="used-coaches-chart">UsedCoachesChartNew</div>
  ),
}));

jest.mock("@/components/super-admin/dashboard/LatestUsers", () => () => (
  <div data-testid="latest-users">LatestUsers</div>
));

// ---------- MOCK UI COMPONENTS THAT USE PORTALS ----------
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, disabled }: any) => (
    <div>
      <button
        data-testid="select-date"
        onClick={() => onSelect?.(new Date("2024-01-01"))}
      >
        Select Date
      </button>

      <span data-testid="disabled-check">
        {disabled?.(new Date("2099-01-01")) ? "disabled" : "enabled"}
      </span>
    </div>
  ),
}));

// ---------- TESTS ----------
describe("SuperAdminDashboard", () => {
  it("should render dashboard page", () => {
    render(<SuperAdminDashboard />);

    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should render dashboard system cards", () => {
    render(<SuperAdminDashboard />);

    expect(screen.getByText("Total Organisations")).toBeInTheDocument();
    expect(screen.getByText("Businesses Orgs")).toBeInTheDocument();
    expect(screen.getByText("Educational Orgs")).toBeInTheDocument();
  });

  it("should render all major dashboard sections", () => {
    render(<SuperAdminDashboard />);

    expect(screen.getByTestId("avg-time-spent-chart")).toBeInTheDocument();
    expect(screen.getByTestId("used-coaches-chart")).toBeInTheDocument();
    expect(screen.getByTestId("license-expiring")).toBeInTheDocument();
    expect(screen.getByTestId("help-and-support")).toBeInTheDocument();
    expect(screen.getByTestId("document-upload-trend")).toBeInTheDocument();
    expect(screen.getByTestId("latest-users")).toBeInTheDocument();
  });

  it("should update fromDate when calendar date is selected", () => {
    render(<SuperAdminDashboard />);

    const buttons = screen.getAllByTestId("select-date");

    // First calendar = fromDate
    fireEvent.click(buttons[0]);

    expect(screen.getAllByText("01-01-2024").length).toBeGreaterThan(0);
  });

  it("should disable dates greater than toDate in fromDate calendar", () => {
    render(<SuperAdminDashboard />);

    const disabledCheck = screen.getAllByTestId("disabled-check");

    // FromDate calendar disabled logic
    expect(disabledCheck[0].textContent).toBe("disabled");
  });
  it("should update toDate when calendar date is selected", () => {
    render(<SuperAdminDashboard />);

    const buttons = screen.getAllByTestId("select-date");

    // Second calendar = toDate
    fireEvent.click(buttons[1]);

    expect(screen.getAllByText("01-01-2024").length).toBeGreaterThan(0);
  });
  it("should show fallback text when date is null", () => {
    jest
      .spyOn(React, "useState")
      .mockImplementationOnce(() => [null, jest.fn()]);

    render(<SuperAdminDashboard />);

    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });
});
