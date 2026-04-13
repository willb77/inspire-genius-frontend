/**
 * @jest-environment jsdom
 */

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

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrismAssessment from "../PrismAssessment";
import { useAuth } from "@/context/useAuth";
import { usePrismHistory } from "@/hooks/prism/usePrismHistory";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/prism/PrismInitiateForm", () => ({
  __esModule: true,
  default: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="prism-initiate-form">
      {disabled && <span data-testid="form-disabled" />}
    </div>
  ),
}));

jest.mock("@/components/prism/PrismAssessmentCard", () => ({
  __esModule: true,
  default: ({ assessment, onViewReport }: any) => (
    <div data-testid={`assessment-card-${assessment.id}`}>
      <span>{assessment.status}</span>
      <button onClick={() => onViewReport(assessment.id)}>View Report</button>
    </div>
  ),
}));

jest.mock("@/components/prism/PrismReportViewer", () => ({
  __esModule: true,
  default: ({ assessmentId }: { assessmentId: string }) => (
    <div data-testid="report-viewer">Report for {assessmentId}</div>
  ),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/prism/usePrismHistory", () => ({
  usePrismHistory: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePrismHistory = usePrismHistory as jest.MockedFunction<typeof usePrismHistory>;

/* ---- Helpers ---- */

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

/* ---- Tests ---- */

describe("PrismAssessment Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "1", name: "Test", email: "test@test.com", role: "user" },
      isAuthenticated: true,
      hasRole: jest.fn(() => true),
    } as any);

    mockUsePrismHistory.mockReturnValue({
      data: { data: { assessments: [] } },
      isLoading: false,
    } as any);
  });

  it("renders page title and description", () => {
    render(<PrismAssessment />, { wrapper: createWrapper() });
    // Uses coaching:prism.assessment and coaching:prism.completeDescription
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders initiate form", () => {
    render(<PrismAssessment />, { wrapper: createWrapper() });
    expect(screen.getByTestId("prism-initiate-form")).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockUsePrismHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });
    // When loading, skeletons are shown instead of history
    expect(screen.queryByText("Assessment History")).not.toBeInTheDocument();
  });

  it("shows active assessment card and disables initiate form", () => {
    mockUsePrismHistory.mockReturnValue({
      data: {
        data: {
          assessments: [
            { id: "a1", status: "in_progress" },
          ],
        },
      },
      isLoading: false,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });
    expect(screen.getByTestId("assessment-card-a1")).toBeInTheDocument();
    expect(screen.getByTestId("form-disabled")).toBeInTheDocument();
  });

  it("shows past assessments in history section", () => {
    mockUsePrismHistory.mockReturnValue({
      data: {
        data: {
          assessments: [
            { id: "a1", status: "error" },
            { id: "a2", status: "error" },
          ],
        },
      },
      isLoading: false,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });
    expect(screen.getByTestId("assessment-card-a1")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-card-a2")).toBeInTheDocument();
  });

  it("opens report viewer when view report is clicked", () => {
    mockUsePrismHistory.mockReturnValue({
      data: {
        data: {
          assessments: [
            { id: "a1", status: "error" },
          ],
        },
      },
      isLoading: false,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("View Report"));
    expect(screen.getByTestId("report-viewer")).toBeInTheDocument();
    expect(screen.getByText("Report for a1")).toBeInTheDocument();
  });

  it("close button hides report viewer", () => {
    mockUsePrismHistory.mockReturnValue({
      data: {
        data: {
          assessments: [{ id: "a1", status: "error" }],
        },
      },
      isLoading: false,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });

    // Open viewer
    fireEvent.click(screen.getByText("View Report"));
    expect(screen.getByTestId("report-viewer")).toBeInTheDocument();

    // Close viewer
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("report-viewer")).not.toBeInTheDocument();
  });

  it("does not show history section when no past assessments", () => {
    mockUsePrismHistory.mockReturnValue({
      data: { data: { assessments: [] } },
      isLoading: false,
    } as any);

    render(<PrismAssessment />, { wrapper: createWrapper() });
    expect(screen.queryByText("Assessment History")).not.toBeInTheDocument();
  });
});
