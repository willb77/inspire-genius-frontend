/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import JobBlueprintTestHarness from "../JobBlueprintTestHarness";

// Mock heavy child components to keep the test focused on the harness shell
jest.mock("@/components/job-blueprint/job-dna/JobDnaWizard", () => ({
  JobDnaWizard: () => <div data-testid="job-dna-wizard">JobDnaWizard</div>,
}));
jest.mock("@/components/job-blueprint/job-dna/JobDnaCard", () => ({
  JobDnaCard: () => <div data-testid="job-dna-card">JobDnaCard</div>,
}));
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div>BenchmarkRadarChart</div>,
}));
jest.mock("@/components/job-blueprint/job-dna/BenchmarkBarChart", () => ({
  BenchmarkBarChart: () => <div>BenchmarkBarChart</div>,
}));
jest.mock("@/components/job-blueprint/shared/ScoreBar", () => ({
  ScoreBar: ({ label }: any) => <div>{label}</div>,
}));
jest.mock("@/components/job-blueprint/shared/DimensionBadge", () => ({
  DimensionBadge: ({ name }: any) => <span>{name}</span>,
}));
jest.mock("@/components/job-blueprint/shared/ClassificationBadge", () => ({
  ClassificationBadge: ({ tier }: any) => <span>{tier}</span>,
}));
jest.mock("@/components/job-blueprint/shared/PipelineStepBadge", () => ({
  PipelineStepBadge: ({ step }: any) => <span>{step}</span>,
}));
jest.mock("@/components/job-blueprint/assessment/BMLSurvey", () => ({
  BMLSurvey: () => <div>BMLSurvey</div>,
}));
jest.mock("@/components/job-blueprint/assessment/BMLResultsView", () => ({
  BMLResultsView: () => <div>BMLResultsView</div>,
}));
jest.mock("@/components/job-blueprint/triage/PipelineDashboard", () => ({
  PipelineDashboard: () => <div>PipelineDashboard</div>,
}));
jest.mock("@/components/job-blueprint/triage/CandidateCard", () => ({
  CandidateCard: ({ candidate }: any) => <div>{candidate.name}</div>,
}));
jest.mock("@/components/job-blueprint/triage/FitAnalysisView", () => ({
  FitAnalysisView: () => <div>FitAnalysisView</div>,
}));
jest.mock("@/components/job-blueprint/triage/CandidateComparison", () => ({
  CandidateComparison: () => <div>CandidateComparison</div>,
}));
jest.mock("@/components/job-blueprint/triage/InsightPackageView", () => ({
  InsightPackageView: () => <div>InsightPackageView</div>,
}));
jest.mock("@/components/job-blueprint/scorecard/ScorecardForm", () => ({
  ScorecardForm: () => <div>ScorecardForm</div>,
}));
jest.mock("@/components/job-blueprint/scorecard/ScorecardSummary", () => ({
  ScorecardSummary: () => <div>ScorecardSummary</div>,
}));
jest.mock("@/components/job-blueprint/scorecard/InterviewGuideView", () => ({
  InterviewGuideView: () => <div>InterviewGuideView</div>,
}));
jest.mock("@/components/job-blueprint/analytics/StatsGrid", () => ({
  StatsGrid: () => <div>StatsGrid</div>,
}));
jest.mock("@/components/job-blueprint/analytics/HiringFunnel", () => ({
  HiringFunnel: () => <div>HiringFunnel</div>,
}));
jest.mock("@/components/job-blueprint/analytics/AccuracyChart", () => ({
  AccuracyChart: () => <div>AccuracyChart</div>,
}));
jest.mock("@/components/job-blueprint/analytics/TimeToFillChart", () => ({
  TimeToFillChart: () => <div>TimeToFillChart</div>,
}));
jest.mock("@/constants/job-blueprint/bml-questions", () => ({
  BML_QUESTIONS: [],
}));

describe("JobBlueprintTestHarness", () => {
  it("renders without crashing", () => {
    render(<JobBlueprintTestHarness />);
    expect(screen.getByText("Job Blueprint")).toBeInTheDocument();
  });

  it("renders Test Harness badge", () => {
    render(<JobBlueprintTestHarness />);
    expect(screen.getByText("Test Harness")).toBeInTheDocument();
  });

  it("renders all tab triggers", () => {
    render(<JobBlueprintTestHarness />);
    expect(screen.getByText("Job DNA Wizard")).toBeInTheDocument();
    expect(screen.getByText("Shared Components")).toBeInTheDocument();
    expect(screen.getByText("Charts")).toBeInTheDocument();
    expect(screen.getByText("BML Survey")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Fit Analysis")).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Scorecard")).toBeInTheDocument();
    expect(screen.getByText("Interview Guide")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("renders the wizard tab content by default", () => {
    render(<JobBlueprintTestHarness />);
    expect(screen.getByText("Job DNA Creation Wizard")).toBeInTheDocument();
    expect(screen.getByTestId("job-dna-wizard")).toBeInTheDocument();
  });
});
