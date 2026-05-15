/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import PractitionerClients from "../Clients";

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}));
jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockUsePractitionerClients = jest.fn();
jest.mock("@/hooks/practitioner/usePractitioner", () => ({
  usePractitionerClients: () => mockUsePractitionerClients(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("PractitionerClients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePractitionerClients.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<PractitionerClients />);
    expect(screen.getByText("Client Management")).toBeInTheDocument();
    expect(screen.getByText(/Manage your client roster/)).toBeInTheDocument();
  });

  it("renders Add Client button", () => {
    render(<PractitionerClients />);
    expect(screen.getByText("+ Add Client")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(<PractitionerClients />);
    expect(screen.getByText("Total Clients")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("Avg PRISM Score")).toBeInTheDocument();
  });

  it("renders fallback clients when data is undefined", () => {
    render(<PractitionerClients />);
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument();
    expect(screen.getByText("TechCorp Inc")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUsePractitionerClients.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PractitionerClients />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state with retry", () => {
    mockUsePractitionerClients.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<PractitionerClients />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("filters clients by search", () => {
    render(<PractitionerClients />);
    const search = screen.getByPlaceholderText("Search by name or organization...");
    fireEvent.change(search, { target: { value: "Sophie" } });
    expect(screen.getByText("Sophie Laurent")).toBeInTheDocument();
    expect(screen.queryByText("Marcus Chen")).not.toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<PractitionerClients />);
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("PRISM")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });
});
