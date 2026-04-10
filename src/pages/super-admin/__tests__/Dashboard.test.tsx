import { render, screen } from "@testing-library/react";
import SuperAdminDashboard from "../Dashboard";

// ---------- MOCK LAYOUT ----------
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

// ---------- MOCK RADIX SELECT (portal-based) ----------
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

// ---------- TESTS ----------
describe("SuperAdminDashboard", () => {
  it("renders within SuperAdminLayout", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByText("Platform Dashboard")).toBeInTheDocument();
  });

  it("renders the welcome banner with platform stats", () => {
    render(<SuperAdminDashboard />);
    expect(
      screen.getByText("Inspire Genius Platform Overview")
    ).toBeInTheDocument();
    expect(screen.getByText(/12,847 Active Users/)).toBeInTheDocument();
    expect(screen.getByText(/48 Organizations/)).toBeInTheDocument();
    expect(screen.getByText(/78% Trained/)).toBeInTheDocument();
  });

  it("renders all 5 KPI stat cards", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Active Organizations")).toBeInTheDocument();
    expect(screen.getByText("Training Completion")).toBeInTheDocument();
    expect(screen.getByText("PRISM Assessed")).toBeInTheDocument();
    expect(screen.getByText("Platform Cost (MTD)")).toBeInTheDocument();
  });

  it("renders the three tab triggers", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Cost Analysis")).toBeInTheDocument();
  });

  it("renders Departments section on Overview tab", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getByText("2,340 employees")).toBeInTheDocument();
    expect(screen.getByText("1,890 employees")).toBeInTheDocument();
  });

  it("renders Organization Health metrics", () => {
    render(<SuperAdminDashboard />);
    expect(screen.getByText("Organization Health")).toBeInTheDocument();
    expect(screen.getByText("Employee Engagement")).toBeInTheDocument();
    expect(screen.getByText("Retention Rate")).toBeInTheDocument();
    expect(screen.getByText("PRISM Alignment")).toBeInTheDocument();
  });
});
