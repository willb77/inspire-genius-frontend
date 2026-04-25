/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrismClients from "../PrismClients";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));
jest.mock("@/components/prism/PrismStatusBadge", () => ({
  __esModule: true,
  default: ({ status }: any) => <span data-testid="prism-status-badge">{status}</span>,
}));
jest.mock("@/components/prism/PrismReportViewer", () => ({
  __esModule: true,
  default: ({ assessmentId }: any) => <div data-testid="prism-report-viewer">{assessmentId}</div>,
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <span>{children}</span>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));
jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => <span>Filter</span>,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => <button onClick={onClick} {...rest}>{children}</button>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("lucide-react", () => ({
  Eye: () => <svg data-testid="eye-icon" />,
  Upload: () => <svg data-testid="upload-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
}));
jest.mock("@/constants/prism", () => ({
  QUEST_TYPE_NAMES: { prism_full: "PRISM Full", prism_mini: "PRISM Mini" } as Record<string, string>,
  STATUS_CONFIG: {
    pending: { label: "Pending" },
    in_progress: { label: "In Progress" },
    report_ready: { label: "Report Ready" },
    ingested: { label: "Ingested" },
  } as Record<string, { label: string }>,
}));

const mockUsePractitionerClients = jest.fn();
jest.mock("@/hooks/practitioner/usePractitioner", () => ({
  usePractitionerClients: () => mockUsePractitionerClients(),
}));

jest.mock("@/hooks/prism/usePrismImport", () => ({
  usePrismImport: () => ({ mutate: jest.fn(), isPending: false }),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null };

describe("PrismClients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePractitionerClients.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<PrismClients />, { wrapper });
    expect(screen.getByText("Client PRISM Assessments")).toBeInTheDocument();
    expect(screen.getByText(/View and manage your clients/)).toBeInTheDocument();
  });

  it("shows empty state when no assessments", () => {
    render(<PrismClients />, { wrapper });
    expect(screen.getByText("No assessments found.")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUsePractitionerClients.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PrismClients />, { wrapper });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders assessments when data provided", () => {
    mockUsePractitionerClients.mockReturnValue({
      ...hookDefaults,
      data: {
        clients: [
          { id: "a1", externalIdent: "Client A", questionnaireType: "prism_full", status: "report_ready", initiatedAt: "2026-01-01", questionnaireCompletedAt: "2026-01-05" },
        ],
      },
    });
    render(<PrismClients />, { wrapper });
    expect(screen.getByText("Client A")).toBeInTheDocument();
    expect(screen.getByText("PRISM Full")).toBeInTheDocument();
  });

  it("shows View button for report_ready assessments", () => {
    mockUsePractitionerClients.mockReturnValue({
      ...hookDefaults,
      data: {
        clients: [
          { id: "a1", externalIdent: "Client A", questionnaireType: "prism_full", status: "report_ready", initiatedAt: "2026-01-01", questionnaireCompletedAt: "2026-01-05" },
        ],
      },
    });
    render(<PrismClients />, { wrapper });
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("renders inside PractitionerLayout", () => {
    render(<PrismClients />, { wrapper });
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument();
  });
});
