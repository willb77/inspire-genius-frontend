/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import type { DimensionBenchmark, JobDNA } from "@/types/job-blueprint";
import ManagerJobDna from "../JobDna";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ title, badge, children }: any) => (
    <div data-testid={`data-card-${title}`}>
      {badge != null && <span data-testid="badge">{badge}</span>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// The page reads live data through this hook.
jest.mock("@/hooks/job-blueprint/useJobDna", () => ({
  useJobDnaList: jest.fn(),
}));

import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna";

const bench = (id: number, name: string): DimensionBenchmark => ({
  dimensionId: id,
  dimensionName: name,
  category: "behavior",
  rankPosition: id,
  rankPercent: 100 - id * 5,
  rateValue: 8 - id,
  finalBenchmarkPercent: 100 - id * 5,
  interpretation: "natural",
});

const JOB: JobDNA = {
  id: "j1",
  orgId: "o1",
  roleTitle: "Senior Engineer",
  department: "Engineering",
  tier: "professional",
  status: "active",
  behaviors: [bench(1, "Innovating"), bench(2, "Initiating"), bench(3, "Focusing")],
  aptitudes: [],
  coreTraits: [],
  counterProductiveBehaviors: [],
  roleContext: { workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] },
  deliverables: { jobDescription: "", kpis: [], criticalActivities: [], keyInteractions: [] },
  createdBy: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
};

const mockRefetch = jest.fn();

function mockQuery(over: Record<string, unknown>) {
  (useJobDnaList as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...over,
  });
}

describe("ManagerJobDna", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery({ data: [JOB] });
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerJobDna />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerJobDna />);
    expect(screen.getByText("Job DNA")).toBeInTheDocument();
    expect(
      screen.getByText("PRISM-based job profiles and candidate matching criteria.")
    ).toBeInTheDocument();
  });

  it("renders live job profiles from the hook", () => {
    render(<ManagerJobDna />);
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("renders grid headers", () => {
    render(<ManagerJobDna />);
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Department")).toBeInTheDocument();
    expect(screen.getByText("Top Behaviours")).toBeInTheDocument();
    expect(screen.getByText("Tier")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("expands a job row on click to show the behaviour benchmark", () => {
    render(<ManagerJobDna />);
    const row = screen.getByText("Senior Engineer");
    fireEvent.click(row.closest("button")!);
    expect(screen.getByText("Behaviour Benchmark")).toBeInTheDocument();
  });

  it("shows an empty state when there are no profiles", () => {
    mockQuery({ data: [] });
    render(<ManagerJobDna />);
    expect(screen.getByText("No Job DNA profiles yet.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    mockQuery({ data: undefined, isLoading: true });
    render(<ManagerJobDna />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows an error message with retry on error", () => {
    mockQuery({ data: undefined, error: new Error("fail") });
    render(<ManagerJobDna />);
    expect(screen.getByText("Failed to load Job DNA profiles.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});
