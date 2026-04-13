import { render, screen } from "@testing-library/react";
import PrismReportViewer from "../PrismReportViewer";

/* ── Mocks ── */
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

const mockUsePrismReport = jest.fn();
jest.mock("@/hooks/prism/usePrismReport", () => ({
  usePrismReport: (...args: unknown[]) => mockUsePrismReport(...args),
}));

// Mock child chart components to simplify
jest.mock("../PrismQuadrantChart", () => ({
  __esModule: true,
  default: () => <div data-testid="quadrant-chart" />,
}));
jest.mock("../PrismBehaviourChart", () => ({
  __esModule: true,
  default: () => <div data-testid="behaviour-chart" />,
}));
jest.mock("../PrismWorkAptitude", () => ({
  __esModule: true,
  default: () => <div data-testid="work-aptitude" />,
}));
jest.mock("../PrismWorkEnvironment", () => ({
  __esModule: true,
  default: () => <div data-testid="work-environment" />,
}));
jest.mock("../PrismBigFiveChart", () => ({
  __esModule: true,
  default: () => <div data-testid="big-five" />,
}));
jest.mock("../PrismEQChart", () => ({
  __esModule: true,
  default: () => <div data-testid="eq-chart" />,
}));
jest.mock("../PrismMentalToughness", () => ({
  __esModule: true,
  default: () => <div data-testid="mental-toughness" />,
}));

describe("PrismReportViewer", () => {
  it("shows loading skeleton when isLoading is true", () => {
    mockUsePrismReport.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<PrismReportViewer assessmentId="a-1" />);
    // Skeleton elements should be present
    expect(container.querySelectorAll("[class*='animate-pulse'], [data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("shows empty message when report is null", () => {
    mockUsePrismReport.mockReturnValue({ data: null, isLoading: false });
    render(<PrismReportViewer assessmentId="a-1" />);
    expect(screen.getByText(/report data is not available yet/i)).toBeInTheDocument();
  });

  it("renders tabs when report data exists", () => {
    mockUsePrismReport.mockReturnValue({
      data: {
        data: {
          assessmentId: "a-1",
          userId: "u-1",
          status: "report_ready",
          reportPdfUrl: null,
          reportData: null,
          reportEIData: null,
          quadrants: [],
          behaviours: [],
          mapImageUrl: null,
          fetchedAt: "2026-01-01T00:00:00Z",
        },
      },
      isLoading: false,
    });
    render(<PrismReportViewer assessmentId="a-1" />);
    expect(screen.getByText("PRISM Report")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /behaviours/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /work/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /personality/i })).toBeInTheDocument();
  });

  it("shows PDF tab when reportPdfUrl is present", () => {
    mockUsePrismReport.mockReturnValue({
      data: {
        data: {
          assessmentId: "a-1",
          userId: "u-1",
          status: "report_ready",
          reportPdfUrl: "https://example.com/report.pdf",
          reportData: null,
          reportEIData: null,
          quadrants: [],
          behaviours: [],
          mapImageUrl: null,
          fetchedAt: "2026-01-01T00:00:00Z",
        },
      },
      isLoading: false,
    });
    render(<PrismReportViewer assessmentId="a-1" />);
    expect(screen.getByRole("tab", { name: /report pdf/i })).toBeInTheDocument();
  });
});
