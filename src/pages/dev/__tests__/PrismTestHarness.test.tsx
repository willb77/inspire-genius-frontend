/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import PrismTestHarness from "../PrismTestHarness";

// Mock PRISM components
jest.mock("@/components/prism/PrismStatusBadge", () => ({
  __esModule: true,
  default: ({ status }: any) => <span data-testid="prism-status-badge">{status}</span>,
}));
jest.mock("@/components/prism/PrismQuadrantChart", () => ({
  __esModule: true,
  default: () => <div data-testid="prism-quadrant-chart">QuadrantChart</div>,
}));
jest.mock("@/components/prism/PrismBehaviourChart", () => ({
  __esModule: true,
  default: () => <div data-testid="prism-behaviour-chart">BehaviourChart</div>,
}));
jest.mock("@/components/prism/PrismWorkEnvironment", () => ({
  __esModule: true,
  default: () => <div>WorkEnvironment</div>,
}));
jest.mock("@/components/prism/PrismWorkAptitude", () => ({
  __esModule: true,
  default: () => <div>WorkAptitude</div>,
}));
jest.mock("@/components/prism/PrismBigFiveChart", () => ({
  __esModule: true,
  default: () => <div>BigFiveChart</div>,
}));
jest.mock("@/components/prism/PrismEQChart", () => ({
  __esModule: true,
  default: () => <div>EQChart</div>,
}));
jest.mock("@/components/prism/PrismMentalToughness", () => ({
  __esModule: true,
  default: () => <div>MentalToughness</div>,
}));
jest.mock("@/components/prism/PrismAssessmentCard", () => ({
  __esModule: true,
  default: () => <div data-testid="prism-assessment-card">AssessmentCard</div>,
}));
jest.mock("@/components/prism/PrismInitiateForm", () => ({
  __esModule: true,
  default: () => <div data-testid="prism-initiate-form">InitiateForm</div>,
}));

describe("PrismTestHarness", () => {
  it("renders without crashing", () => {
    render(<PrismTestHarness />);
    expect(
      screen.getByText("PRISM Integration — Test Harness")
    ).toBeInTheDocument();
  });

  it("renders DEV ONLY badge", () => {
    render(<PrismTestHarness />);
    expect(screen.getByText("DEV ONLY")).toBeInTheDocument();
  });

  it("renders all tab triggers", () => {
    render(<PrismTestHarness />);
    expect(screen.getByText("Request Form")).toBeInTheDocument();
    expect(screen.getByText(/Charts/)).toBeInTheDocument();
    expect(screen.getByText("Assessment Cards")).toBeInTheDocument();
    expect(screen.getByText("Status Badges")).toBeInTheDocument();
    expect(screen.getByText("Full Report View")).toBeInTheDocument();
  });

  it("renders Request Form tab content by default", () => {
    render(<PrismTestHarness />);
    expect(screen.getByTestId("prism-initiate-form")).toBeInTheDocument();
    expect(screen.getByText("How This Works")).toBeInTheDocument();
    expect(screen.getByText("Questionnaire Tiers")).toBeInTheDocument();
  });

  it("renders questionnaire tier information", () => {
    render(<PrismTestHarness />);
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
  });
});
