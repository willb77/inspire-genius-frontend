/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import PrismTeam from "../PrismTeam";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/prism/PrismStatusBadge", () => ({
  __esModule: true,
  default: ({ status }: any) => <span data-testid="prism-status">{status}</span>,
}));

jest.mock("@/components/prism/PrismReportViewer", () => ({
  __esModule: true,
  default: ({ assessmentId }: any) => (
    <div data-testid="prism-report-viewer">{assessmentId}</div>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <span>{children}</span>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/constants/prism", () => ({
  QUEST_TYPE_NAMES: {},
}));

describe("PrismTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<PrismTeam />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<PrismTeam />);
    expect(screen.getByText("Team PRISM Assessments")).toBeInTheDocument();
    expect(
      screen.getByText("Track your team members' PRISM assessment progress")
    ).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<PrismTeam />);
    expect(screen.getByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Completion Rate")).toBeInTheDocument();
  });

  it("shows empty state when no assessments", () => {
    render(<PrismTeam />);
    expect(screen.getByText("No team assessments yet.")).toBeInTheDocument();
  });

  it("renders stats with zero values when no data", () => {
    render(<PrismTeam />);
    // Multiple "0" values appear (Team Members and Completed)
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
